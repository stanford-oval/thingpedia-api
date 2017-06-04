// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Q = require('q');

const BaseChannel = require('../base_channel');
const Helpers = require('../helpers');

module.exports = class SimpleAction extends BaseChannel {
    _init() {
        super._init.apply(this, arguments);
        console.log('SimpleAction is deprecated. Use a pure ActionClass and override sendEvent.');
    }

    _doInvoke() {
        throw new Error('Must override doInvoke for a SimpleAction');
    }

    sendEvent(args) {
        return this._doInvoke.apply(this, args);
    }
}
