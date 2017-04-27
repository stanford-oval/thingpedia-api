// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const assert = require('assert');

const BaseChannel = require('../lib/base_channel');
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
    types: [],
    child_types: []
}

class MyChannel extends BaseChannel {
}

function main() {
    var e = {}
    var d = new MyDevice(e, {});
    var c = new MyChannel(e, d);

    assert.equal(c.engine, e);
    assert.equal(c.device, d);
}
main();
