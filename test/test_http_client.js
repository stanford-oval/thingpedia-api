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


import './mock';

import assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as ThingTalk from 'thingtalk';

import HttpClient from '../lib/http_client';

import { MockPreferences } from './mock';

const _mockPlatform = {
    _prefs: new MockPreferences,

    getDeveloperKey() {
        return null;
    },

    getSharedPreferences() {
        return this._prefs;
    },

    getCacheDir() {
        return path.dirname(module.filename);
    },

    get locale() {
        return 'en-US';
    }
};
const _mockDeveloperPlatform = {
    _prefs: new MockPreferences,

    getDeveloperKey() {
        // almond-dev developer key
        return '88c03add145ad3a3aa4074ffa828be5a391625f9d4e1d0b034b445f18c595656';
    },

    getSharedPreferences() {
        return this._prefs;
    },

    getCacheDir() {
        return path.dirname(module.filename);
    },

    get locale() {
        return 'en-US';
    }
};
const THINGPEDIA_URL = process.env.THINGPEDIA_URL || 'https://dev.almond.stanford.edu/thingpedia';

const _mockLocalDeveloperPlatform = {
    _prefs: new MockPreferences,

    getDeveloperKey() {
        // no developer key
        return null;
    },

    getSharedPreferences() {
        return this._prefs;
    },

    getCacheDir() {
        return path.dirname(module.filename);
    },

    get locale() {
        return 'en-US';
    }
};
_mockLocalDeveloperPlatform._prefs.set('developer-dir', path.resolve(path.dirname(module.filename), './developer-dir'));

const _mockItalianLocalDeveloperPlatform = {
    _prefs: new MockPreferences,

    getDeveloperKey() {
        // no developer key
        return null;
    },

    getSharedPreferences() {
        return this._prefs;
    },

    getCacheDir() {
        return path.dirname(module.filename);
    },

    get locale() {
        return 'it-IT';
    }
};
_mockItalianLocalDeveloperPlatform._prefs.set('developer-dir', path.resolve(path.dirname(module.filename), './developer-dir'));

const _httpClient = new HttpClient(_mockPlatform, THINGPEDIA_URL);
const _schemaRetriever = new ThingTalk.SchemaRetriever(_httpClient, null, true);
const _developerHttpClient = new HttpClient(_mockDeveloperPlatform, THINGPEDIA_URL);
const _localDeveloperHttpClient = new HttpClient(_mockLocalDeveloperPlatform, THINGPEDIA_URL);
const _italianLocalDeveloperHttpClient = new HttpClient(_mockItalianLocalDeveloperPlatform, THINGPEDIA_URL);
//const _developerSchemaRetriever = new ThingTalk.SchemaRetriever(_developerHttpClient, null, true);

async function checkValidManifest(manifest, moduleType) {
    const parsed = await ThingTalk.Syntax.parse(manifest).typecheck(_schemaRetriever);
    assert(parsed.isLibrary);
    assert.strictEqual(parsed.classes.length, 1);
    assert.strictEqual(parsed.datasets.length, 0);

    const classDef = parsed.classes[0];
    assert.strictEqual(classDef.loader.module, moduleType);
    assert(classDef.annotations.version.isNumber);
}

async function testGetDeviceCode() {
    const nytimes = await _httpClient.getDeviceCode('org.thingpedia.rss');
    await checkValidManifest(nytimes, 'org.thingpedia.rss');

    const bing = await _httpClient.getDeviceCode('com.bing');
    await checkValidManifest(bing, 'org.thingpedia.v2');

    const test = await _httpClient.getDeviceCode('org.thingpedia.builtin.test');
    await checkValidManifest(test, 'org.thingpedia.builtin');

    await assert.rejects(async () => {
        await _httpClient.getDeviceCode('org.thingpedia.builtin.test.invisible');
    });
    const invisibleTest = await _developerHttpClient.getDeviceCode('org.thingpedia.builtin.test.invisible');
    await checkValidManifest(invisibleTest, 'org.thingpedia.builtin');

    await assert.rejects(async () => {
        await _httpClient.getDeviceCode('org.thingpedia.builtin.test.nonexistent');
    });
}

