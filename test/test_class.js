// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2017-2019 The Board of Trustees of the Leland Stanford Junior University
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

import BaseDevice from '../lib/base_device';

class MyDevice1 extends BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        assert(Array.isArray(this.descriptors));
        assert.strictEqual(this._engine, engine);
        assert.strictEqual(this.platform, engine.platform);
        assert.strictEqual(this.state, state);
        assert.strictEqual(this.uniqueId, 'com.foo');
        assert.strictEqual(this.name, 'My Device 1');
        assert.strictEqual(this.description, 'This is the first device');
    }
}
MyDevice1.metadata = {
    types: ['fooable'],
    child_types: [],
    category: 'data',
    params: {},
    name: 'My Device 1',
    description: 'This is the first device',

    auth: { type: 'none' }
};

class MyDevice2 extends BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        assert(Array.isArray(this.descriptors));
        assert.strictEqual(this._engine, engine);
        assert.strictEqual(this.platform, engine.platform);
        assert.strictEqual(this.state, state);
        assert.strictEqual(this.uniqueId, 'com.bar-url:http://www.google.com');
        assert.strictEqual(this.name, 'My Device 2');
        assert.strictEqual(this.description, 'This is the second device');
    }
}
MyDevice2.metadata = {
    types: [],
    child_types: [],
    category: 'data',
    params: {
        url: ['url', 'URL'],
    },
    name: 'My Device 2',
    description: 'This is the second device',

    auth: { type: 'none' }
};

class MyDevice3 extends BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        assert(Array.isArray(this.descriptors));
        assert.strictEqual(this._engine, engine);
        assert.strictEqual(this.platform, engine.platform);
        assert.strictEqual(this.state, state);
        assert.strictEqual(this.uniqueId, undefined);
        assert.strictEqual(this.name, undefined);
        assert.strictEqual(this.description, undefined);
    }
}
MyDevice3.metadata = {
    types: [],
    child_types: [],
    category: 'data',
    params: {},

    auth: { type: 'oauth2' }
};

function testBasic(d, e, k) {
    assert.strictEqual(d.engine, e);
    assert.strictEqual(d.kind, k);
    assert.strictEqual(d.ownerTier, 'global');
}

function testHasKind(d) {
    assert(d.hasKind('com.foo'));
    assert(d.hasKind('fooable'));
    assert(d.hasKind('data-source'));
    assert(!d.hasKind('thingengine-system'));
    assert(!d.hasKind('online-account'));
}

function testStateChanged(d) {
    let success = false;
    d.on('state-changed', () => {
        assert.strictEqual(success, false);
        success = true;
    });
    d.stateChanged();
    assert.strictEqual(success, true);
}

function testChangeState(d) {
    const newState = { kind: 'com.foo', v: 42 };

    assert(newState !== d.state);
    d.updateState(newState);
    assert.strictEqual(d.state, newState);
}

async function main() {
    const e = {
        platform: {
            locale: 'en-US',
            timezone: 'America/Los_Angeles'
        }
    };

    const state = { kind: 'com.foo' };
    const d1 = new MyDevice1(e, state);
    assert.strictEqual(d1.state, state);
    assert.strictEqual(d1.serialize(), state);

    testBasic(d1, e, 'com.foo');
    testHasKind(d1);

    await d1.checkAvailable();

    testStateChanged(d1);
    testChangeState(d1);

    const d2 = new MyDevice2(e, {
        kind: 'com.bar',
        url: 'http://www.google.com'
    });
    testBasic(d2, e, 'com.bar');

    const d3 = new MyDevice3(e, {
        kind: 'com.baz'
    });
    testBasic(d3, e, 'com.baz');
}
export default main;
if (!module.parent)
    main();
