// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2018-2020 The Board of Trustees of the Leland Stanford Junior University
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
import child_process from 'child_process';

import Modules from '../lib/loaders';
import ModuleDownloader from '../lib/downloader';
import { ImplementationError } from '../lib/errors';

import MyDevice from './device-classes/org.thingpedia.test.mydevice';
import { toClassDef, mockClient, mockPlatform, mockEngine, State } from './mock';

async function testDownloader() {
    const metadata = toClassDef(await mockClient.getDeviceCode('org.thingpedia.test.mydevice'));

    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);
    const module = await downloader.getModule('org.thingpedia.test.mydevice');

    assert.strictEqual(module.id, 'org.thingpedia.test.mydevice');
    assert.strictEqual(module.version, 1);
    assert.deepStrictEqual(module.manifest, metadata);
}

async function collect(iter) {
    const into = [];
    for await (const x of iter)
        into.push(x);
    return into;
}

async function testPreloaded() {
    const metadata = toClassDef(await mockClient.getDeviceCode('org.thingpedia.test.mydevice'));

    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);
    const module = new (Modules['org.thingpedia.v2'])('org.thingpedia.test.mydevice', metadata, {}, downloader);

    assert.strictEqual(module.id, 'org.thingpedia.test.mydevice');
    assert.strictEqual(module.version, 1);
    assert.strictEqual(module.manifest, metadata);

    const factory = await module.getDeviceClass();


    assert.strictEqual(factory, MyDevice);
    assert.strictEqual(factory.manifest, metadata);
    //assert.strictEqual(factory.metadata, metadata);
    assert.deepStrictEqual(factory.require('package.json'), { "name":"org.thingpedia.test.mydevice",
        "main": "index.js",
        "thingpedia-version":1
    });

    const d = new factory(mockEngine, { kind: 'org.thingpedia.test.mydevice' });
    assert.strictEqual(typeof d.get_something, 'function');
    assert.strictEqual(typeof d.get_something_poll, 'function');
    assert.strictEqual(typeof d.get_something_async_iterable, 'function');
    assert.strictEqual(typeof d.subscribe_something, 'function');
    assert.strictEqual(typeof d.subscribe_something_poll, 'function');
    assert.strictEqual(typeof d.subscribe_something_async_iterable, 'function');
    assert.strictEqual(typeof d.do_something_else, 'function');

    assert.deepStrictEqual(await d.get_something(), [
        { v1: 'foo', v2: 42 }
    ]);
    assert.deepStrictEqual(await collect(await d.get_something_async_iterable()), [
        { v1: 'foo', v2: 42 }
    ]);
    await new Promise((resolve, reject) => {
        let finished = false;
        setTimeout(() => {
            if (finished)
                resolve();
            else
                reject(new assert.AssertionError('Timed out'));
        }, 5000);

        const stream = d.subscribe_something({}, new State);
        let expect = 42;
        stream.on('data', (data) => {
            try {
                if (finished)
                    assert.fail('too many results');
                delete data.__timestamp;
                assert.deepStrictEqual(data, {
                    v1: 'foo',
                    v2: expect
                });
                expect ++;
                if (expect === 44) {
                    stream.destroy();
                    finished = true;
                }
            } catch(e) {
                reject(e);
            }
        });
        stream.on('end', () => {
            reject(new assert.AssertionError('Stream ended unexpected'));
        });
    });
    await new Promise((resolve, reject) => {
        let finished = false;
        setTimeout(() => {
            if (finished)
                resolve();
            else
                reject(new assert.AssertionError('Timed out'));
        }, 5000);

        const stream = d.subscribe_something_poll({}, new State);
        let count = 0;
        stream.on('data', (data) => {
            try {
                if (finished)
                    assert.fail('too many results');
                delete data.__timestamp;
                assert.deepStrictEqual(data, {
                    v1: 'foo',
                    v2: 42
                });
                count++;
                if (count === 2) {
                    stream.destroy();
                    finished = true;
                }
            } catch(e) {
                reject(e);
            }
        });
        stream.on('end', () => {
            reject(new assert.AssertionError('Stream ended unexpected'));
        });
    });
    await new Promise((resolve, reject) => {
        let finished = false;
        setTimeout(() => {
            if (finished)
                resolve();
            else
                reject(new assert.AssertionError('Timed out'));
        }, 5000);

        const stream = d.subscribe_something_async_iterable({}, new State);
        let count = 0;
        stream.on('data', (data) => {
            try {
                if (finished)
                    assert.fail('too many results');
                delete data.__timestamp;
                assert.deepStrictEqual(data, {
                    v1: 'foo',
                    v2: 42
                });
                count++;
                if (count === 2) {
                    stream.destroy();
                    finished = true;
                }
            } catch(e) {
                reject(e);
            }
        });
        stream.on('end', () => {
            reject(new assert.AssertionError('Stream ended unexpected'));
        });
    });
    assert.throws(() => {
        d.subscribe_something_nomonitor();
    });

    await module.clearCache();

    const factory2 = await module.getDeviceClass();
    assert(factory2 !== MyDevice);
}

