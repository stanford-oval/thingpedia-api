// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const events = require('events');

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
    constructor(engine, state) {
        super();
        this._engine = engine;
        this.state = state;

        // Set this to a device specific ID plus something unique
        // (eg "mydevice-aa-bb-cc-dd-ee-ff") so that no other device
        // can possibly have the same ID
        // If you leave it unset, DeviceDatabase will pick for you

        // provide default uniqueId for config.none() devices
        const ast = this.metadata;
        const params = Object.keys(ast.params);
        const isNoneFactory = ast.auth.type === 'none' && params.length === 0;
        const isNoneAuth = ast.auth.type === 'none';
        if (isNoneFactory)
            this.uniqueId = this.kind;
        else if (isNoneAuth)
            this.uniqueId = this.kind + '-' + params.map((k) => (k + ':' + state[k])).join('-');
        else
            this.uniqueId = undefined; // let DeviceDatabase pick something

        // provide default name and description
        // NOTE: these are not getters, because the subclass can override
        // them and mutate them as it wishes
        this.name = ast.name;
        this.description = ast.description;

        // Set these to protocol/discovery specific IDs (such as
        // "bluetooth/aa-bb-cc-dd-ee-ff") so that it is unlikely that
        // another device has the same ID
        this.descriptors = [];

        // Set to true if this device should not be stored in the devicedb
        // but only kept in memory (ie, its lifetime is managed by some
        // device discovery module, or it's a subdevice of some other device)
        this.isTransient = false;

        this._ownerTier = undefined;
    }

    get kind() {
        return this.state.kind;
    }
    get metadata() {
        return this.constructor.metadata;
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

    /* istanbul ignore next */
    completeDiscovery(delegate) {
        // nothing to do here, subclasses can override if they support discovery
    }

    /* istanbul ignore next */
    updateFromDiscovery(data) {
        // nothing to do here, subclasses can override if they support discovery
    }

    serialize() {
        if (!this.state)
            throw new Error('Device lost state, cannot serialize');
        return this.state;
    }

    /* istanbul ignore next */
    start() {
        // nothing to do here, subclasses can override if they need to
    }

    /* istanbul ignore next */
    stop() {
        // nothing to do here, subclasses can override if they need to
    }

    get engine() {
        return this._engine;
    }

    // Obsolete, ignore
    get ownerTier() {
        return Tier.GLOBAL;
    }

    // Perform an async check to verify if the device is available
    // (ie, on, working, reachable on the local network, etc.)
    // Returns a promise of the device availability
    checkAvailable() {
        return Availability.UNKNOWN;
    }

    // Check if this device corresponds to the abstract kind (type) "kind",
    // ie, it's a bluetooth device, or a phone, or remote device,
    // or has an accelerometer, or whatever...
    // A device can have multiple kinds at the same time
    //
    // Do not override this function. Instead, add more types to
    // the Thingpedia metadata.
    hasKind(kind) {
        if (kind === 'data-source')
            return this.constructor.metadata.category === 'data';
        if (kind === 'online-account')
            return this.constructor.metadata.category === 'online';
        if (kind === 'thingengine-system')
            return this.constructor.metadata.category === 'system';

        return kind === this.kind ||
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
    /* istanbul ignore next */
    queryInterface() {
        // no extension interfaces for this device class
        return null;
    }
};

// no $rpc for queryInterface, extension interfaces are not exported
module.exports.prototype.$rpcMethods = [
    'get name', 'get uniqueId', 'get description',
    'get ownerTier', 'get kind', 'get isTransient',
    'checkAvailable', 'hasKind'];

module.exports.Availability = Availability;
module.exports.Tier = Tier;
