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
const fs = require('fs');

const FilePreferences = require('../lib/helpers').FilePreferences;

function safeUnlinkSync(filename) {
    try {
        fs.unlinkSync(filename);
    } catch(e) {
        if (e.code !== 'ENOENT')
            throw e;
    }
}

async function testBasic() {
    safeUnlinkSync('./test.json');
    const store1 = new FilePreferences('./test.json');

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
    const store2 = new FilePreferences('./test.json');

    assert.strictEqual(store2.get('foo'), undefined);
    assert.strictEqual(store2.get('bar'), 'a');
    assert.deepStrictEqual(store2.keys(), ['bar']);
}

async function main() {
    await testBasic();
    await testReload();
}
module.exports = main;
if (!module.parent)
    main();