async function testSubdevice() {
    const collectionMetadata = toClassDef(await mockClient.getDeviceCode('org.thingpedia.test.collection'));
    //const subMetadata = toClassDef(await mockClient.getDeviceCode('org.thingpedia.test.subdevice'));

    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);

    const collectionModule = new (Modules['org.thingpedia.v2'])('org.thingpedia.test.collection',
        collectionMetadata, {},
        downloader);
    assert.strictEqual(collectionModule.id, 'org.thingpedia.test.collection');

    // this will also load the subdevices
    const collectionFactory = await collectionModule.getDeviceClass();

    assert.strictEqual(typeof collectionFactory.prototype.get_get_data, 'undefined');
    assert.strictEqual(typeof collectionFactory.prototype.do_eat_data, 'undefined');

    const subFactory = collectionFactory.subdevices['org.thingpedia.test.subdevice'];

    //assert.deepStrictEqual(subFactory.metadata, subMetadata);

    assert.strictEqual(typeof subFactory.prototype.get_get_data, 'function');
    assert.strictEqual(typeof subFactory.prototype.do_eat_data, 'function');
}

async function testBrokenDevices() {
    // test that devices with developer errors report sensible, localized and easy to
    // understand errors

    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);

    for (let err of ['noaction', 'noquery', 'nosubscribe', 'databasequery1', 'databasequery2']) {
        const metadata = toClassDef(await mockClient.getDeviceCode('org.thingpedia.test.broken.' + err));
        const module = new (Modules['org.thingpedia.v2'])('org.thingpedia.test.broken.' + err,
            metadata, {}, downloader);

        // assert that we cannot actually load this device
        await assert.rejects(() => module.getDeviceClass(), ImplementationError);
    }

    // now load a device where the error is at runtime
    const metadata = toClassDef(await mockClient.getDeviceCode('org.thingpedia.test.broken'));
    const module = new (Modules['org.thingpedia.v2'])('org.thingpedia.test.broken',
        metadata, {}, downloader);
    // this should load correctly
    const factory = await module.getDeviceClass();
    const instance = new factory(mockEngine, { kind: 'org.thingpedia.test.broken' });

    // the methods in this class don't throw an error, but they
    // also don't return the correct result
    await assert.rejects(() => instance.get_something_poll1(), ImplementationError);
    await assert.rejects(() => instance.get_something_poll2(), ImplementationError);
    await assert.rejects(() => instance.get_something_poll3(), ImplementationError);
    await assert.rejects(() => instance.get_something_poll4(), ImplementationError);
    await assert.throws(() => instance.subscribe_something(), ImplementationError);

    // this one doesn't return an iterable (it returns an async-iterable), but it's ok anyway
    await instance.get_something_lazy();
}

async function testThingpedia() {
    child_process.spawnSync('rm', ['-rf', mockPlatform.getCacheDir() + '/device-classes/com.xkcd']);

    const metadata = toClassDef(await mockClient.getDeviceCode('com.xkcd'));
    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);

    const module = new (Modules['org.thingpedia.v2'])('com.xkcd', metadata, {}, downloader);

    assert.strictEqual(module.id, 'com.xkcd');
    assert(module.version >= 91);
    assert.strictEqual(module.manifest, metadata);

    const factory = await module.getDeviceClass();

    //assert.strictEqual(factory.metadata, metadata);
    assert.strictEqual(typeof factory.prototype.get_get_comic, 'function');
    assert.strictEqual(typeof factory.prototype.subscribe_get_comic, 'function');
    assert.strictEqual(typeof factory.prototype.get_random_comic, 'function');
    assert.strictEqual(typeof factory.prototype.subscribe_random_comic, 'function');
}

