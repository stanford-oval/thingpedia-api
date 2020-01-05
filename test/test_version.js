// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2018 Google LLC
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('..');
const assert = require('assert');

function main() {
    const packageJson = require('../package.json');
    assert.strictEqual(String(Tp.version), packageJson.version);

    assert.strictEqual(Tp.version.major, 2);
    assert.strictEqual(Tp.version.minor, 7);

    assert(Tp.version.compatible(201));
    assert(Tp.version.compatible(202));
    assert(Tp.version.compatible(203));
    assert(Tp.version.compatible(204));
    assert(Tp.version.compatible(205));
    assert(Tp.version.compatible(206));
    assert(Tp.version.compatible(207));
    assert(!Tp.version.compatible(208));
    assert(!Tp.version.compatible(300));
    assert(!Tp.version.compatible(100));
    assert(Tp.version.compatible({ major: 2, minor: 1 }));
    assert(Tp.version.compatible({ major: 2, minor: 2 }));
    assert(Tp.version.compatible({ major: 2, minor: 3 }));
    assert(Tp.version.compatible({ major: 2, minor: 4 }));
    assert(Tp.version.compatible({ major: 2, minor: 5 }));
    assert(Tp.version.compatible({ major: 2, minor: 6 }));
    assert(Tp.version.compatible({ major: 2, minor: 7 }));
    assert(!Tp.version.compatible({ major: 2, minor: 8 }));
    assert(!Tp.version.compatible({ major: 3, minor: 0 }));
    assert(!Tp.version.compatible({ major: 1, minor: 0 }));

    assert(Tp.version.hasFeature('rss'));
    assert(Tp.version.hasFeature('value-types'));
    assert(Tp.version.hasFeature('thingpedia-client'));
    assert(!Tp.version.hasFeature('invalid'));
}
module.exports = main;
if (!module.parent)
    main();
