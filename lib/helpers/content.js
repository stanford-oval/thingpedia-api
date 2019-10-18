// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015-2016 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Url = require('url');
const ip = require('ip');

const HttpHelpers = require('./http');

/**
 * Utilities to download and stream content.
 *
 * These APIs should be used in preference to other libraries to support platform-specific
 * URLs, like `file:///` or `content://` URLs.
 *
 * @alias Helpers.Content
 * @namespace
 */
module.exports = {
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
    isPubliclyAccessible(url) {
        var parsed = Url.parse(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
            return false;
        if (!ip.isV4Format(parsed.hostname) && !ip.isV6Format(parsed.hostname))
            return true;
        return ip.isPublic(parsed.hostname);
    },

    /**
     * Stream the content of the given URL.
     *
     * This method to should be used in preference to {@link Helpers.Http} or other
     * libraries, in order to support platform-specific URLs.
     *
     * @param {BasePlatform} platform - the current Almond platform
     * @param {string} url - the URL to retrieve
     * @return {stream.Readable} - a nodejs Readable stream, which also has a `contentType` string property
     * @async
     */
    async getStream(platform, url) {
        if (url.startsWith('http')) {
            return HttpHelpers.getStream(url).then((stream) => {
                stream.contentType = stream.headers['content-type'];
                return stream;
            });
        }

        var contentApi = platform.getCapability('content-api');
        if (contentApi === null)
            throw new Error('Unable to handle URL ' + url);

        return Promise.resolve(contentApi.getStream(url));
    },

    /**
     * Buffer the content of the given URL.
     *
     * This method is identical to {@link Helpers.Content.getStream} but returns a `Buffer` instead of a `stream.Readable`.
     *
     * @param {BasePlatform} platform - the current Almond platform
     * @param {string} url - the URL to retrieve
     * @return {Buffer} - the buffered URL content; it also has a `contentType` string property
     * @async
     */
    async getData(platform, url) {
        return this.getStream(platform, url).then((stream) => new Promise((callback, errback) => {
            var buffers = [];
            var length = 0;

            stream.on('data', (buffer) => {
                buffers.push(buffer);
                length += buffer.length;
            });
            stream.on('end', () => {
                let concatenated = Buffer.concat(buffers, length);
                concatenated.contentType = stream.contentType;
                callback(concatenated);
            });
            stream.on('error', errback);
        }));
    }
};