async function testPkgVersion() {
    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);
    const module = await downloader.getModule('org.thingpedia.test.pkgversion');

    assert.strictEqual(module.id, 'org.thingpedia.test.pkgversion');
    assert.strictEqual(module.version, 2);
    assert.strictEqual(module.package_version, 0);

    await module.getDeviceClass();
}

async function testBluetooth() {
    const metadata = toClassDef(await mockClient.getDeviceCode('org.thingpedia.test.bluetooth'));

    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);
    const module = new (Modules['org.thingpedia.v2'])('org.thingpedia.test.bluetooth', metadata, {}, downloader);

    const deviceClass = await module.getDeviceClass();

    const delegate = {
        async configDone() {
        },
        async configFailed(error) {
            throw error;
        },
        async confirm(question) {
            throw new Error(question);
        },
        async requestCode(question) {
            if (question === 'Please insert the PIN code')
                return '1234';
            throw new Error(question);
        }
    };

    const instance = await deviceClass.loadFromDiscovery(mockEngine, {
        kind: 'bluetooth',
        uuids: [],
        class: 0
    }, {
        address: '11:22:33:44:55:66',
        alias: 'Foo',
        paired: false
    });
    assert(instance instanceof deviceClass);

    const i2 = await instance.completeDiscovery(delegate);
    assert.strictEqual(i2, instance);
}

async function testInteractive() {
    const metadata = toClassDef(await mockClient.getDeviceCode('org.thingpedia.test.interactive'));

    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);
    const module = new (Modules['org.thingpedia.v2'])('org.thingpedia.test.interactive', metadata, {}, downloader);

    const deviceClass = await module.getDeviceClass();

    const delegate = {
        async configDone() {
        },
        async configFailed(error) {
            throw error;
        },
        async confirm(question) {
            throw new Error(question);
        },
        async requestCode(question) {
            if (question === 'Please insert the Password')
                return '12345678';
            throw new Error(question);
        }
    };

    const instance = await deviceClass.loadInteractively(mockEngine, delegate);
    assert(instance instanceof deviceClass);
}

async function testDatabase() {
    const metadata = toClassDef(await mockClient.getDeviceCode('org.thingpedia.test.databasequery'));

    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);
    const module = new (Modules['org.thingpedia.v2'])('org.thingpedia.test.databasequery', metadata, {}, downloader);

    const factory = await module.getDeviceClass();
    const device = new factory(mockEngine, { kind: 'org.thingpedia.test.databasequery' });

    assert.strictEqual(typeof device.query, 'function');
}

async function testProxied() {
    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);
    const module = await downloader.getModule('org.thingpedia.test.proxied');

    const factory = await module.getDeviceClass();
    const device = new factory(mockEngine, { kind: 'org.thingpedia.test.proxied' });

    await assert.rejects(async () => {
        return device.do_test_action();
    }, { code: 'ENOSYS' });

    const out = [];
    for await (const element of device.get_test({}))
        out.push(element);

    assert.deepStrictEqual(out, [{
        a: 'foo', b: 1,
    }, {
        a: 'bar', b: 2
    }]);
}

async function testSubclass() {
    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);
    const module = await downloader.getModule('org.thingpedia.test.subclass');

    const factory = await module.getDeviceClass();
    const device = new factory(mockEngine, { kind: 'org.thingpedia.test.subclass' });

    assert.strictEqual(typeof device.get_something, 'function');
    assert.deepStrictEqual(await device.get_something({}), [
        { v1: 'foo', v2: 42 }
    ]);

    assert.strictEqual(typeof device.subscribe_something, 'function');
}

async function main() {
    await testPreloaded();
    await testSubdevice();
    await testBrokenDevices();
    await testThingpedia();
    await testDownloader();
    await testPkgVersion();
    await testBluetooth();
    await testInteractive();
    await testDatabase();
    await testProxied();
    await testSubclass();
}
export default main;
if (!module.parent)
    main();
