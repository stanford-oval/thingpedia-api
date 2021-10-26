// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2018-2019 The Board of Trustees of the Leland Stanford Junior University
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
import * as Stream from 'stream';
import * as Tp from 'thingpedia';

export default class MyDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.thingpedia.test.mydevice';
    }

    get_something() {
        return [{ v1: 'foo', v2: 42 }];
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
        return [{ v1: 'foo', v2: 42 }];
    }
    get_something_nomonitor() {
        return [{ v1: 'foo', v2: 42 }];
    }
    do_something_else({ v3 }) {
        assert.strictEqual(v3, 'bar');
    }

    async *get_something_async_iterable() {
        yield { v1: 'foo', v2: 42 };
    }
}
