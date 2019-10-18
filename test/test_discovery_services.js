// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Almond Cloud
//
// Copyright 2018 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const assert = require('assert');
const ThingTalk = require('thingtalk');

const DeviceFactoryUtils = require('../lib/device_factory_utils');

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

    const classDef = ThingTalk.Grammar.parse(classCode).classes[0];
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
module.exports = main;
if (!module.parent)
    main();
