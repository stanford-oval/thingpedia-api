// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2018 The Board of Trustees of the Leland Stanford Junior University
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

import PollingStream from '../lib/helpers/polling';

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
            return [{ v:cnt++ }, { v:cnt++ }];
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
export default main;
if (!module.parent)
    main();
