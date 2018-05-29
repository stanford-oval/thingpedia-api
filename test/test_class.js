// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');

const BaseDevice = require('../lib/base_device');

class MyDevice extends BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        assert(Array.isArray(this.descriptors));
        assert.equal(this._engine, engine);
        assert.equal(this.state, state);
    }
}
MyDevice.metadata = {
    types: ['fooable'],
    child_types: []
};

function main() {
    var e = {};
    var d = new MyDevice(e, { kind: 'com.foo' });

    assert.strictEqual(d.engine, e);
    assert.strictEqual(d.kind, 'com.foo');
    assert(d.hasKind('com.foo'));
    assert(d.hasKind('fooable'));
}
module.exports = main;
if (!module.parent)
    main();
