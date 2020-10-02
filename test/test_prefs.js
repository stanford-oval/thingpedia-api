// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
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
import * as fs from 'fs';

import { FilePreferences } from '../lib/helpers';

function safeUnlinkSync(filename) {
    try {
        fs.unlinkSync(filename);
    } catch(e) {
        if (e.code !== 'ENOENT')
            throw e;
    }
}

async function testBasic() {
    safeUnlinkSync('./testprefs.json');
    const store1 = new FilePreferences('./testprefs.json');

    assert.strictEqual(store1.get('foo'), undefined);
    assert.deepStrictEqual(store1.keys(), []);

    store1.set('foo', '1');

    assert.strictEqual(store1.get('foo'), '1');
    assert.deepStrictEqual(store1.keys(), ['foo']);

    store1.set('foo', '2');

    assert.strictEqual(store1.get('foo'), '2');
    assert.deepStrictEqual(store1.keys(), ['foo']);

    store1.set('bar', 'a');

    assert.strictEqual(store1.get('bar'), 'a');
    assert.strictEqual(store1.get('foo'), '2');
    assert.deepStrictEqual(store1.keys(), ['foo', 'bar']);

    store1.delete('foo');

    assert.strictEqual(store1.get('foo'), undefined);
    assert.strictEqual(store1.get('bar'), 'a');
    assert.deepStrictEqual(store1.keys(), ['bar']);

    await store1.flush();
}

async function testReload() {
    const store2 = new FilePreferences('./testprefs.json');

    assert.strictEqual(store2.get('foo'), undefined);
    assert.strictEqual(store2.get('bar'), 'a');
    assert.deepStrictEqual(store2.keys(), ['bar']);
}

async function main() {
    await testBasic();
    await testReload();
}
export default main;
if (!module.parent)
    main();
