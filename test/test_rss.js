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
require('./assert_rejects');

const RSS = require('../lib/helpers/rss');

function testRSS1() {
    return RSS.get('http://lorem-rss.herokuapp.com/feed?unit=day').then((items) => {
        items.forEach((item, i) => {
            assert(item.updated_time instanceof Date);
            assert(item.updated instanceof Date);
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
            assert(item.updated_time instanceof Date);
            assert(item.updated instanceof Date);
            if (i > 0)
                assert(+item.updated_time <= +items[i-1].updated_time);
            assert(!!item.title);
            assert(item.link.indexOf('xkcd.com') >= 0);
        });
    });
}

function testXkcdWhatIf() {
    // Xkcd's what if requires handling namespaces correctly
    return RSS.get('https://what-if.xkcd.com/feed.atom').then((items) => {
        items.forEach((item, i) => {
            assert(item.updated_time instanceof Date);
            assert(item.updated instanceof Date);
            if (i > 0)
                assert(+item.updated_time <= +items[i-1].updated_time);
            assert(item.title);
            assert(item.link.startsWith('https://what-if.xkcd.com'));
        });
    });
}

function testWashingtonPost() {
    // Washington Post requires correct handling of pictures
    return RSS.get('http://feeds.washingtonpost.com/rss/politics').then((items) => {
        items.forEach((item, i) => {
            assert(item.updated_time instanceof Date);
            assert(item.updated instanceof Date);
            if (i > 0)
                assert(+item.updated_time <= +items[i-1].updated_time);
            assert(item.title);
            assert(item.description);
            assert(item.picture_url || item.picture_url === null);
            assert(item.link.startsWith('https://www.washingtonpost.com/'));
        });
    });
}

async function testNotRSS() {
    await assert.rejects(() => RSS.get('https://httpbin.org/get'));
    await assert.rejects(() => RSS.get('httsp://www.google.com'));
}

function main() {
    return Promise.all([
        testRSS1(),
        testAtom(),
        testXkcdWhatIf(),
        //testWashingtonPost(),
        testNotRSS()
    ]);
}
module.exports = main;
if (!module.parent)
    main();
