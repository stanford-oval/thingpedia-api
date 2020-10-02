// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2018 Google LLC
//           2018-2019 The Board of Trustees of the Leland Stanford Junior University
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>


import assert from 'assert';

import * as http from 'http';
import * as Stream from 'stream';
import * as fs from 'fs';
import * as path from 'path';

import * as Content from '../lib/helpers/content';

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
    assert(Content.isPubliclyAccessible('http://171/foo'));
    assert(!Content.isPubliclyAccessible('http://[::1]/foo'));
    assert(!Content.isPubliclyAccessible('http://[fe80::1]/foo'));
    assert(Content.isPubliclyAccessible('http://171.64.72.12/foo'));
    assert(!Content.isPubliclyAccessible('http://parmesan/foo'));
    assert(Content.isPubliclyAccessible('http://parmesan.stanford.edu/foo'));
    assert(!Content.isPubliclyAccessible('http://xxxxxx.onion/foo'));
    assert(!Content.isPubliclyAccessible('http://localhost/foo'));
    assert(!Content.isPubliclyAccessible('http://localhost.localdomain/foo'));
    assert(!Content.isPubliclyAccessible('http://foo.localhost/foo'));
    assert(!Content.isPubliclyAccessible('http://foo.invalid/foo'));
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
export default main;
if (!module.parent)
    main();
