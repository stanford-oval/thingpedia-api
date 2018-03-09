// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const BaseChannel = require('../base_channel');

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
};
