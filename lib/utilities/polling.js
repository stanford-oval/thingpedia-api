// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015-2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Q = require('q');

const BaseChannel = require('../base_channel');

// empty class, exists for compatibility only
// all channels are polling by default, and they override
// to change
module.exports = class PollingTrigger extends BaseChannel {
    // override _onTick so that the compat check recognizes that this is
    // an old-style trigger
    _onTick() {
        throw new TypeError('Must implement onTick for PollingTrigger');
    }
}
