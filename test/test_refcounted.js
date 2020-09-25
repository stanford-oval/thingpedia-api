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
import * as events from 'events';

import RefCounted from '../lib/helpers/ref_counted';

function timeout(delay) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), delay);
    });
}
class DefaultRefCounted extends RefCounted {
}

class MyRefCounted extends RefCounted {
    constructor() {
        super();
        this._allowClose = false;
    }

    get isOpen() {
        return this._allowClose;
    }

    _doOpen() {
        return timeout(500).then(() => {
            if (this._allowClose)
                throw new Error('Invalid open');
            this._allowClose = true;
            return timeout(100);
        });
    }
    _doClose() {
        if (!this._allowClose)
            throw new Error('Invalid close');
        this._allowClose = false;
        return timeout(100);
    }
}

function test0() {
    const obj = new DefaultRefCounted();

    return obj.open().then(() => {
        return obj.close();
    });
}

function testError() {
    const obj = new DefaultRefCounted();

    assert.throws(() => obj.close());

    return obj.open().then(() => {
        return obj.close();
    }).then(() => {
        assert.throws(() => obj.close());
    });
}

function test1() {
    const obj = new MyRefCounted();
    assert(obj instanceof RefCounted);
    assert(obj instanceof events.EventEmitter);
    assert(!obj.isOpen);

    return obj.open().then(() => {
        assert(obj.isOpen);
        obj.open();
        return obj.close();
    }).then(() => {
        assert(obj.isOpen);
        return obj.close();
    }).then(() => {
        assert(!obj.isOpen);
    });
}

function test2() {
    const obj = new MyRefCounted();
    assert(obj instanceof RefCounted);
    assert(obj instanceof events.EventEmitter);
    assert(!obj.isOpen);

    obj.open();
    return obj.open().then(() => {
        assert(obj.isOpen);
        return obj.close();
    }).then(() => {
        assert(obj.isOpen);
        return obj.close();
    }).then(() => {
        assert(!obj.isOpen);
    });
}

function test3() {
    const obj = new MyRefCounted();
    assert(obj instanceof RefCounted);
    assert(obj instanceof events.EventEmitter);
    assert(!obj.isOpen);

    obj.open();
    obj.open();
    obj.close();
    assert(!obj.isOpen);
    return Promise.resolve(() => {
        assert(!obj.isOpen);
    }).then(() => {
        return obj.close();
    }).then(() => {
        assert(!obj.isOpen);
    });
}

function test4() {
    const obj = new MyRefCounted();
    assert(obj instanceof RefCounted);
    assert(obj instanceof events.EventEmitter);
    assert(!obj.isOpen);

    obj.open();
    obj.close();
    return obj.open().then(() => {
        assert(obj.isOpen);
    }).then(() => {
        return obj.close();
    }).then(() => {
        assert(!obj.isOpen);
    });
}

function main() {
    return Promise.all([
        test0(),
        testError(),
        test1(),
        test2(),
        test3(),
        test4()
    ]);
}
export default main;
if (!module.parent)
    main();
