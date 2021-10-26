// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2018 Google LLC
//           2018-2019 The Board of Trustees of the Leland Stanford Junior University
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

import { toClassDef, mockClient, mockPlatform, mockEngine, State } from './mock';
import { ImplementationError } from '../lib/errors';
import BaseDevice from '../lib/base_device';

import Modules from '../lib/loaders';
import ModuleDownloader from '../lib/downloader';

async function testBasic() {
    const metadata = toClassDef(await mockClient.getDeviceCode('com.herokuapp.lorem-rss'));

    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);
    const module = new (Modules['org.thingpedia.rss'])('com.herokuapp.lorem-rss', metadata, {}, downloader);

    assert.strictEqual(module.id, 'com.herokuapp.lorem-rss');
    assert.strictEqual(module.version, 1);

    const factory = await module.getDeviceClass();

    assert(factory.prototype instanceof BaseDevice);
    assert.strictEqual(typeof factory.prototype.get_feed, 'function');
    assert.strictEqual(typeof factory.prototype.subscribe_feed, 'function');

    const instance = new factory(mockEngine, {});

    const twenty_minutes_ago = new Date;
    twenty_minutes_ago.setTime(twenty_minutes_ago.getTime() - 20*60*1000);
    for (let item of await instance.get_feed({})) {
        assert(item.updated_time instanceof Date);
        assert(+item.updated_time >= +twenty_minutes_ago);
        assert(item.title.startsWith('Lorem ipsum '));
        assert(!!item.description);
        assert(item.link.startsWith('http://example.com'));
    }

    await new Promise((resolve, reject) => {
        let finished = false;
        setTimeout(() => {
            if (finished)
                resolve();
            else
                reject(new assert.AssertionError('Timed out'));
        }, 20000);

        const stream = instance.subscribe_feed({}, new State);
        let count = 0;
        stream.on('data', (item) => {
            try {
                if (finished)
                    assert.fail('too many results');
                delete item.__timestamp;
                assert(item.updated_time instanceof Date);
                assert(item.title.startsWith('Lorem ipsum '));
                assert(!!item.description);
                assert(item.link.startsWith('http://example.com'));
                count++;
                if (count === 10) {
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

    assert.strictEqual(typeof factory.prototype.subscribe_feed_nomonitor, 'function');
    assert.throws(() => instance.subscribe_feed_nomonitor({}, new State));

    const currentYear = (new Date).getUTCFullYear();
    // don't run this too close to midnight jan 1st...
    (await instance.get_feed_input({ unit: 'year' })).forEach((item, i) => {
        const i_years_ago = new Date(`${currentYear-i}-01-01T00:00:00.000Z`);
        assert(item.updated_time instanceof Date);
        assert(+item.updated_time === +i_years_ago);
        assert(item.title.startsWith('Lorem ipsum '));
        assert(!!item.description);
        assert(item.link.startsWith('http://example.com'));
    });
}

async function testBroken() {
    // test that devices with developer errors report sensible, localized and easy to
    // understand errors

    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);

    for (let err of ['hasaction', 'nosubscribe']) {
        const metadata = toClassDef(await mockClient.getDeviceCode('com.herokuapp.lorem-rss.broken.' + err));
        const module = new (Modules['org.thingpedia.rss'])('com.herokuapp.lorem-rss.broken.' + err,
            metadata, {}, downloader);

        // assert that we cannot actually load this device
        await assert.rejects(() => module.getDeviceClass(), ImplementationError);
    }
}

async function main() {
    await testBasic();
    await testBroken();
}

export default main;
if (!module.parent)
    main();
