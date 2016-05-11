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

const lang = require('./lang');
const BaseChannel = require('./base_channel');

const Tier = {
    GLOBAL: 'global',
    PHONE: 'phone',
    SERVER: 'server',
    CLOUD: 'cloud'
};

const Availability = {
    UNAVAILABLE: 0,
    AVAILABLE: 1,
    OWNER_UNAVAILABLE: 2,
    UNKNOWN: -1
};

module.exports = new lang.Class({
    Name: 'BaseDevice',
    Abstract: true,
    Extends: events.EventEmitter,
    // no $rpc for queryInterface, extension interfaces are not exported
    $rpcMethods: ['get name', 'get uniqueId', 'get description',
                  'get ownerTier', 'get state', 'get isTransient',
                  'checkAvailable', 'hasKind'],

    _init: function(engine, state) {
        events.EventEmitter.call(this);

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
    },

    get kind() {
        return this.state.kind;
    },

    get classId() {
        return this.state.kind;
    },

    stateChanged: function() {
        this.emit('state-changed');
    },

    updateState: function(state) {
        // nothing to do here by default, except for updating the state
        // pointer
        // subclasses can override if they need to do anything about it
        this.state = state;
    },

    updateFromDiscovery: function(data) {
        // nothing to do here, subclasses can override if they support discovery
    },

    serialize: function() {
        if (!this.state)
            throw new Error('Device lost state, cannot serialize');
        return this.state;
    },

    start: function() {
    },

    stop: function() {
    },

    get engine() {
        return this._engine;
    },

    // Return the tier that "owns" this device, ie, under what namespace
    // (@phone, @home or @cloud) this device appears
    // The device will appear unconditionally under @me
    //
    // Override this method to get smarter behavior
    get ownerTier() {
        if (this._ownerTier !== undefined)
            return this._ownerTier;

        // if the device wants to be cloud-only, then it belongs to the cloud
        // this is the case of @sabrina, which uses the assistant infrastructure
        // that does not yet work outside of cloud
        if (this.hasKind('cloud-only'))
            return this._ownerTier = Tier.CLOUD;

        // if the device wants to be phone-only, then it belongs to the phone
        // this would be the case of stuff that does phone calls or texts or camera
        if (this.hasKind('phone-only'))
            return this._ownerTier = Tier.PHONE;

        // if the device wants to be server-only, then it belongs to the server
        // this exists mostly for completeness
        if (this.hasKind('server-only'))
            return this._ownerTier = Tier.SERVER;

        // if this device was discovered, it belongs to whoever discovered it
        if (this.state && 'discoveredBy' in this.state)
            return this.state.discoveredBy;

        // anything else we look at what tiers are available, and try to
        // make a smart decision
        // FIXME: the available tiers change at runtime, which means that devices
        // would need to move
        // we don't do that until the next restart, for simplicity
        // FIXME: if we ever implement the moving of devices, we need to move
        // any cached channel state too (or move channel state to synchronized
        // storage)

        var configured = this.engine.tiers.getAllConfiguredTiers();

        // if we're the only tier, just return ourselves
        if (configured.length === 1)
            return this._ownerTier = configured[0];

        if (configured.indexOf(Tier.SERVER) >= 0) {
            // if we have a server, and the device is under a private IP, it's likely
            // in a home network, so assign it to server (it should be discovered anyway,
            // this covers the manual configuration case)
            if (this.state) {
                if ('host' in this.state && ip.isPrivate(this.state.host))
                    return this._ownerTier = Tier.SERVER;
                if ('ip-address' in this.state && ip.isPrivate(this.state['ip-address']))
                    return this._ownerTier = Tier.SERVER;
            }
        }

        // if this device prefers a cloud instance (say it has webhooks instead of polling),
        // and we have one, use it
        if (configured.indexOf(Tier.CLOUD) >= 0 && this.hasKind('prefers-cloud'))
            return this._ownerTier = Tier.CLOUD;

        // for compat with current installations, if we have a cloud, we send online-accounts
        // there
        if (configured.indexOf(Tier.CLOUD) >= 0 && this.hasKind('online-account'))
            return this._ownerTier = Tier.CLOUD;

        // if we have a server, that's the best choice in terms of CPU, memory and storage!
        if (configured.indexOf(Tier.SERVER) >= 0)
            return this._ownerTier = Tier.SERVER;

        // if we have a cloud, that's more reliable and less battery intensive than the
        // phone
        if (configured.indexOf(Tier.CLOUD) >= 0)
            return this._ownerTier = Tier.CLOUD;

        // we don't have a server, we don't have a cloud, therefore we must have a phone
        return this._ownerTier = Tier.PHONE;
    },

    // Note: unlike Channel and App there is no isSupported
    // because it is possible to instantiate a Device on any platform
    // return null from queryInterface() or throw exceptions from methods
    // if you can't do something from a specific platform

    // Perform an async check to verify if the device is available
    // (ie, on, working, reachable on the local network, etc.)
    // Returns a promise of the device availability
    checkAvailable: function() {
        if (this.ownerTier !== this.engine.ownTier) {
            return this.engine.tiers.isConnected(this.ownerTier) ? Availability.AVAILABLE :
                Availability.OWNER_UNAVAILABLE;
        } else {
            return Availability.UNKNOWN;
        }
    },

    // Check if this device corresponds to the abstract kind "kind",
    // ie, it's a bluetooth device, or a phone, or remote device,
    // or has an accelerometer, or whatever...
    // A device can have multiple kinds at the same time
    // Usually a kind corresponds to an extension interface, but not
    // all kinds have extension interfaces, and the device can expose
    // the kind without the interface if instantiated in the wrong
    // platform
    hasKind: function(kind) {
        return kind === this.kind ||
            (this.globalName !== undefined && kind === this.globalName) ||
            (this.constructor.metadata.types.indexOf(kind) >= 0);
    },

    // Check if this device was given the tag @tag by the user
    // Tag can be an arbitrary identifier, ie, livingroom or home or
    // work, and devices can have multiple tags.
    hasTag: function(tag) {
        if (this.state && Array.isArray(this.state.tags))
            return this.state.tags.indexOf(tag) >= 0;
        else
            return false;
    },

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
    queryInterface: function() {
        // no extension interfaces for this device class
        return null;
    },

    getTrigger: function(id, params) {
        return this.engine.channels.getOpenedChannel(this, id, 'r', params);
    },

    getAction: function(id) {
        return this.engine.channels.getOpenedChannel(this, id, 'w');
    },

    getQuery: function(id) {
        return this.engine.channels.getOpenedChannel(this, id, 'q');
    },

    _getChannelClass: function(name) {
        return this.constructor.require('./' + name);
    },

    // Convenience methods for obtaining an action, invoking it, and closing
    // it afterwards
    invokeAction: function(id, args) {
        return this.getAction(id).then(function(action) {
            action.sendEvent(args);
            return action.close();
        });
    },

    invokeQuery: function(id, filters) {
        return this.getQuery(id).then(function(query) {
            return query.invokeQuery(filters).finally(function() {
                return query.close();
            });
        });
    },

    // Get a trigger class for a trigger with the given name
    // You should override this to return your own trigger classes
    getTriggerClass: function(name) {
        return this._getChannelClass(name);
    },

    // Get a action class that is identified with the given ID
    // You can override this to return your own action classes,
    // but if you don't a default will be provided that calls invokeAction
    getActionClass: function(kind) {
        try {
            // for compat, try loading the js file first
            return this._getChannelClass(kind);
        } catch(e) {
            return makeSimpleActionClass(kind);
        }
    },

    // Get a query class that is identified with the given ID
    // You can override this to return your own query classes,
    // but if you don't a default will be provided that calls invokeQuery
    getQueryClass: function(kind) {
        try {
            // for compat, try loading the js file first
            return this._getChannelClass(kind);
        } catch(e) {
            return makeSimpleQueryClass(kind);
        }
    }
});

function makeSimpleActionClass(kind) {
    return new lang.Class({
        Name: 'SimpleAction' + kind,
        Extends: BaseChannel,

        _init: function(engine, device) {
            this.parent();
            this.device = device;
        },

        sendEvent: function(event) {
            this.device.invokeAction(kind, event);
        }
    });
}

function makeSimpleQueryClass(kind) {
    return new lang.Class({
        Name: 'SimpleQuery' + kind,
        Extends: BaseChannel,

        _init: function(engine, device) {
            this.parent();
            this.device = device;
        },

        invokeQuery: function(filters) {
            this.device.invokeQuery(kind, filters);
        }
    });
}

module.exports.Availability = Availability;
module.exports.Tier = Tier;
