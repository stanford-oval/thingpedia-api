// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Base = require('./base');

module.exports = class BasicAuthConfigMixin extends Base {
    install(deviceClass) {
        // add an "auth" getter to the device class (through the prototype)
        // that returns the HTTP Authorization header to use

        Object.defineProperty(deviceClass.prototype, 'auth', {
            configurable: true,
            enumerable: true,
            get() {
                const base64 = Buffer.from(this.state.username + ':' +
                                           this.state.password).toString('base64');
                return 'Basic ' + base64;
            }
        });
    }
};
