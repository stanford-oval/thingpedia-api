// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2018 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const path = require('path');
const child_process = require('child_process');
const os = require('os');

const Modules = require('../lib/modules');

const MyDevice = require('./device-classes/org.thingpedia.test.mydevice');

const metadata = {
    primary_kind: 'org.thingpedia.test.mydevice',
    version: 1,

    queries: {
        something: {
            args: [{
                name: 'v1',
                type: 'String'
            }, {
                name: 'v2',
                type: 'Number'
            }],
            poll_interval: 0
        },
        something_poll: {
            args: [{
                name: 'v1',
                type: 'String'
            }, {
                name: 'v2',
                type: 'Number'
            }],
            poll_interval: 1000
        }
    },
    actions: {
        something_else: {
            args: [{
                name: 'v3',
                type: 'String'
            }],
        }
    }
};

const _unzipApi = {
    unzip(zipPath, dir) {
        var args = ['-uo', zipPath, '-d', dir];
        return new Promise((resolve, reject) => {
            child_process.execFile('/usr/bin/unzip', args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                if (err)
                    reject(err);
                else
                    resolve([stdout, stderr]);
            });
        }).then(([stdout, stderr]) => {
            console.log('stdout', stdout);
            console.log('stderr', stderr);
        });
    }
};

const mockPlatform = {
    getCacheDir() {
        return path.dirname(module.filename);
    },
    getTmpDir() {
        return os.tmpdir();
    },
    hasCapability(cap) {
        switch (cap) {
        case 'code-download':
            return true;
        default:
            return false;
        }
    },
    getCapability(cap) {
        switch (cap) {
        case 'code-download':
            return _unzipApi;
        default:
            return null;
        }
    }
};

const mockClient = {
    getModuleLocation(id) {
        if (id === 'com.xkcd')
            return Promise.resolve('https://d1ge76rambtuys.cloudfront.net/devices/com.xkcd-v91.zip');
        else
            throw new Error('invalid id');
    }
};

function testPreloaded() {
    const module = new (Modules['org.thingpedia.v2'])('org.thingpedia.test.mydevice', metadata, mockPlatform, mockClient);

    assert.strictEqual(module.id, 'org.thingpedia.test.mydevice');
    assert.strictEqual(module.version, 1);
    assert.strictEqual(module.manifest, metadata);

    return module.getDeviceFactory().then((factory) => {
        assert.strictEqual(factory, MyDevice);
        assert.strictEqual(factory.metadata, metadata);
        assert.deepStrictEqual(factory.require('package.json'), {"name":"org.thingpedia.test.mydevice",
            "main": "index.js",
            "thingpedia-version":1
        });

        const engine = {};
        const d = new factory(engine, { kind: 'org.thingpedia.test.mydevice' });
        assert.strictEqual(typeof d.get_something, 'function');
        assert.strictEqual(typeof d.get_something_poll, 'function');
        assert.strictEqual(typeof d.subscribe_something, 'function');
        assert.strictEqual(typeof d.subscribe_something_poll, 'function');
        assert.strictEqual(typeof d.history_something, 'function');
        assert.strictEqual(typeof d.history_something_poll, 'function');
        assert.strictEqual(typeof d.sequence_something, 'function');
        assert.strictEqual(typeof d.sequence_something_poll, 'function');
        assert.strictEqual(typeof d.do_something_else, 'function');

        return module.clearCache();
    }).then(() => {
        return module.getDeviceFactory();
    }).then((factory2) => {
        assert(factory2 !== MyDevice);
    });
}

function testThingpedia() {
    child_process.spawnSync('rm', ['-rf', mockPlatform.getCacheDir() + '/device-classes/com.xkcd']);

    const metadata = require('./com.xkcd.json');

    const module = new (Modules['org.thingpedia.v2'])('com.xkcd', metadata, mockPlatform, mockClient);

    assert.strictEqual(module.id, 'com.xkcd');
    assert(module.version >= 91);
    assert.strictEqual(module.manifest, metadata);

    return module.getDeviceFactory().then((factory) => {
        assert.strictEqual(factory.metadata, metadata);
        assert.strictEqual(typeof factory.prototype.get_get_comic, 'function');
        assert.strictEqual(typeof factory.prototype.get_random_comic, 'function');
    });
}

function main() {
    return Promise.all([
        testPreloaded(),
        testThingpedia(),
    ]);
}
module.exports = main;
if (!module.parent)
    main();
