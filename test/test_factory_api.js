// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2018 Google LLC
//           2018-2020 The Board of Trustees of the Leland Stanford Junior University
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

import DeviceFactory from '../lib/factory';

import { mockClient, mockEngine } from './mock';
const factory = new DeviceFactory(mockEngine, mockClient);

import MyDevice from './device-classes/org.thingpedia.test.mydevice';

async function testBasic() {
    const deviceFactory = await factory.getDeviceClass('org.thingpedia.test.mydevice');
    assert.strictEqual(deviceFactory, MyDevice);
}

async function testQuery() {
    const modules = await factory.getCachedDeviceClasses();
    modules.sort((a, b) => a.name.localeCompare(b.name));
    assert.deepStrictEqual(modules, [
        { name: 'org.thingpedia.test.mydevice', version: 1 },
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
export default main;
if (!module.parent)
    main();
