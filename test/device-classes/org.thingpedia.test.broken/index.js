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

const Tp = require('thingpedia');

module.exports = class MyDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.thingpedia.test.broken';
    }

    get_something() {
        return [{v1: 'foo', v2: 42}];
    }
    subscribe_something() {
        return null;
    }

    get_something_poll1() {
        return null;
    }
    get_something_poll2() {
        return undefined;
    }
    get_something_poll3() {
        return {};
    }
    get_something_poll4() {
        return 'foo';
    }
};
