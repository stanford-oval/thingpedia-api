// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Helpers = require('../lib/helpers');

// test http helpers using some of the best nanoservices on the web

function testGetRaw() {
    return Helpers.Http.get('http://www.foaas.com/because/Me', { accept: 'application/json', raw: true }).then(([data, contentType]) => {
        var parsed = JSON.parse(data);
        assert.equal(parsed.message, 'Why? Because fuck you, that\'s why.');
        assert.equal(parsed.subtitle, '- Me');
    }).catch((e) => {
        console.error('*** testGet: ' + e.message);
        console.error(e.stack);
    });
}

function testGet() {
    return Helpers.Http.get('http://www.foaas.com/because/Me', { accept: 'application/json' }).then((data) => {
        var parsed = JSON.parse(data);
        assert.equal(parsed.message, 'Why? Because fuck you, that\'s why.');
        assert.equal(parsed.subtitle, '- Me');
    }).catch((e) => {
        console.error('*** testGet: ' + e.message);
        console.error(e.stack);
    });
}

function testPost() {
    return Helpers.Http.post('http://api.shoutcloud.io/V1/SHOUT',
                      JSON.stringify({ INPUT: 'all caps' }),
                      { accept: 'application/json',
                        dataContentType: 'application/json' })
        .then((data) => {
            var parsed = JSON.parse(data);
            assert.equal(parsed.INPUT, 'all caps');
            assert.equal(parsed.OUTPUT, 'ALL CAPS');
        }).catch((e) => {
            console.error('*** testPost: ' + e.message);
            console.error(e.stack);
        });
}

function seq(array) {
    return (function loop(i) {
        if (i === array.length)
            return Promise.resolve();
        else
            return Promise.resolve(array[i]()).then(() => loop(i+1));
    })(0);
}

function main() {
    return seq([
        testGet,
        testGetRaw,
        testPost
    ]);
}
module.exports = main;
if (!module.parent)
    main();