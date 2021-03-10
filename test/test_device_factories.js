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
    [`abstract class @security-camera {}`, null],

    [`class @org.thingpedia.builtin.thingengine.builtin {
        import loader from @org.thingpedia.builtin();
        import config from @org.thingpedia.config.builtin();
    }`, null],

    [`class @com.bing #_[thingpedia_name="Bing Search"] {
        import loader from @org.thingpedia.v2();
        import config from @org.thingpedia.config.none();
    }`, {
        type: 'none',
        text: "Bing Search",
        kind: 'com.bing',
        category: 'data'
    }],

    [`class @com.bodytrace.scale #_[thingpedia_name="BodyTrace Scale"] {
        import loader from @org.thingpedia.v2();
        import config from @org.thingpedia.config.basic_auth(extra_params=new ArgMap(serial_number : String));
    }`, {
        type: 'form',
        text: "BodyTrace Scale",
        kind: 'com.bodytrace.scale',
        category: 'online',
        fields: [
            { name: 'username', label: 'Username', type: 'text' },
            { name: 'password', label: 'Password', type: 'password' },
            { name: 'serial_number', label: 'serial number', type: 'text' },
        ]
    }],

    [`class @com.bodytrace.scale2 #_[thingpedia_name="BodyTrace Scale"] {
        import loader from @org.thingpedia.v2();
        import config from @org.thingpedia.config.basic_auth();
    }`, {
        type: 'form',
        text: "BodyTrace Scale",
        kind: 'com.bodytrace.scale2',
        category: 'online',
        fields: [
            { name: 'username', label: 'Username', type: 'text' },
            { name: 'password', label: 'Password', type: 'password' }
        ]
    }],

    [`class @org.thingpedia.rss #_[thingpedia_name="RSS Feed"] {
        import loader from @org.thingpedia.rss();
        import config from @org.thingpedia.config.form(params=new ArgMap(url : Entity(tt:url)));
    }`, {
        type: 'form',
        text: "RSS Feed",
        kind: 'org.thingpedia.rss',
        category: 'data',
        fields: [
            { name: 'url', label: 'url', type: 'url' },
        ]
    }],

    [`class @com.twitter #_[thingpedia_name="Twitter Account"] {
        import loader from @org.thingpedia.v2();
        import config from @org.thingpedia.config.custom_oauth();
    }`, {
        type: 'oauth2',
        text: "Twitter Account",
        kind: 'com.twitter',
        category: 'online',
    }],

    [`class @com.linkedin #_[thingpedia_name="LinkedIn Account"] {
        import loader from @org.thingpedia.v2();
        import config from @org.thingpedia.config.oauth2(client_id="foo", client_secret="bar");
    }`, {
        type: 'oauth2',
        text: "LinkedIn Account",
        kind: 'com.linkedin',
        category: 'online',
    }],

    [`class @com.lg.tv.webos2 #_[thingpedia_name="LG TV"] {
        import loader from @org.thingpedia.v2();
        import config from @org.thingpedia.config.discovery.upnp(search_target=['urn:lge:com:service:webos:second-screen-1']);
    }`, {
        type: 'discovery',
        text: "LG TV",
        kind: 'com.lg.tv.webos2',
        category: 'physical',
        discoveryType: 'upnp'
    }],

    [`class @org.thingpedia.bluetooth.speaker.a2dp #_[thingpedia_name="Bluetooth Speaker"] {
        import loader from @org.thingpedia.v2();
        import config from @org.thingpedia.config.discovery.bluetooth(uuids=['0000110b-0000-1000-8000-00805f9b34fb']);
    }`, {
        type: 'discovery',
        text: "Bluetooth Speaker",
        kind: 'org.thingpedia.bluetooth.speaker.a2dp',
        category: 'physical',
        discoveryType: 'bluetooth'
    }],
];

async function testCase(i) {
    console.log(`Test Case #${i+1}`);
    const [classCode, expectedFactory] = TEST_CASES[i];

    const classDef = ThingTalk.Syntax.parse(classCode).classes[0];
    const generatedFactory = DeviceFactoryUtils.makeDeviceFactory(classDef);

    try {
        assert.deepStrictEqual(generatedFactory, expectedFactory);
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