async function testGetModuleLocation() {
    const test = await _httpClient.getModuleLocation('com.bing');
    assert(/^.*\/com\.bing-v[0-9]+\.zip$/.test(test),
        'Invalid response, got ' + test);

    // builtin.test is not downloadable
    await assert.rejects(async () => {
        await _httpClient.getModuleLocation('org.thingpedia.builtin.test');
    });

    await assert.rejects(async () => {
        await _httpClient.getModuleLocation('org.thingpedia.builtin.test.invisible');
    });

    await assert.rejects(async () => {
        await _httpClient.getModuleLocation('org.thingpedia.builtin.test.nonexistent');
    });
}

async function testGetSchemas(withMetadata) {
    const bing = await _httpClient.getSchemas(['com.bing'], withMetadata);
    const bingparsed = ThingTalk.Syntax.parse(bing);
    assert(bingparsed.isLibrary);
    assert.strictEqual(bingparsed.classes.length, 1);
    assert.strictEqual(bingparsed.classes[0].kind, 'com.bing');

    const multiple = await _httpClient.getSchemas(['com.bing', 'com.twitter'], withMetadata);
    const mparsed = ThingTalk.Syntax.parse(multiple);
    assert(mparsed.isLibrary);
    assert.strictEqual(mparsed.classes.length, 2);
    assert.strictEqual(mparsed.classes[0].kind, 'com.bing');
    assert.strictEqual(mparsed.classes[1].kind, 'com.twitter');

    assert(multiple.startsWith(bing));

    const invisible = await _httpClient.getSchemas(['org.thingpedia.builtin.test.invisible'], withMetadata);
    assert.deepStrictEqual(invisible, ``);

    const invisible2 = await _developerHttpClient.getSchemas(['org.thingpedia.builtin.test.invisible'], withMetadata);
    const invparsed = ThingTalk.Syntax.parse(invisible2);
    assert(invparsed.isLibrary);
    assert.strictEqual(invparsed.classes.length, 1);
    assert.strictEqual(invparsed.classes[0].kind, 'org.thingpedia.builtin.test.invisible');

    const nonexistent = await _httpClient.getSchemas(['org.thingpedia.builtin.test.nonexistent'], withMetadata);
    assert.deepStrictEqual(nonexistent, ``);

    const mixed = await _httpClient.getSchemas(['com.bing', 'org.thingpedia.builtin.test.invisible', 'org.thingpedia.builtin.test.nonexistent'], withMetadata);
    assert.deepStrictEqual(mixed, bing);
}

function assertNonEmptyString(what) {
    assert(typeof what === 'string' && what, 'Expected a non-empty string, got ' + what);
}

async function testGetDeviceList(klass) {
    const publicDevices = new Set;

    const page0 = await _httpClient.getDeviceList(klass);

    // negative values for page are the same as ignored
    const pageMinusOne = await _httpClient.getDeviceList(klass, -1);
    assert.deepStrictEqual(pageMinusOne, page0);

    for (let i = 0; ; i++) {
        const page = await _httpClient.getDeviceList(klass, i, 10);
        if (i === 0)
            assert.deepStrictEqual(page, page0);
        for (let j = 0; j < Math.min(page.length, 10); j++) {
            const device = page[j];
            assertNonEmptyString(device.name);
            assertNonEmptyString(device.description);
            assertNonEmptyString(device.primary_kind);
            assertNonEmptyString(device.category);
            assertNonEmptyString(device.subcategory);
            if (klass)
                assert.deepStrictEqual(device.category, klass);

            // no duplicates
            assert(!publicDevices.has(device.primary_kind));
            publicDevices.add(device.primary_kind);
        }
        if (page.length <= 10)
            break;
    }

    const developerDevices = new Set;

    for (let i = 0; ; i++) {
        const page = await _developerHttpClient.getDeviceList(klass, i, 10);
        for (let j = 0; j < Math.min(page.length, 10); j++) {
            const device = page[j];
            assert(!developerDevices.has(device.primary_kind));
            developerDevices.add(device.primary_kind);
        }
        if (page.length <= 10)
            break;
    }

    // every public device should be a developer device
    // this is a quick and dirty way to catch pagination errors
    for (let pubDevice of publicDevices) {
        assert(developerDevices.has(pubDevice),
            'Lost device ' + pubDevice);
    }
}

