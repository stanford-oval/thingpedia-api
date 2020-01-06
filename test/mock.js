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
const fs = require('fs');
const util = require('util');
const Gettext = require('node-gettext');
const gettextParser = require('gettext-parser');

const ThingTalk = require('thingtalk');
const BaseClient = require('../lib/base_client');
const BasePlatform = require('../lib/base_platform');
const BaseEngine = require('../lib/base_engine');

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
    return ThingTalk.Grammar.parse(classCode).classes[0];
}

module.exports = { MockPlatform, MockEngine, toClassDef, mockPlatform, mockClient, mockEngine, State };
