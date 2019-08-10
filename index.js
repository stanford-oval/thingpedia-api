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
const DeviceFactory = require('./lib/factory');
const { ImplementationError, UnsupportedError } = require('./lib/errors');
const BaseEngine = require('./lib/base_engine');
const BasePlatform = require('./lib/base_platform');

const ThingTalk = require('thingtalk');

const VERSION = {
    major: 2,
    minor: 5,
    full: '2.5.0-beta.1',
    valueOf() {
        return this.major * 100 + this.minor;
    },
    toString() {
        return this.full;
    },
    compatible(v) {
        if (typeof v === 'number')
            return this.valueOf() >= v && Math.floor(v/100) === this.major;
        else
            return this.major === v.major && this.minor >= v.minor;
    },
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
    DeviceFactory,

    // expose errors
    ImplementationError,
    UnsupportedError,
    OAuthError,
};
