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

const http = require('http');
const https = require('https');
const Url = require('url');

function getModule(parsed) {
    if (parsed.protocol === 'https:')
        return https;
    else
        return http;
}

function httpRequestStream(url, method, data, options, uploadStream, downloadStream, attemptedOAuth2) {
    if (!options)
        options = {};

    var parsed = Url.parse(url);
    var proxy = process.env.THINGENGINE_PROXY;
    if (proxy && (!parsed.port || parsed.port === 80 || parsed.port === 443)) {
        parsed = Url.parse(proxy);
        parsed.path = url;
    }

    parsed.method = method;
    parsed.headers = {};

    var oauth2 = null;
    if (options.auth) {
        parsed.headers['Authorization'] = options.auth;
    } else if (options.useOAuth2) {
        oauth2 = options.useOAuth2;
        if (oauth2.queryInterface)
            oauth2 = oauth2.queryInterface('oauth2');

        if (oauth2 !== null) {
            var authMethod = options.authMethod || 'Bearer';
            parsed.headers['Authorization'] = authMethod + ' ' + oauth2.accessToken;
        }
    }
    if (options.accept)
        parsed.headers['Accept'] = options.accept;
    if (options.dataContentType)
        parsed.headers['Content-Type'] = options.dataContentType;
    if (options['user-agent'])
        parsed.headers['User-Agent'] = options['user-agent'];
    else // add a default user agent
        parsed.headers['User-Agent'] = 'Thingpedia/1.0.0 nodejs/' + process.version;
    if (options.extraHeaders)
        Object.assign(parsed.headers, options.extraHeaders);
    if (options.debug === undefined)
        options.debug = true;

    var ignoreErrors = !!options.ignoreErrors;

    return new Promise((callback, errback) => {
        var req = getModule(parsed).request(parsed, (res) => {
            if ((options.followRedirects === true || options.followRedirects === undefined) &&
                (res.statusCode === 302 || res.statusCode === 301 || res.statusCode === 307)) {
                res.resume();
                const redirect = Url.resolve(url, res.headers['location']);
                callback(httpRequestStream(redirect, method, data, options,
                                           uploadStream, downloadStream));
                return;
            }
            if ((options.followRedirects === true || options.followRedirects === undefined) &&
                res.statusCode === 303) {
                res.resume();
                const redirect = Url.resolve(url, res.headers['location']);
                callback(httpRequestStream(redirect, 'GET', null, options,
                                           false, downloadStream));
                return;
            }
            if (!ignoreErrors && res.statusCode === 401 && oauth2 !== null && !attemptedOAuth2 && oauth2.refreshToken) {
                res.resume();
                console.log('Refreshing OAuth 2 credentials for failure in request to ' + url);
                callback(oauth2.refreshCredentials().then(() =>
                    httpRequestStream(url, method, data, options, uploadStream, downloadStream, true)));
                return;
            }
            if (!ignoreErrors && res.statusCode >= 300) {
                let data = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (options.debug && (res.statusCode !== 301 && res.statusCode !== 302 && res.statusCode !== 303))
                        console.log('HTTP request failed: ' + data);

                    var error = new Error('Unexpected HTTP error ' + res.statusCode);
                    error.detail = data;
                    error.code = res.statusCode;
                    if (res.statusCode >= 300 && res.statusCode < 400)
                        error.redirect = Url.resolve(url, res.headers['location']);
                    errback(error);
                });
                return;
            }

            if (downloadStream) {
                callback(res);
            } else {
                if (options.raw) {
                    let data = [];
                    let len = 0;
                    res.on('data', (chunk) => {
                        data.push(chunk);
                        len += chunk.length;
                    });
                    res.on('end', () => {
                        callback([Buffer.concat(data, len), res.headers['content-type']]);
                    });
                } else {
                    let data = '';
                    res.setEncoding('utf8');
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        callback(data);
                    });
                }
            }
        });
        req.on('error', (err) => {
            errback(err);
        });
        if (data) {
            if (uploadStream)
                data.pipe(req);
            else
                req.end(data);
        } else {
            req.end();
        }
    });
}

function httpRequest(url, method, data, options) {
    return httpRequestStream(url, method, data, options, false, false);
}

function httpUploadStream(url, method, data, options) {
    return httpRequestStream(url, method, data, options, true, false);
}

function httpDownloadStream(url, method, data, options) {
    return httpRequestStream(url, method, data, options, false, true);
}

module.exports = {
    request: httpRequest,
    get(url, options) { return httpRequest(url, 'GET', null, options); },
    post(url, data, options) { return httpRequest(url, 'POST', data, options); },
    postStream(url, data, options) { return httpUploadStream(url, 'POST', data, options); },
    getStream(url, options) { return httpDownloadStream(url, 'GET', null, options); },
};
