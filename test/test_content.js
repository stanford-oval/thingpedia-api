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

const assert = require('assert');
require('./assert_rejects');

const http = require('http');
const Stream = require('stream');
const fs = require('fs');
const path = require('path');

const Content = require('../lib/helpers/content');

const fileContentApi = {
    getStream(url) {
        if (!url.startsWith('file://'))
            throw new Error('not supported');
        const stream = fs.createReadStream(url.substring('file://'.length));
        stream.contentType = 'text/plain';
        return Promise.resolve(stream);
    }
};
const platformWithContent = {
    getCapability(cap) {
        if (cap === 'content-api')
            return fileContentApi;
        else
            return null;
    }
};
const platformWithoutContent = {
    getCapability(cap) {
        return null;
    }
};

function collectStream(stream) {
    return new Promise((resolve, reject) => {
        const buffers = [];
        let length = 0;
        stream.on('data', (data) => {
            buffers.push(data);
            length += data.length;
        });
        stream.on('end', () => {
            resolve(Buffer.concat(buffers, length));
        });
        stream.on('error', reject);
    });
}

async function testIsPubliclyAccessible() {
    assert(Content.isPubliclyAccessible('https://google.com'));
    assert(Content.isPubliclyAccessible('http://google.com'));
    assert(!Content.isPubliclyAccessible('content://android/foo'));
    assert(!Content.isPubliclyAccessible('file:///home/user/foo'));
    assert(!Content.isPubliclyAccessible('http://127.0.0.1/foo'));
    assert(!Content.isPubliclyAccessible('http://192.168.1.1/foo'));
    assert(!Content.isPubliclyAccessible('http://[::1]/foo'));
}

const CROWDIE = `<!DOCTYPE html>
<title>Crowdie Cheese</title>
<style>
body {
/*  background-image: url(cheese.jpg);*/
  background-size: cover;
  font-family: sans-serif;
}
</style>
<h1>crowdie.stanford.edu</h1>
<p>A server owned and operated by the <a href="https://mobisocial.stanford.edu">Mobile and Social Research Group</a>.
<p>Please refer to our website for contact information.
`;

async function testGetHttpStream(platform) {
    const httpStream = await Content.getStream(platform, 'https://crowdie.stanford.edu');
    assert(httpStream instanceof http.IncomingMessage);
    assert(httpStream instanceof Stream.Readable);

    const buffer = await collectStream(httpStream);
    assert.strictEqual(httpStream.contentType, 'text/html');
    assert.strictEqual(buffer.toString(), CROWDIE);
}

async function testGetFileStream() {
    const fileStream = await Content.getStream(platformWithContent,
        'file://' + path.resolve(path.dirname(module.filename), 'test.txt'));
    assert(fileStream instanceof Stream.Readable);

    const buffer = await collectStream(fileStream);
    assert.strictEqual(fileStream.contentType, 'text/plain');
    assert.strictEqual(buffer.toString(), `this is a test file`);
}

async function testGetFileStream2() {
    assert.rejects(() => Content.getStream(platformWithoutContent,
        'file://' + path.resolve(path.dirname(module.filename), 'test.txt')));
}

async function testGetData(platform) {
    const buffer = await Content.getData(platform, 'https://crowdie.stanford.edu');
    assert(buffer instanceof Buffer);
    assert.strictEqual(buffer.contentType, 'text/html');
    assert.strictEqual(buffer.toString(), CROWDIE);
}

async function testGetDataThrows(platform) {
    assert.rejects(() => Content.getData(platform, 'https://crowdie.stanford.edu/404'));
}

async function main() {
    await testIsPubliclyAccessible();
    await testGetHttpStream(platformWithContent);
    await testGetFileStream();
    await testGetHttpStream(platformWithoutContent);
    await testGetFileStream2();
    await testGetData(platformWithContent);
    await testGetData(platformWithoutContent);
    await testGetDataThrows(platformWithContent);
}
module.exports = main;
if (!module.parent)
    main();
