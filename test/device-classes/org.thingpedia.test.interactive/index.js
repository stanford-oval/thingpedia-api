// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const assert = require('assert');

module.exports = class InteractiveTestDevice extends Tp.BaseDevice {
    static async loadInteractively(engine, delegate) {
        const pw = await delegate.requestCode("Please insert the Password");
        assert.strictEqual(pw, "12345678");

        await delegate.configDone();
        return new InteractiveTestDevice(engine,
                                         { kind: 'org.thingpedia.test.interactive' });
    }

    async completeDiscovery(delegate) {

        return this;
    }
};
