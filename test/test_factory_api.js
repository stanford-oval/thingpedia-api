// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2018 The Board of Trustees of the Leland Stanford Junior University
//                Google LLC
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');

const DeviceFactory = require('../lib/factory');

const { mockClient, mockEngine } = require('./mock');
const factory = new DeviceFactory(mockEngine, mockClient);

const MyDevice = require('./device-classes/org.thingpedia.test.mydevice');

async function testBasic() {
    const deviceFactory = await factory.getDeviceClass('org.thingpedia.test.mydevice');
    assert.strictEqual(deviceFactory, MyDevice);
}

async function testQuery() {
    const modules = await factory.getCachedDeviceClasses();
    modules.sort((a, b) => a.name.localeCompare(b.name));
    assert.deepStrictEqual(modules, [
        { name: 'com.herokuapp.lorem-rss', version: 1 },
        { name: 'com.herokuapp.lorem-rss.broken.hasaction', version: 1 },
        { name: 'com.herokuapp.lorem-rss.broken.nosubscribe', version: 1 },
        { name: 'com.xkcd', version: 91 },
        { name: 'edu.stanford.almond-dev', version: 1 },
        { name: 'org.httpbin', version: 1 },
        { name: 'org.httpbin.basicauth', version: 1 },
        { name: 'org.httpbin.broken', version: 1 },
        { name: 'org.httpbin.form', version: 1 },
        { name: 'org.httpbin.oauth', version: 1 },
        { name: 'org.thingpedia.builtin.test.invalid', version: 0 },
        { name: 'org.thingpedia.test.bluetooth', version: 1 },
        { name: 'org.thingpedia.test.broken', version: 1 },
        { name: 'org.thingpedia.test.broken.databasequery1', version: 1 },
        { name: 'org.thingpedia.test.broken.databasequery2', version: 1 },
        { name: 'org.thingpedia.test.broken.noaction', version: 1 },
        { name: 'org.thingpedia.test.broken.noquery', version: 1 },
        { name: 'org.thingpedia.test.broken.nosubscribe', version: 1 },
        { name: 'org.thingpedia.test.collection', version: 1 },
        { name: 'org.thingpedia.test.databasequery', version: 1 },
        { name: 'org.thingpedia.test.interactive', version: 1 },
        { name: 'org.thingpedia.test.mydevice', version: 1 },
        { name: 'org.thingpedia.test.pkgversion', version: 2 },
        { name: 'org.thingpedia.test.subdevice', version: 1 },
    ]);
}

async function testConfigure() {
    const instance = await factory.loadSerialized('org.thingpedia.test.mydevice', {
        kind: 'org.thingpedia.test.mydevice'
    });
    assert(instance instanceof MyDevice);
}

async function main() {
    await testBasic();
    await testQuery();
    await testConfigure();
}
module.exports = main;
if (!module.parent)
    main();