function objectEqual(o1, o2) {
    if (typeof o1 !== typeof o2)
        return false;
    if (typeof o1 !== 'object') {
        if (o1 === 'URL' && o2 === 'Entity(tt:url)')
            return true;
        if (o1 !== o2)
            console.log(o1, o2);
        return o1 === o2;
    }
    let fields = Object.keys(o1);
    for (let i = 0; i < fields.length; i++) {
        let field = fields[i];
        if (field === 'confirmation_remote' || field === 'API Endpoint URL')
            continue;
        if (!(field in o2)) {
            console.log(`missing field ${field}`);
            return false;
        }
        if (Array.isArray(o1[field]) && !arrayEqual(o1[field], o2[field]))
            return false;
        if (!objectEqual(o1[field], o2[field]))
            return false;
    }
    return true;
}

function arrayEqual(a1, a2) {
    if (!Array.isArray(a1) || !Array.isArray(a2))
        return false;
    if (a1.length !== a2.length)
        return false;
    for (let i = 0; i < a1.length; i++) {
        if (!objectEqual(a1[i], a2[i]))
            return false;
    }
    return true;
}

async function testGetDeviceListErrorCases() {
    await assert.rejects(() => _httpClient.getDeviceList('foo'));
}

async function testGetDeviceFactories(klass) {
    const devices = await _httpClient.getDeviceFactories(klass);

    for (let factory of devices) {
        assertNonEmptyString(factory.kind);
        assertNonEmptyString(factory.text);
        assert(['none', 'discovery', 'interactive', 'form', 'oauth2'].indexOf(factory.type) >= 0, 'Invalid factory type ' + factory.type + ' for ' + factory.kind);
    }
}

async function testGetDeviceFactoriesErrorCases() {
    await assert.rejects(() => _httpClient.getDeviceFactories('foo'));
}

async function testGetDeviceSetup() {
    const single = await _httpClient.getDeviceSetup(['com.bing']);

    assert.deepStrictEqual(single, {
        'com.bing': {
            kind: 'com.bing',
            category: 'data',
            type: 'none',
            text: "Bing Search"
        }
    });

    const multiple = await _httpClient.getDeviceSetup(['com.bing', 'com.twitter']);
    assert.deepStrictEqual(multiple, {
        'com.bing': {
            kind: 'com.bing',
            category: 'data',
            type: 'none',
            text: "Bing Search"
        },
        'com.twitter': {
            kind: 'com.twitter',
            category: 'online',
            type: 'oauth2',
            text: "Twitter"
        }
    });

    const nosetup = await _httpClient.getDeviceSetup(['com.bing', 'org.thingpedia.builtin.test']);
    assert.deepStrictEqual(nosetup, {
        'com.bing': {
            kind: 'com.bing',
            category: 'data',
            type: 'none',
            text: "Bing Search"
        },
        'org.thingpedia.builtin.test': {
            type: 'multiple',
            text: 'Test Device',
            choices: []
        }
    });

    const nonexistent = await _httpClient.getDeviceSetup(['org.thingpedia.builtin.test.nonexistent']);
    assert.deepStrictEqual(nonexistent, {
        'org.thingpedia.builtin.test.nonexistent': {
            type: 'multiple',
            text: 'org.thingpedia.builtin.test.nonexistent',
            choices: []
        }
    });

    const local = await _localDeveloperHttpClient.getDeviceSetup(['com.example.test']);
    assert.deepStrictEqual(local, {
        'com.example.test': {
            category: 'data',
            kind: 'com.example.test',
            type: 'none',
            text: 'Test'
        }
    });
}

async function testGetKindByDiscovery() {
    // malformed requests
    await assert.rejects(() => _developerHttpClient.getKindByDiscovery({}));
    await assert.rejects(() => _developerHttpClient.getKindByDiscovery({
        kind: 'invalid'
    }));
    await assert.rejects(() => _developerHttpClient.getKindByDiscovery({
        kind: 'bluetooth',
        uuids: null,
        class: null
    }));

    const bluetoothSpeaker = await _developerHttpClient.getKindByDiscovery({
        kind: 'bluetooth',
        uuids: ['0000110b-0000-1000-8000-00805f9b34fb'],
        class: 0
    });
    assert.deepStrictEqual(bluetoothSpeaker, 'org.thingpedia.bluetooth.speaker.a2dp');

    const lgTv = await _developerHttpClient.getKindByDiscovery({
        kind: 'upnp',
        name: '',
        deviceType: '',
        modelUrl: null,
        st: ['urn:lge:com:service:webos:second-screen-1'],
        class: 0
    });
    assert.deepStrictEqual(lgTv, 'com.lg.tv.webos2');

    assert.rejects(() => _developerHttpClient.getKindByDiscovery({
        kind: 'upnp',
        name: '',
        deviceType: '',
        modelUrl: null,
        st: ['urn:thingpedia.com:invalid'],
        class: 0
    }));
}

