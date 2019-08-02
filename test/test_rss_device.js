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

const { toClassDef, mockClient, mockPlatform, mockEngine, State } = require('./mock');
const { ImplementationError } = require('../lib/errors');
const BaseDevice = require('../lib/base_device');

const Modules = require('../lib/loaders');
const ModuleDownloader = require('../lib/downloader');

async function testBasic() {
    const metadata = toClassDef(await mockClient.getDeviceCode('com.herokuapp.lorem-rss'));

    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas);
    const module = new (Modules['org.thingpedia.rss'])('com.herokuapp.lorem-rss', metadata, downloader);

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
            } catch(e) { reject(e); }
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
                                                           metadata, downloader);

        // assert that we cannot actually load this device
        await assert.rejects(() => module.getDeviceClass(), ImplementationError);
    }
}

async function main() {
    await testBasic();
    await testBroken();
}

module.exports = main;
if (!module.parent)
    main();
