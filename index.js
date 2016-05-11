// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Messaging = require('./lib/messaging');
const BaseDevice = require('./lib/base_device');
const BaseChannel = require('./lib/base_channel');
const UtilityDev = require('./lib/utility_devices');
const UtilityCh = require('./lib/utility_channels');
const Helpers = require('./lib/helpers');
const Classes = require('./lib/classes');
const TripleStore = require('./lib/triplestore');
const ObjectSet = require('./lib/object_set');

module.exports = {
    BaseDevice: BaseDevice,
    OnlineAccount: UtilityDev.OnlineAccount,

    BaseChannel: BaseChannel,
    PollingTrigger: UtilityCh.PollingTrigger,
    HttpPollingTrigger: UtilityCh.HttpPollingTrigger,
    SimpleAction: UtilityCh.SimpleAction,

    DeviceClass: Classes.DeviceClass,
    ThingClass: Classes.DeviceClass,
    ChannelClass: Classes.ChannelClass,
    TriggerClass: Classes.ChannelClass,
    ActionClass: Classes.ChannelClass,
    QueryClass: Classes.ChannelClass,

    Availability: BaseDevice.Availability,
    Tier: BaseDevice.Tier,

    Messaging: Messaging,

    Helpers: Helpers,

    TripleStore: TripleStore,

    ObjectSet: ObjectSet
};
