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

const RSS = require('../lib/helpers/rss');

function testRSS1() {
    return RSS.get('http://lorem-rss.herokuapp.com/feed?unit=day').then((items) => {
        items.forEach((item, i) => {
            if (i > 0)
                assert(+item.updated_time <= +items[i-1].updated_time);
            assert(item.title.startsWith('Lorem ipsum '));
            assert(!!item.description);
            assert(item.link.startsWith('http://example.com'));
        });
    });
}

function testAtom() {
    return RSS.get('https://xkcd.com/atom.xml').then((items) => {
        items.forEach((item, i) => {
            if (i > 0)
                assert(+item.updated_time <= +items[i-1].updated_time);
            assert(!!item.title);
            assert(item.link.startsWith('https://xkcd.com'));
        });
    });
}

function main() {
    return Promise.all([
        testRSS1(),
        testAtom()
    ]);
}
module.exports = main;
if (!module.parent)
    main();
