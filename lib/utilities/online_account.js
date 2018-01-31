// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const BaseDevice = require('../base_device');

module.exports = class OnlineAccount extends BaseDevice {
    _init(engine, state) {
        super._init(engine, state);
        console.log('OnlineAccount is deprecated, set your types correctly in the manifest');
    }

    checkAvailable() {
        return BaseDevice.Availability.AVAILABLE;
    }
}
