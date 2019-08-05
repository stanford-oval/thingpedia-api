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

module.exports = class BluetoothTestDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.alias = state.alias;
        this.hwAddress = state.hwAddress;

        this.uniqueId = 'org.thingpedia.test.bluetooth-' + state.hwAddress.replace(/:/g,'-');
        this.descriptors = ['bluetooth/' + state.hwAddress];
    }

    static loadFromDiscovery(engine, publicData, privateData) {
        return new BluetoothTestDevice(engine,
                                       { kind: 'org.thingpedia.test.bluetooth',
                                         discoveredBy: engine.ownTier,
                                         paired: privateData.paired,
                                         uuids: publicData.uuids,
                                         class: publicData.class,
                                         hwAddress: privateData.address,
                                         alias: privateData.alias });
    }

    async completeDiscovery(delegate) {
        if (this.state.paired)
            return this;

        const pin = await delegate.requestCode("Please insert the PIN code");
        assert.strictEqual(pin, "1234");
        return this;
    }
};
