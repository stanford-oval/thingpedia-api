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

require('./lib/string_format');
const Messaging = require('./lib/messaging');
const Preferences = require('./lib/prefs');
const BaseDevice = require('./lib/base_device');
const Helpers = require('./lib/helpers');
const ConfigDelegate = require('./lib/config_delegate');
const { OAuthError } = require('./lib/errors');
const BaseClient = require('./lib/base_client');
const HttpClient = require('./lib/http_client');
const FileClient = require('./lib/file_thingpedia_client');
const DeviceFactory = require('./lib/factory');
const { ImplementationError, UnsupportedError } = require('./lib/errors');
const BaseEngine = require('./lib/base_engine');
const BasePlatform = require('./lib/base_platform');
const DeviceConfigUtils = require('./lib/device_factory_utils');

const ThingTalk = require('thingtalk');

/**
 * Versioning information for the library.
 *
 * Use this object to check if the currently loaded Thingpedia SDK
 * is compatible with your device, and to dynamically check if a specific
 * feature is present.
 *
 * Note: you should never bundle the Thingpedia SDK with your device.
 *
 * @alias version
 * @namespace
 */
const VERSION = {
    /** Major version number (incremented on incompatible changes) */
    major: 2,
    /** Minor version number (incremented on feature additions) */
    minor: 8,
    /** Full version string, in semantic version format */
    full: '2.8.0',
    /** Convert the version number to a number (for comparisons) */
    valueOf() {
        return this.major * 100 + this.minor;
    },
    toString() {
        return this.full;
    },
    /**
     * Check if the current version is compatible with the passed in version
     *
     * @param {number|Version} v - the version, as a number or object with `major`
     *                             and minor properties
     * @return {Boolean}
     */
    compatible(v) {
        if (typeof v === 'number')
            return this.valueOf() >= v && Math.floor(v/100) === this.major;
        else
            return this.major === v.major && this.minor >= v.minor;
    },
    /**
     * Check if the given feature is present.
     *
     * It is ok to pass invalid or unrecognized feature names to this function,
     * which will then return `false`.
     *
     * In this version of the library, the following feature names are recognized:
     * - `rss`: RSS helpers and loaders
     * - `value-types`: ThingTalk value types are re-exported
     * - `thingpedia-client`: Thingpedia Client APIs are present
     *
     * @param {String} f - a feature name
     * @return {Boolean} whether the named feature is supported.
     */
    hasFeature(f) {
        switch (f) {
        case 'rss':
        case 'value-types':
        case 'thingpedia-client':
            return true;
        default:
            return false;
        }
    }
};

module.exports = {
    version: VERSION,

    // APIs for implementers of Thingpedia interfaces
    BaseDevice,
    Availability: BaseDevice.Availability,
    Tier: BaseDevice.Tier,

    // helper libraries and portions of ThingTalk API that are public/stable
    Helpers,
    Value: {
        Entity: ThingTalk.Builtin.Entity,
        Currency: ThingTalk.Builtin.Currency,
        Location: ThingTalk.Builtin.Location,
        Time: ThingTalk.Builtin.Time
    },

    // interfaces (for documentation/type-checking only)
    Messaging,
    ConfigDelegate,
    Preferences,

    // compatibility export
    ObjectSet: Helpers.ObjectSet,

    // APIs for users of Thingpedia interfaces
    BaseEngine,
    BasePlatform,
    BaseClient,
    HttpClient,
    FileClient,
    DeviceFactory,
    DeviceConfigUtils,

    // expose errors
    ImplementationError,
    UnsupportedError,
    OAuthError,
};
