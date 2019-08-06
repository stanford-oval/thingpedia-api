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
const events = require('events');


const RefCounted = require('../lib/helpers/ref_counted');

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
module.exports = main;
if (!module.parent)
    main();
