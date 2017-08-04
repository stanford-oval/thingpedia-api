// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const events = require('events');
const Q = require('q');
const ip = require('ip');

const BaseChannel = require('./base_channel');

const Tier = {
    GLOBAL: 'global',
    PHONE: 'phone',
    SERVER: 'server',
    DESKTOP: 'desktop',
    CLOUD: 'cloud'
};

const Availability = {
    UNAVAILABLE: 0,
    AVAILABLE: 1,
    OWNER_UNAVAILABLE: 2,
    UNKNOWN: -1
};

module.exports = class BaseDevice extends events.EventEmitter {
    // no $rpc for queryInterface, extension interfaces are not exported
    get $rpcMethods() {
        return ['get name', 'get uniqueId', 'get description',
                'get ownerTier', 'get kind', 'get isTransient',
                'checkAvailable', 'hasKind'];
    }

    constructor() {
        super();
        this._init.apply(this, arguments);
    }

    _init(engine, state) {
        this._engine = engine;

        // Set this to a device specific ID plus something unique
        // (eg "mydevice-aa-bb-cc-dd-ee-ff") so that no other device
        // can possibly have the same ID
        // If you leave it undefined, DeviceDatabase will pick for you
        this.uniqueId = undefined;

        // Set these to protocol/discovery specific IDs (such as
        // "bluetooth-aa-bb-cc-dd-ee-ff") so that it is unlikely that
        // another device has the same ID
        this.descriptors = [];

        if (this.constructor.metadata['global-name'])
            this.globalName = this.constructor.metadata['global-name'];
        else
            this.globalName = undefined;

        this.state = state;

        // Set to true if this device should not be stored in the devicedb
        // but only kept in memory (ie, its lifetime is managed by some
        // device discovery module, or it's a subdevice of some other device)
        this.isTransient = false;

        this._ownerTier = undefined;
    }

    get kind() {
        return this.state.kind;
    }

    stateChanged() {
        this.emit('state-changed');
    }

    updateState(state) {
        // nothing to do here by default, except for updating the state
        // pointer
        // subclasses can override if they need to do anything about it
        this.state = state;
    }

    completeDiscovery(delegate) {
        // nothing to do here, subclasses can override if they support discovery
    }

    updateFromDiscovery(data) {
        // nothing to do here, subclasses can override if they support discovery
    }

    serialize() {
        if (!this.state)
            throw new Error('Device lost state, cannot serialize');
        return this.state;
    }

    start() {
    }

    stop() {
    }

    get engine() {
        return this._engine;
    }

    // Return the tier that "owns" this device, ie, what tier (phone, home
    // server or cloud) will run the triggers/queries/actions of this device
    //
    // Override this method to get smarter behavior
    get ownerTier() {
        if (this._ownerTier !== undefined)
            return this._ownerTier;

        // if the device wants to be cloud-only, then it belongs to the cloud
        if (this.hasKind('cloud-only'))
            return this._ownerTier = Tier.CLOUD;

        // if the device wants to be phone-only, then it belongs to the phone
        // this would be the case of stuff that does phone calls or texts or camera
        if (this.hasKind('phone-only'))
            return this._ownerTier = Tier.PHONE;

        // if the device wants to be server-only, then it belongs to the server
        if (this.hasKind('server-only'))
            return this._ownerTier = Tier.SERVER;

        // if the device wants to be desktop only, then it belongs to the desktop
        if (this.hasKind('desktop-only'))
            return this._ownerTier = Tier.DESKTOP;

        // if this device was discovered, it belongs to whoever discovered it
        if (this.state && 'discoveredBy' in this.state)
            return this.state.discoveredBy;

        // anything else we look at what tiers are available, and try to
        // make a smart decision

        var configured = this.engine.tiers.getAllConfiguredTiers();

        var hasServer = configured.indexOf(Tier.SERVER) >= 0;
        var hasPhone = configured.indexOf(Tier.PHONE) >= 0;
        var hasCloud = configured.indexOf(Tier.CLOUD) >= 0;

        // if this device prefers a cloud instance (say it has webhooks instead of polling),
        // and we have one, use it
        if (hasCloud && this.hasKind('prefers-cloud'))
            return this._ownerTier = Tier.CLOUD;

        // if the device is under a private IP, it's likely
        // in a home network, so assign it to server, if we have one, else phone (it should be discovered anyway,
        // this covers the manual configuration case)
        var isPrivateIp = false;
        if (this.state) {
            if ('host' in this.state && ip.isPrivate(this.state.host))
                isPrivateIp = true;
            if ('ip-address' in this.state && ip.isPrivate(this.state['ip-address']))
                isPrivateIp = true;
        }
        if (isPrivateIp) {
            if (hasServer)
                return this._ownerTier = Tier.SERVER;
            if (hasPhone)
                return this._ownerTier = Tier.PHONE;
        }

        // for everything else, just claim Tier.GLOBAL, which means we will
        // run on whatever device is also running the rule, which improves
        // the chance of successfully running the code (say if the cloud server
        // crashes or the phone is off), and should not impact the device
        // in any way
        return Tier.GLOBAL;
    }

    // Perform an async check to verify if the device is available
    // (ie, on, working, reachable on the local network, etc.)
    // Returns a promise of the device availability
    checkAvailable() {
        if (this.ownerTier !== this.engine.ownTier) {
            return this.engine.tiers.isConnected(this.ownerTier) ? Availability.AVAILABLE :
                Availability.OWNER_UNAVAILABLE;
        } else {
            return Availability.UNKNOWN;
        }
    }

    // Check if this device corresponds to the abstract kind (type) "kind",
    // ie, it's a bluetooth device, or a phone, or remote device,
    // or has an accelerometer, or whatever...
    // A device can have multiple kinds at the same time
    //
    // Do not override this function. Instead, add more types to
    // the Thingpedia metadata.
    hasKind(kind) {
        return kind === this.kind ||
            (this.globalName !== undefined && kind === this.globalName) ||
            (this.constructor.metadata.types.indexOf(kind) >= 0);
    }

    // Request an extension interface for this device
    // Extension interfaces allow to provide additional device and
    // vendor specific capabilities without the use of channels
    // If the interface is not recognized this method returns null
    // (up to the caller to check it or just use it blindly and explode)
    //
    // Note that all method calls on the interface might fail if
    // the device is not available (but are not required to)
    // Also note that this method might return null if the device
    // exists but not locally (eg, it's a bluetooth device but we're
    // running on the server platform)
    //
    // Well-known extension interfaces are "subdevices" (for device
    // collections) and "messaging" (for the messaging system)
    queryInterface() {
        // no extension interfaces for this device class
        return null;
    }

    getTrigger(id, params) {
        return this.engine.channels.getOpenedChannel(this, id, 'r', params);
    }

    getAction(id) {
        return this.engine.channels.getOpenedChannel(this, id, 'w');
    }

    getQuery(id) {
        return this.engine.channels.getOpenedChannel(this, id, 'q');
    }

    _getChannelClass(name) {
        return this.constructor.require('./' + name);
    }

    // Convenience methods for obtaining an action, invoking it, and closing
    // it afterwards
    // do not override
    invokeAction(id, args) {
        return this.getAction(id).then(function(action) {
            return Q(action.sendEvent(args)).finally(function() {
                return action.close();
            });
        });
    }

    invokeQuery(id, filters) {
        return this.getQuery(id).then(function(query) {
            return Q(query.invokeQuery(filters)).finally(function() {
                return query.close();
            });
        });
    }

    // Get a trigger class for a trigger with the given name
    // You can override this to return your own trigger classes
    //
    // By default, it will load a file with the name of the trigger
    // in the same directory as your device class.
    getTriggerClass(name) {
        return this._getChannelClass(name);
    }

    // Get a action class that is identified with the given ID
    // You can override this to return your own action classes
    //
    // By default, it will load a file with the name of the action
    // in the same directory as your device class.
    getActionClass(kind) {
        return this._getChannelClass(kind);
    }

    // Get a query class that is identified with the given ID
    // You can override this to return your own query classes
    //
    // By default, it will load a file with the name of the query
    // in the same directory as your device class.
    getQueryClass(kind) {
        return this._getChannelClass(kind);
    }
}

module.exports.Availability = Availability;
module.exports.Tier = Tier;
