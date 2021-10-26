// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
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
import * as path from 'path';
import * as child_process from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as util from 'util';
import Gettext from 'node-gettext';
import * as gettextParser from 'gettext-parser';

import * as ThingTalk from 'thingtalk';
import BaseClient from '../lib/base_client';
import BasePlatform from '../lib/base_platform';
import BaseEngine from '../lib/base_engine';

const _unzipApi = {
    unzip(zipPath, dir) {
        let args = ['-uo', zipPath, '-d', dir];
        return new Promise((resolve, reject) => {
            child_process.execFile('unzip', args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
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

class MockClient extends BaseClient {
    async getModuleLocation(id) {
        if (id === 'com.xkcd')
            return 'https://d1ge76rambtuys.cloudfront.net/devices/com.xkcd-v91.zip';
        else
            throw new Error('invalid id ' + id);
    }

    async getDeviceCode(kind) {
        switch (kind) {
        case 'edu.stanford.almond-dev':
        case 'org.thingpedia.builtin.test.invalid':
        case 'org.thingpedia.test.mydevice':
        case 'org.thingpedia.test.pkgversion':
        case 'org.thingpedia.test.collection':
        case 'org.thingpedia.test.subdevice':
        case 'org.thingpedia.test.bluetooth':
        case 'org.thingpedia.test.interactive':
        case 'org.thingpedia.test.databasequery':
        case 'org.thingpedia.test.translatable':
        case 'org.thingpedia.test.proxied':
        case 'org.thingpedia.test.subclass':
        case 'org.thingpedia.test.parentclass':
        case 'org.thingpedia.test.broken':
        case 'org.thingpedia.test.broken.noquery':
        case 'org.thingpedia.test.broken.noaction':
        case 'org.thingpedia.test.broken.nosubscribe':
        case 'org.thingpedia.test.broken.databasequery1':
        case 'org.thingpedia.test.broken.databasequery2':
        case 'com.xkcd':
        case 'org.httpbin':
        case 'org.httpbin.oauth':
        case 'org.httpbin.basicauth':
        case 'org.httpbin.broken':
        case 'org.httpbin.form':
        case 'com.herokuapp.lorem-rss':
        case 'com.herokuapp.lorem-rss.broken.hasaction':
        case 'com.herokuapp.lorem-rss.broken.nosubscribe': {
            const pathname = path.resolve(path.dirname(module.filename),
                `./device-classes/${kind}.tt`);
            return util.promisify(fs.readFile)(pathname, { encoding: 'utf8' });
        }
        default:
            assert.fail('Invalid device ' + kind);
            // quiet eslint
            return null;
        }
    }

    async getSchemas(kinds) {
        return (await Promise.all(kinds.map((k) => this.getDeviceCode(k)))).join('\n');
    }

    async *invokeQuery(kind, uniqueId, name, params, hints) {
        if (kind === 'org.thingpedia.test.proxied') {
            assert.strictEqual(uniqueId, 'org.thingpedia.test.proxied');
            assert.strictEqual(name, 'test');
            assert.deepStrictEqual(params, {});

            yield { a: 'foo', b: 1 };
            yield { a: 'bar', b: 2 };
        } else {
            assert.fail('Invalid device ' + kind);
        }
    }
}

function loadTextdomainDirectory(gt, locale, domain, podir) {
    assert(fs.existsSync(podir));

    let split = locale.split(/[-_.@]/);
    let po = podir + '/' + split.join('_') + '.po';

    while (!fs.existsSync(po) && split.length) {
        split.pop();
        po = podir + '/' + split.join('_') + '.po';
    }
    if (split.length === 0) {
        console.error(`No translations found in ${domain} for locale ${locale}`);
        return;
    }
    try {
        let loaded = gettextParser.po.parse(fs.readFileSync(po), 'utf-8');
        gt.addTranslations(locale, domain, loaded);
    } catch(e) {
        console.log(`Failed to load translations for ${locale}/${domain}: ${e.message}`);
    }
}

class MockPreferences {
    constructor() {
        this._store = {};
    }

    get(name) {
        return this._store[name];
    }

    set(name, value) {
        console.log(`preferences set ${name} = ${value}`);
        this._store[name] = value;
    }
}

class MockPlatform extends BasePlatform {
    constructor(locale = 'en-US') {
        super();

        this._mockClient = new MockClient(this);

        this._locale = locale;
        this._gettext = new Gettext();
        this._gettext.setLocale(locale);
        if (this._locale !== 'en-US') {
            let modir = path.resolve(path.dirname(module.filename), './po');//'
            loadTextdomainDirectory(this._gettext, this._locale, 'thingengine-core', modir);
        }

        this._prefs = new MockPreferences();
    }

    get type() {
        return 'server';
    }
    get locale() {
        return this._locale;
    }
    get timezone() {
        return 'America/Los_Angeles';
    }

    getSharedPreferences() {
        return this._prefs;
    }
    getCacheDir() {
        return path.dirname(module.filename);
    }
    getTmpDir() {
        return os.tmpdir();
    }
    hasCapability(cap) {
        switch (cap) {
        case 'code-download':
        case 'thingpedia-client':
        case 'gettext':
            return true;
        default:
            return false;
        }
    }
    getCapability(cap) {
        switch (cap) {
        case 'code-download':
            return _unzipApi;
        case 'thingpedia-client':
            return this._mockClient;
        case 'gettext':
            return this._gettext;
        default:
            return null;
        }
    }
    getOrigin() {
        // like almond-server
        return 'http://127.0.0.1:3000';
    }
}
const mockPlatform = new MockPlatform();
const mockClient = mockPlatform.getCapability('thingpedia-client');

class MockEngine extends BaseEngine {
    get devices() {
        throw assert.fail('nothing should call this');
    }
    get apps() {
        throw assert.fail('nothing should call this');
    }
    get stats() {
        throw assert.fail('nothing should call this');
    }
}
const mockEngine = new MockEngine(mockPlatform);

class State {
    constructor() {
        this._state = {};
    }
    get(key) {
        return this._state[key];
    }
    set(key, value) {
        return this._state[key] = value;
    }
}

function toClassDef(classCode) {
    return ThingTalk.Syntax.parse(classCode).classes[0];
}

export {
    MockPreferences,
    MockPlatform,
    MockEngine,
    toClassDef,
    mockPlatform,
    mockClient,
    mockEngine,
    State
};
