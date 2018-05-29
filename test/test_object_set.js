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

const events = require('events');
const assert = require('assert');

const ObjectSet = require('../lib/object_set');

function timeout(delay) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), delay);
    });
}

class Custom extends ObjectSet.Base {
    add(o) {
        this.objectAdded(o);
    }
    remove(o) {
        this.objectRemoved(o);
    }
}

function testCustom() {
    const obj = new Custom();
    assert(obj instanceof events.EventEmitter);

    const value = {};
    let cnt = 0;
    obj.on('object-added', (v) => {
        assert.strictEqual(v, value);
        cnt++;
    });
    obj.add(value);
    assert(cnt === 1);

    let cnt2 = 0;
    obj.on('object-removed', (v) => {
        assert.strictEqual(v, value);
        cnt2++;
    });
    obj.remove(value);

    assert(cnt === 1);
    assert(cnt2 === 1);
}

function testSimple() {
    const obj = new ObjectSet.Simple();
    assert(obj instanceof ObjectSet.Base);
    assert(obj instanceof events.EventEmitter);

    const v1 = {
        uniqueId: 'uuid-v1'
    };
    const v2 = {
        uniqueId: 'uuid-v2'
    };

    assert.deepStrictEqual(obj.values(), []);

    obj.addOne(v1);
    assert.deepStrictEqual(obj.values(), [v1]);

    obj.removeOne(v2);
    assert.deepStrictEqual(obj.values(), [v1]);

    obj.removeOne(v1);
    assert.deepStrictEqual(obj.values(), []);
}

function testAsync() {
    const obj = new ObjectSet.Simple();
    assert(obj instanceof ObjectSet.Base);
    assert(obj instanceof events.EventEmitter);

    const v1 = {
        uniqueId: 'uuid-v1'
    };

    assert.deepStrictEqual(obj.values(), []);

    obj.addOne(timeout(100).then(() => v1)).then(() => {
        assert.deepStrictEqual(obj.values(), [v1]);
    });
    assert.deepStrictEqual(obj.values(), []);
}

function testClear() {
    const obj = new ObjectSet.Simple();
    assert(obj instanceof ObjectSet.Base);
    assert(obj instanceof events.EventEmitter);

    const v1 = {
        uniqueId: 'uuid-v1'
    };
    const v2 = {
        uniqueId: 'uuid-v2'
    };

    assert.deepStrictEqual(obj.values(), []);

    obj.addOne(v1);
    obj.addOne(v2);
    assert.deepStrictEqual(obj.values(), [v1, v2]);

    obj.removeAll();
    assert.deepStrictEqual(obj.values(), []);
}

function testRemoveIf() {
    const obj = new ObjectSet.Simple();
    assert(obj instanceof ObjectSet.Base);
    assert(obj instanceof events.EventEmitter);

    const v1 = {
        uniqueId: 'uuid-v1'
    };
    const v2 = {
        uniqueId: 'uuid-v2'
    };

    assert.deepStrictEqual(obj.values(), []);

    obj.addOne(v1);
    obj.addOne(v2);
    assert.deepStrictEqual(obj.values(), [v1, v2]);

    obj.removeIf((v) => v.uniqueId.indexOf('2') >= 0);

    assert.deepStrictEqual(obj.values(), [v1]);
}

function testById() {
    const obj = new ObjectSet.Simple();
    assert(obj instanceof ObjectSet.Base);
    assert(obj instanceof events.EventEmitter);

    const v1 = {
        uniqueId: 'uuid-v1'
    };
    const v2 = {
        uniqueId: 'uuid-v2'
    };

    assert.deepStrictEqual(obj.values(), []);

    obj.addOne(v1);
    assert.deepStrictEqual(obj.values(), [v1]);

    obj.removeById(v2.uniqueId);
    assert.deepStrictEqual(obj.values(), [v1]);

    obj.removeById(v1.uniqueId);

    assert.deepStrictEqual(obj.values(), []);
}

function main() {
    return Promise.all([
        testCustom(),
        testSimple(),
        testById(),
        testAsync(),
        testClear(),
        testRemoveIf(),
    ]);
}
module.exports = main;
if (!module.parent)
    main();