async function testGetExamples() {
    function checkKinds(program, kinds) {
        for (let [, prim] of program.iteratePrimitives()) {
            if (prim.selector.isBuiltin)
                continue;
            assert(kinds.indexOf(prim.selector.kind) >= 0);
        }
    }

    const byKey = ThingTalk.Syntax.parse(await _httpClient.getExamplesByKey('twitter'));
    assert(byKey.isLibrary);
    assert.strictEqual(byKey.classes.length, 0);
    assert.strictEqual(byKey.datasets.length, 1);

    for (let ex of byKey.datasets[0].examples) {
        assert.deepStrictEqual(typeof ex.id, 'number');
        assert(ex.utterances.length > 0);
        ex.utterances.forEach((u) => assertNonEmptyString(u));
        assert.strictEqual(ex.utterances.length, ex.preprocessed.length);
        ex.preprocessed.forEach((p) => assertNonEmptyString(p));
    }

    const byKindsSingle = ThingTalk.Syntax.parse(await _httpClient.getExamplesByKinds(['com.twitter']));
    assert(byKindsSingle.isLibrary);
    assert.strictEqual(byKindsSingle.classes.length, 0);
    assert.strictEqual(byKindsSingle.datasets.length, 1);

    for (let ex of byKindsSingle.datasets[0].examples) {
        assert.deepStrictEqual(typeof ex.id, 'number');
        assert(ex.utterances.length > 0);
        ex.utterances.forEach((u) => assertNonEmptyString(u));
        assert.strictEqual(ex.utterances.length, ex.preprocessed.length);
        ex.preprocessed.forEach((p) => assertNonEmptyString(p));
        checkKinds(ex.value, ['com.twitter']);
    }

    const byKindsMultiple = ThingTalk.Syntax.parse(await _httpClient.getExamplesByKinds(['com.twitter', 'com.bing']));
    assert(byKindsMultiple.isLibrary);
    assert.strictEqual(byKindsMultiple.classes.length, 0);
    assert.strictEqual(byKindsMultiple.datasets.length, 1);

    for (let ex of byKindsMultiple.datasets[0].examples) {
        assert.deepStrictEqual(typeof ex.id, 'number');
        assert(ex.utterances.length > 0);
        ex.utterances.forEach((u) => assertNonEmptyString(u));
        assert.strictEqual(ex.utterances.length, ex.preprocessed.length);
        ex.preprocessed.forEach((p) => assertNonEmptyString(p));
        checkKinds(ex.value, ['com.twitter', 'com.bing']);
    }
}


async function testLookupEntity() {
    const entity = await _localDeveloperHttpClient.lookupEntity('com.example:my_entity', 'alice');

    assert.deepStrictEqual(entity, {
        data: [
            {
                name: "Entity Alice",
                value: "1",
                canonical: "entity alice",
                type: 'com.example:my_entity'
            }
        ],
        meta: {
            has_ner_support: true,
            is_well_known: false,
            name: 'com.example:my_entity'
        }
    });

    const entity2 = await _localDeveloperHttpClient.lookupEntity('com.yelp:restaurant_cuisine', 'italian');

    assert.deepStrictEqual(entity2, {
        data: [
            {
                name: "Italian",
                value: "italian",
                canonical: "italian",
                type: 'com.yelp:restaurant_cuisine'
            }
        ],
        meta: {
            has_ner_support: 1,
            is_well_known: 0,
            name: 'Cuisines in Yelp'
        },
        result: 'ok'
    });
}

async function testLookupLocation() {
    const data = await _httpClient.lookupLocation('seattle');
    console.log(data);

    let found = false;
    for (let loc of data) {
        assert.strictEqual(typeof loc.latitude, 'number');
        assert.strictEqual(typeof loc.longitude, 'number');
        assert.strictEqual(typeof loc.display, 'string');
        assert.strictEqual(typeof loc.canonical, 'string');
        assert.strictEqual(typeof loc.rank, 'number');
        assert.strictEqual(typeof loc.importance, 'number');

        if (loc.display === 'Seattle, Washington') {
            assert(Math.abs(loc.latitude - 47.6038321) < 1e-6);
            assert(Math.abs(loc.longitude - -122.3300624) < 1e-6);
            assert.strictEqual(loc.canonical, 'seattle , washington');
            assert.strictEqual(loc.rank, 16);
            found = true;
        }
    }
    assert(found);
}

