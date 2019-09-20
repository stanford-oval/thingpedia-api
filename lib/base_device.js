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
const Url = require('url');

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

    // configuration interfaces

    /**
      Begin configuring this device using a custom OAuth-like flow.

      This includes OAuth 1.0 and OAuth 2.0 with custom code.
      Standard uses of OAuth 2.0 should not override this method. Instead, they
      should use the @org.thingpedia.config.oauth2() mixin, and override loadFromOAuth2.

      The method should return a tuple of:
      - redirect uri (a String)
      - session object (a plain JS object mapping String to String)

      The data in the session object will be passed to `completeCustomOAuth`.
    */
    static async loadFromCustomOAuth(engine) {
        // if not overridden, call the compatibility method using the legacy interface
        // (req === null to mean phase1, req !== null for phase2)
        // NOTE: we're in a static method, so "this" refers to the class, not the instance!
        return this.runOAuth2(engine, null);
    }

    /**
      Complete configuring this device using custom OAuth-like flows.

      This method will be called after the user redirects back to Almond,
      and will be passed the redirect URL, and the session information that was returned
      by loadFromCustomOAuth.

      This method should return a new device instance.
    */
    static async completeCustomOAuth(engine, url, session) {
        // if not overridden, call the compatibility method with a made-up `req` object
        const req = {
            httpVersion: '1.0',
            headers: [],
            rawHeaders: [],
            method: 'GET',
            url: url,
            query: Url.parse(url, true).query,
            session: session
        };
        return this.runOAuth2(engine, req);
    }

    /**
      Configure this device using OAuth 2.0

      This method is called by the OAuth 2.0 helpers (@org.thingpedia.config.oauth2())
      and should return a new device instance.
    */
    /* istanbul ignore next */
    static async loadFromOAuth2(engine, accessToken, refreshToken, extraData) {
        throw new Error('not implemented');
    }

    /**
      Configure this device using local discovery.

      The method should return a new device instance. The instance might be partially
      initialized (e.g. for Bluetooth, the device might not be paired). If the user
      chooses to continue configuring the device, `completeDiscovery()` will be called.
    */
    /* istanbul ignore next */
    static async loadFromDiscovery(engine, publicData, privateData) {
        throw new Error('not implemented');
    }

    /**
      Complete configuring this device from local discovery.

      Note this is an instance method, not a static method. It will be called
      on the partially initialized instance returned by `loadFromDiscovery()`.

      The method should return the device instance itself ("this").
    */
    /* istanbul ignore next */
    async completeDiscovery(delegate) {
        throw new Error('not implemented');
    }

    /**
      Update the device state based on local discovery data.
    */
    /* istanbul ignore next */
    async updateFromDiscovery(privateData) {
        // nothing to do here, subclasses can override if they support discovery
    }

    /**
      Update the device state when the OAuth 2.0 token is refreshed.
    */
    async updateOAuth2Token(accessToken, refreshToken, extraData) {
        this.state.accessToken = accessToken;
        // if the refresh token is single use, we will get a new one when we use it
        if (refreshToken)
            this.state.refreshToken = refreshToken;

        this.stateChanged();
    }

    /**
      Configure this device using interactive (voice-based) configuration.
    */
    /* istanbul ignore next */
    static async loadInteractively(engine, delegate) {
        // if not overridden, call the compatibility method
        // NOTE: we're in a static method, so "this" refers to the class, not the instance!
        return this.configureFromAlmond(engine, delegate);
    }

    get kind() {
        return this.state.kind;
    }
    get metadata() {
        return this.constructor.metadata;
    }
    get platform() {
        return this._engine.platform;
    }
    get engine() {
        console.log('BaseDevice.engine is deprecated and should not be used in new code.');
        return this._engine;
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
