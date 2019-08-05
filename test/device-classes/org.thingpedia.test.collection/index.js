// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2018 The Board of Trustees of the Leland Stanford Junior University
//                Google LLC
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

class MySubDevice extends Tp.BaseDevice {
    get_get_data() {
        return [{data: 'foo'}];
    }
    do_eat_data({ data }) {
        assert.strictEqual(data, 'bar');
    }
}

module.exports = class MyCollectionDevice extends Tp.BaseDevice {
    static get subdevices() {
        return {
            'org.thingpedia.test.subdevice': MySubDevice
        };
    }

    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.thingpedia.test.collection';
    }
};