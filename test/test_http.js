// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016-2018 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const stream = require('stream');

const Helpers = require('../lib/helpers');

// test http helpers using some of the best nanoservices on the web

function testSimple() {
    return Helpers.Http.get('https://httpbin.org/get').then((response) => {
        JSON.parse(response);
    });
}

function testUserAgent() {
    return Helpers.Http.get('https://httpbin.org/get', { 'user-agent': 'Thingpedia/2.2.0 Test' }).then((response) => {
        const data = JSON.parse(response);

        assert.strictEqual(data.headers['User-Agent'], 'Thingpedia/2.2.0 Test');
    });
}

function testGetRaw() {
    return Helpers.Http.get('http://www.foaas.com/because/Me', { accept: 'application/json', raw: true }).then(([data, contentType]) => {
        var parsed = JSON.parse(data);
        assert.equal(parsed.message, 'Why? Because fuck you, that\'s why.');
        assert.equal(parsed.subtitle, '- Me');
    });
}

function testGetStream() {
    return Helpers.Http.getStream('http://www.foaas.com/because/Me', { accept: 'application/json' }).then((str) => {
        assert(str instanceof stream.Readable);

        let data = '';
        str.on('data', (chunk) => {
            data += chunk;
        });
        str.on('end', () => {
            var parsed = JSON.parse(data);
            assert.equal(parsed.message, 'Why? Because fuck you, that\'s why.');
            assert.equal(parsed.subtitle, '- Me');
        });
    });
}

function testGet() {
    return Helpers.Http.get('http://www.foaas.com/because/Me', { accept: 'application/json' }).then((data) => {
        var parsed = JSON.parse(data);
        assert.equal(parsed.message, 'Why? Because fuck you, that\'s why.');
        assert.equal(parsed.subtitle, '- Me');
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
        });
}

function testPostStream() {
    const str = new stream.Readable({ read() {} });

    const data = JSON.stringify({ INPUT: 'all caps' });

    const promise = Helpers.Http.postStream('http://api.shoutcloud.io/V1/SHOUT', str,
                                            { accept: 'application/json',
                                              dataContentType: 'application/json' })
        .then((data) => {
            var parsed = JSON.parse(data);
            assert.equal(parsed.INPUT, 'all caps');
            assert.equal(parsed.OUTPUT, 'ALL CAPS');
        });

    str.push(data.substring(0, data.length/2));
    setTimeout(() => {
        str.push(data.substring(data.length/2, data.length));
        str.push(null);
    }, 100);

    return promise;
}

function testError() {
    return Promise.all([400, 401, 403, 500, 501].map((code) => {
        return Helpers.Http.get('https://httpbin.org/status/' + code).then(() => {
            assert.fail('expected an error');
        }, (err) => {
            assert.strictEqual(err.code, code);
        });
    }));
}

function testNetworkError() {
    return Helpers.Http.get('https://invalid.thingpedia.stanford.edu/').then(() => {
        assert.fail('expected an error');
    }, (err) => {
        assert.strictEqual(err.code, 'ENOTFOUND');
    });
}

function testErrorIgnoreErrors() {
    return Promise.all([400, 401, 403, 500, 501].map((code) => {
        return Helpers.Http.get('https://httpbin.org/status/' + code, { ignoreErrors: true });
    }));
}

function testAbsoluteRedirect() {
    return Helpers.Http.get('https://httpbin.org/absolute-redirect/1').then((response) => {
        const parsed = JSON.parse(response);
        assert.strictEqual(parsed.url, 'https://httpbin.org/get');
    });
}

function testRedirect() {
    return Helpers.Http.get('https://httpbin.org/relative-redirect/1').then((response) => {
        const parsed = JSON.parse(response);
        assert.strictEqual(parsed.url, 'https://httpbin.org/get');
    });
}

function testMultiRedirect() {
    return Helpers.Http.get('https://httpbin.org/relative-redirect/2').then((response) => {
        const parsed = JSON.parse(response);
        assert.strictEqual(parsed.url, 'https://httpbin.org/get');
    });
}

function testRedirectNoFollow() {
    return Helpers.Http.get('https://httpbin.org/relative-redirect/1', { followRedirects: false }).then((response) => {
        assert.fail('expected an error');
    }, (err) => {
        assert.strictEqual(err.code, 302);
        assert.strictEqual(err.redirect, 'https://httpbin.org/get');
    });
}

function testRedirectTemporary() {
    return Helpers.Http.get('https://httpbin.org/status/307').then((response) => {
        const parsed = JSON.parse(response);
        assert.strictEqual(parsed.url, 'https://httpbin.org/get');
    });
}
function testRedirectTemporaryNoFollow() {
    return Helpers.Http.get('https://httpbin.org/status/307', { followRedirects: false }).then((response) => {
        assert.fail('expected an error');
    }, (err) => {
        assert.strictEqual(err.code, 307);
        assert.strictEqual(err.redirect, 'https://httpbin.org/redirect/1');
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
        testSimple,
        testUserAgent,
        testGet,
        testGetRaw,
        testGetStream,
        testPost,
        testPostStream,
        testError,
        testNetworkError,
        testErrorIgnoreErrors,
        testAbsoluteRedirect,
        testRedirect,
        testMultiRedirect,
        testRedirectNoFollow,
        testRedirectTemporary,
        testRedirectTemporaryNoFollow
    ]);
}
module.exports = main;
if (!module.parent)
    main();