async function testDeviceNames() {
    const all = await _httpClient.getAllDeviceNames();

    assert(Array.isArray(all));
    for (let name of all) {
        assert(name.kind && typeof name.kind === 'string');
        assert(name.kind_canonical && typeof name.kind_canonical === 'string');
    }
}

async function testGetEntities() {
    const all = await _httpClient.getAllEntityTypes();

    assert(Array.isArray(all));
    for (let entity of all) {
        assertNonEmptyString(entity.type);
        assertNonEmptyString(entity.name);
        // the API is not consistent on this...
        assert(typeof entity.has_ner_support === 'boolean' || typeof entity.has_ner_support === 'number');
        assert(typeof entity.is_well_known === 'boolean' || typeof entity.is_well_known === 'number');
        assert(!entity.is_well_known || entity.type.startsWith('tt:'));
    }
}

async function testSearchDevices() {
    const devices = await _httpClient.searchDevice('home assistant');

    assert.deepStrictEqual(devices, [{
        primary_kind: "io.home-assistant",
        name: "Home Assistant",
        description: "Integrate your Almond with Home Assistant to control your home with voice.",
        category: "online",
        website: "https://home-assistant.io",
        repository: "",
        issue_tracker: "",
        license: "BSD-3-Clause",
        subcategory: "home"
    }, {
        category: 'system',
        description: 'Interface for Home Assistant Media Player.',
        issue_tracker: '',
        license: 'BSD-3-Clause',
        name: 'Home Assistant Media Player',
        primary_kind: 'org.thingpedia.iot.media-player',
        repository: '',
        subcategory: 'home',
        website: ''
    }]);
}

async function testLocalGetDeviceCode() {
    const deviceCode = await _localDeveloperHttpClient.getDeviceCode('com.example.test');

    assert.strictEqual(deviceCode, `class @com.example.test
#_[name="Test"]
#_[description="Test Device"]
#[version=-1] {
  import loader from @org.thingpedia.v2();

  import config from @org.thingpedia.config.none(api_key="my-secret-test-key");
}`);

    const deviceCode2 = await _localDeveloperHttpClient.getDeviceCode('com.example.translated');

    assert.strictEqual(deviceCode2, `class @com.example.translated
#_[name="Test"]
#_[description="Test device that is translated"]
#[version=-1] {
  import loader from @org.thingpedia.v2();

  query article()
  #_[canonical=["article", "news article"]]
  #[minimal_projection=[]];
}`);

    const deviceCode3 = await _italianLocalDeveloperHttpClient.getDeviceCode('com.example.translated');

    assert.strictEqual(deviceCode3, `class @com.example.translated
#_[name="Test"]
#_[description="Dispositivo di test tradotto"]
#[version=-1] {
  import loader from @org.thingpedia.v2();

  query article()
  #_[canonical=["articolo", "articolo delle notizie"]]
  #[minimal_projection=[]];
}`);
}

async function main() {
    // remove any cached file, if any
    try {
        fs.unlinkSync(path.dirname(module.filename) + '/snapshot.tt');
    } catch(e) {
        // ignore errors
    }

    await testGetDeviceCode();
    await testLocalGetDeviceCode();
    await testGetModuleLocation();
    await testGetSchemas(false);
    await testGetSchemas(true);

    await testGetDeviceList();
    await testGetDeviceList('online');
    await testGetDeviceList('physical');
    await testGetDeviceList('data');
    await testGetDeviceList('system');
    await testGetDeviceListErrorCases();
    await testSearchDevices();

    await testGetDeviceFactories();
    await testGetDeviceFactories('online');
    await testGetDeviceFactories('physical');
    await testGetDeviceFactories('data');
    await testGetDeviceFactories('system');
    await testGetDeviceFactoriesErrorCases();

    await testGetDeviceSetup();
    await testGetKindByDiscovery();
    await testGetExamples();

    await testLookupLocation();
    await testLookupEntity();

    await testGetEntities();

    await testDeviceNames();
}

export default main;
if (!module.parent)
    main();
