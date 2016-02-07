// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const assert = require('assert');
const Helpers = require('../lib/helpers');

// test http helpers using some of the best nanoservices on the web

function testGetRaw() {
    Helpers.Http.get('http://www.foaas.com/because/Me', { accept: 'application/json', raw: true }).spread(function(data, contentType) {
        var parsed = JSON.parse(data);
        assert.equal(parsed.message, 'Why? Because Fuck you, that\'s why.');
        assert.equal(parsed.subtitle, '- Me');
    }).catch(function(e) {
        console.error('*** testGet: ' + e.message);
        console.error(e.stack);
    }).done();
}

function testGet() {
    Helpers.Http.get('http://www.foaas.com/because/Me', { accept: 'application/json' }).then(function(data) {
        var parsed = JSON.parse(data);
        assert.equal(parsed.message, 'Why? Because Fuck you, that\'s why.');
        assert.equal(parsed.subtitle, '- Me');
    }).catch(function(e) {
        console.error('*** testGet: ' + e.message);
        console.error(e.stack);
    }).done();
}

function testPost() {
    Helpers.Http.post('http://api.shoutcloud.io/V1/SHOUT',
                      JSON.stringify({ INPUT: 'all caps' }),
                      { accept: 'application/json',
                        dataContentType: 'application/json' })
        .then(function(data) {
            var parsed = JSON.parse(data);
            assert.equal(parsed.INPUT, 'all caps');
            assert.equal(parsed.OUTPUT, 'ALL CAPS');
        }).catch(function(e) {
            console.error('*** testPost: ' + e.message);
            console.error(e.stack);
        }).done();
}

function main() {
    testGet();
    testGetRaw();
    testPost();
}

main();
