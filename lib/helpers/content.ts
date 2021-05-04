// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2016-2019 The Board of Trustees of the Leland Stanford Junior University
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

import * as http from 'http';
import * as stream from 'stream';
import * as Url from 'url';
import * as ip from 'ip';

import * as HttpHelpers from './http';
import type BasePlatform from '../base_platform';

/**
 * Utilities to download and stream content.
 *
 * These APIs should be used in preference to other libraries to support platform-specific
 * URLs, like `file:///` or `content://` URLs.
 *
 * @namespace
 */

/**
 * Check if the given URL is publicly accessible, that is, if it can be accessed on
 * by a different server not running inside the current Almond.
 *
 * Use this method to skip calling {@link Helpers.Content.getStream} or similar APIs if the
 * underlying API also support taking a URL instead of a data stream.
 * This method returns `true` for private, pre-authenticated URLs.
 *
 * @param {string} url - the URL to check
 * @return {boolean} `true` if the URL is an http(s) URL for a public hostname or IP
 */
export function isPubliclyAccessible(url : string) : boolean {
    const parsed = Url.parse(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
        return false;
    const hostname = parsed.hostname;
    if (!hostname)
        return false;

    if (ip.isV4Format(hostname) || ip.isV6Format(hostname))
        return ip.isPublic(hostname);

    // single-label DNS names (without a dot) are resolved according to the "search"
    // setting in /etc/resolv.conf, so we treat them as private
    const parts = hostname.split('.');
    if (parts.length === 1)
        return false;

    // hostnames that end in .local, .localhost, .localdomain, .invalid, .onion are
    // also special (RFC 6761, RFC 6762, RFC 7686)
    // (.localdomain is not RFC specified but it is commonly used)
    if (['local', 'localhost', 'localdomain', 'invalid', 'onion'].indexOf(parts[parts.length-1]) >= 0)
        return false;

    return true;
}

export interface ContentTypeStream extends stream.Readable {
    contentType ?: string;
}

/**
 * Stream the content of the given URL.
 *
 * This method to should be used in preference to {@link Helpers.Http} or other
 * libraries, in order to support platform-specific URLs.
 *
 * @param {BasePlatform} platform - the current Almond platform
 * @param {string} url - the URL to retrieve
 * @return {stream.Readable} - a nodejs Readable stream, which also has a `contentType` string property
 */
export async function getStream(platform : BasePlatform, url : string) : Promise<ContentTypeStream> {
    if (url.startsWith('http')) {
        return HttpHelpers.getStream(url).then((stream : http.IncomingMessage) => {
            const ctstream = stream as ContentTypeStream;
            ctstream.contentType = stream.headers['content-type'];
            return ctstream;
        });
    }

    const contentApi = platform.getCapability('content-api');
    if (contentApi === null)
        throw new Error('Unable to handle URL ' + url);

    return Promise.resolve(contentApi.getStream(url));
}

export interface ContentTypeBuffer extends Buffer {
    contentType ?: string;
}

/**
 * Buffer the content of the given URL.
 *
 * This method is identical to {@link Helpers.Content.getStream} but returns a `Buffer` instead of a `stream.Readable`.
 *
 * @param {BasePlatform} platform - the current Almond platform
 * @param {string} url - the URL to retrieve
 * @return {Buffer} - the buffered URL content; it also has a `contentType` string property
 */
export async function getData(platform : BasePlatform, url : string) : Promise<ContentTypeBuffer> {
    return getStream(platform, url).then((stream : ContentTypeStream) => new Promise((callback, errback) => {
        const buffers : Buffer[] = [];
        let length = 0;

        stream.on('data', (buffer) => {
            buffers.push(buffer);
            length += buffer.length;
        });
        stream.on('end', () => {
            const concatenated = Buffer.concat(buffers, length) as ContentTypeBuffer;
            concatenated.contentType = stream.contentType;
            callback(concatenated);
        });
        stream.on('error', errback);
    }));
}
