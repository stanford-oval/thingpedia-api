// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const lang = require('./lang');
const BaseDevice = require('./base_device');

const OnlineAccount = new lang.Class({
    Name: 'OnlineAccount',
    Extends: BaseDevice,

    _init: function(engine, state) {
        this.parent(engine, state);
        console.log('OnlineAccount is deprecated, set your types correctly in the manifest');
    },

    checkAvailable: function() {
        return BaseDevice.Availability.AVAILABLE;
    }
});

module.exports = {
    OnlineAccount: OnlineAccount
};
