// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const lang = require('./lang');
const BaseDevice = require('./base_device');
const BaseChannel = require('./base_channel');

// a meta class for inheriting from BaseDevice, which avoids exposing
// lang.Class, and also has some utility for adding devices
const DeviceClass = new lang.Class({
    Name: 'DeviceClass',
    Extends: lang.Class,

    _construct: function(params) {
        if (!params.Extends)
            params.Extends = BaseDevice;
        return lang.Class.prototype._construct.call(this, params);
    },

    _init: function(params) {
        var useOAuth2 = params.UseOAuth2;
        var useDiscovery = params.UseDiscovery;
        delete params.UseOAuth2;
        delete params.UseDiscovery;

        if (useDiscovery)
            this.loadFromDiscovery = useDiscovery;
        if (useOAuth2)
            this.runOAuth2 = useOAuth2;

        this.parent(params);
    }
});

// same for BaseChannel, which also hides refcounted
const ChannelClass = new lang.Class({
    Name: 'ChannelClass',
    Extends: lang.Class,

    _construct: function(params) {
        if (!params.Extends)
            params.Extends = BaseChannel;
        return this.parent(params);
    },

    _init: function(params) {
        var requiredCapabilities = params.RequiredCapabilities;
        if (requiredCapabilities) {
            delete params.RequiredCapabilities;
            this.requiredCapabilities = requiredCapabilities;
        } else {
            this.requiredCapabilities = [];
        }

        this.parent(params);
    },
});

module.exports = {
    DeviceClass: DeviceClass,
    ChannelClass: ChannelClass
};
