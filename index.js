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

const Messaging = require('./lib/messaging');
const BaseDevice = require('./lib/base_device');
const BaseChannel = require('./lib/base_channel');
const Helpers = require('./lib/helpers');
const Classes = require('./lib/classes');
const ObjectSet = require('./lib/object_set');
const ConfigDelegate = require('./lib/config_delegate');

const ThingTalk = require('thingtalk');

const VERSION = {
    major: 2,
    minor: 2,
    valueOf() {
        return this.major * 100 + this.minor;
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
            return true;
        default:
            return false;
        }
    }
};

module.exports = {
    // Modules is a private implementation detail between thingengine-core
    // and thingpedia, don't use it
    Modules: require('./lib/modules'),

    BaseDevice,
    Availability: BaseDevice.Availability,

    // deprecated compatibility code
    BaseChannel: BaseChannel,
    DeviceClass: Classes.DeviceClass,
    ChannelClass: Classes.ChannelClass,

    // internal semi-obsolete stuff
    Tier: BaseDevice.Tier,

    // interfaces (for documentation/type-checking only)
    Messaging,
    ConfigDelegate,

    Helpers,

    ObjectSet,

    Value: {
        Entity: ThingTalk.Builtin.Entity,
        Currency: ThingTalk.Builtin.Currency,
        Location: ThingTalk.Builtin.Location,
        Time: ThingTalk.Builtin.Time
    },

    version: VERSION
};
