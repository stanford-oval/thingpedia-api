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
const Stream = require('stream');
const Tp = require('thingpedia');

module.exports = class MyDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.thingpedia.test.mydevice';
    }

    get_something() {
        return [{v1: 'foo', v2: 42}];
    }
    subscribe_something() {
        const str = new Stream.Readable({ read() {}, objectMode: true });

        str.push({ v1: 'foo', v2: 42 });
        setTimeout(() => {
            str.push({ v1: 'foo', v2: 43 });
        }, 1000);
        str.destroy = () => {};
        return str;
    }

    get_something_poll() {
        return [{v1: 'foo', v2: 42}];
    }
    get_something_nomonitor() {
        return [{v1: 'foo', v2: 42}];
    }
    do_something_else({ v3 }) {
        assert.strictEqual(v3, 'bar');
    }
};
