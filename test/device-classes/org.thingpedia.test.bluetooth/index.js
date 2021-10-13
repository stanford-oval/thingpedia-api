// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>


import * as Tp from 'thingpedia';
import assert from 'assert';

export default class BluetoothTestDevice extends Tp.BaseDevice {
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
}
