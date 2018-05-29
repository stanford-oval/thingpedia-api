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

const PollingStream = require('../lib/helpers/polling');

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

function testSimple() {
    return new Promise((resolve, reject) => {
        let cnt = 0;
        let stopped = false;
        const stream = new PollingStream(new State(), 500, () => {
            if (stopped)
                assert.fail('Timeout was stopped');
            return [{v:cnt++}, {v:cnt++}];
        });

        let cnt2 = 0;
        let lastTimestamp = undefined;
        stream.on('data', (obj) => {
            assert(obj.__timestamp);
            assert(obj.v === cnt2);
            console.log(obj.v, obj.__timestamp);
            if (obj.__timestamp === lastTimestamp)
                assert(obj.v % 2 === 1);
            else
                assert(obj.v % 2 === 0);
            lastTimestamp = obj.__timestamp;
            cnt2++;

            if (cnt2 === 10) {
                stopped = true;
                stream.destroy();
                setTimeout(() => {
                    assert.strictEqual(cnt, 10);
                    assert.strictEqual(cnt2, 10);
                    resolve();
                }, 1000);
            }
        });
        stream.on('end', () => {
            assert.fail('unexpected end');
        });
        stream.on('error', (error) => {
            console.error(error.stack);
            assert.fail('unexpected error ' + error);
        });
    });
}

function main() {
    return Promise.all([
        testSimple(),
    ]);
}
module.exports = main;
if (!module.parent)
    main();
