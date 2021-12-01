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


import './mock';

import assert from 'assert';
import * as ThingTalk from 'thingtalk';
import * as path from 'path';

import FileClient from '../lib/file_thingpedia_client';

const _fileClient = new FileClient({
    locale: 'en-US',

    thingpedia: path.resolve(path.dirname(module.filename), './data/thingpedia.tt'),
    entities: path.resolve(path.dirname(module.filename), './data/entities.json'),
    dataset: path.resolve(path.dirname(module.filename), './data/dataset.tt'),
    parameter_datasets: path.resolve(path.dirname(module.filename), './developer-dir/parameter-datasets.tsv'),
});
const _schemaRetriever = new ThingTalk.SchemaRetriever(_fileClient, null, true);

async function checkValidManifest(manifest, moduleType) {
    const parsed = await ThingTalk.Syntax.parse(manifest).typecheck(_schemaRetriever);
    assert(parsed.isLibrary);
    assert.strictEqual(parsed.classes.length, 1);
    assert.strictEqual(parsed.datasets.length, 0);
}

async function testGetDeviceCode() {
    const nytimes = await _fileClient.getDeviceCode('com.nytimes');
    await checkValidManifest(nytimes, 'org.thingpedia.rss');

    const bing = await _fileClient.getDeviceCode('com.bing');
    await checkValidManifest(bing, 'org.thingpedia.v2');

    const test = await _fileClient.getDeviceCode('org.thingpedia.builtin.test');
    await checkValidManifest(test, 'org.thingpedia.builtin');
}

async function testGetSchemas(withMetadata) {
    const bing = await _fileClient.getSchemas(['com.bing'], withMetadata);
    const bingparsed = ThingTalk.Syntax.parse(bing);
    assert(bingparsed.isLibrary);
    assert(bingparsed.classes.length >= 1);
    assert(bingparsed.classes.find((c) => c.kind === 'com.bing'));

    const multiple = await _fileClient.getSchemas(['com.bing', 'com.twitter'], withMetadata);
    const mparsed = ThingTalk.Syntax.parse(multiple);
    assert(mparsed.isLibrary);
    assert(mparsed.classes.length >= 2);
    assert(mparsed.classes.find((c) => c.kind === 'com.bing'));
    assert(mparsed.classes.find((c) => c.kind === 'com.twitter'));
}

function assertNonEmptyString(what) {
    assert(typeof what === 'string' && what, 'Expected a non-empty string, got ' + what);
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

async function testGetExamples() {
    const all = ThingTalk.Syntax.parse(await _fileClient.getAllExamples());
    assert(all.isLibrary);
    assert.strictEqual(all.classes.length, 0);
    assert.strictEqual(all.datasets.length, 1);

    for (let ex of all.datasets[0].examples) {
        assert.deepStrictEqual(typeof ex.id, 'number');
        assert(ex.utterances.length > 0);
        ex.utterances.forEach((u) => assertNonEmptyString(u));
        assert.strictEqual(ex.utterances.length, ex.preprocessed.length);
        ex.preprocessed.forEach((p) => assertNonEmptyString(p));
    }

    const bing = ThingTalk.Syntax.parse(await _fileClient.getExamplesByKinds(['com.bing', 'com.google']));
    assert(bing.isLibrary);
    assert.strictEqual(bing.classes.length, 0);
    assert.strictEqual(bing.datasets.length, 1);

    for (let ex of bing.datasets[0].examples) {
        assert.deepStrictEqual(typeof ex.id, 'number');
        assert(ex.utterances.length > 0);
        ex.utterances.forEach((u) => assertNonEmptyString(u));
        assert.strictEqual(ex.utterances.length, ex.preprocessed.length);
        ex.preprocessed.forEach((p) => assertNonEmptyString(p));
    }
}

async function testGetEntities() {
    const all = await _fileClient.getAllEntityTypes();

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

async function testGetDeviceList(klass) {
    const publicDevices = new Set;

    const page0 = await _fileClient.getDeviceList(klass);

    for (let i = 0; ; i++) {
        const page = await _fileClient.getDeviceList(klass, i, 10);
        if (i === 0)
            assert.deepStrictEqual(page, page0);
        for (let j = 0; j < Math.min(page.length, 10); j++) {
            const device = page[j];
            assertNonEmptyString(device.name);
            assert.strictEqual(typeof device.description, 'string');
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
}

async function testSearchDevices() {
    const devices = await _fileClient.searchDevice('facebook');

    assert.deepStrictEqual(devices, [{
        primary_kind: "com.facebook",
        name: "Facebook",
        description: "Connect to Facebook on Almond.",
        category: "data",
        website: "https://www.facebook.com",
        repository: "",
        issue_tracker: "",
        license: "CC0",
        subcategory: "social_network"
    }]);
}

async function testLookupEntity() {
    const entity = await _fileClient.lookupEntity('com.example:my_entity', 'alice');

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
}

async function main() {
    await testGetDeviceCode();
    await testGetSchemas(false);
    await testGetSchemas(true);

    await testGetExamples();
    await testGetEntities();

    await testGetDeviceList();
    await testSearchDevices();

    await testLookupEntity();
}

export default main;
if (!module.parent)
    main();
