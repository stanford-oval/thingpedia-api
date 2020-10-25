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


import assert from 'assert';
import * as ThingTalk from 'thingtalk';

import * as DeviceFactoryUtils from '../lib/device_factory_utils';

const TEST_CASES = [
    [`abstract class @security-camera {}`, []],

    [`class @com.bing {
        import loader from @org.thingpedia.v2();
        import config from @org.thingpedia.config.none();
    }`, []],

    [`class @com.lg.tv.webos2 {
        import loader from @org.thingpedia.v2();
        import config from @org.thingpedia.config.discovery.upnp(search_target=['urn:lge:com:service:webos:second-screen-1']);
    }`, [{
        discovery_type: 'upnp',
        service: 'lge-com-service-webos-second-screen-1'
    }]],

    [`class @org.thingpedia.bluetooth.speaker.a2dp {
        import loader from @org.thingpedia.v2();
        import config from @org.thingpedia.config.discovery.bluetooth(uuids=['0000110b-0000-1000-8000-00805f9b34fb']);
    }`, [{
        discovery_type: 'bluetooth',
        service: 'uuid-0000110b-0000-1000-8000-00805f9b34fb'
    }]],
];

async function testCase(i) {
    console.log(`Test Case #${i+1}`);
    const [classCode, expectedServices] = TEST_CASES[i];

    const classDef = ThingTalk.Syntax.parse(classCode).classes[0];
    const generatedServices = DeviceFactoryUtils.getDiscoveryServices(classDef);

    try {
        assert.deepStrictEqual(generatedServices, expectedServices);
    } catch(e) {
        console.error('Failed: ' + e.message);
        if (process.env.TEST_MODE)
            throw e;
    }
}
async function main() {
    for (let i = 0; i < TEST_CASES.length; i++)
        await testCase(i);
}
export default main;
if (!module.parent)
    main();
