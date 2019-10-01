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
                (res.statusCode === 302 || res.statusCode === 301 ||
                 res.statusCode === 308 || res.statusCode === 307)) {
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

/**
 * HTTP Helpers.
 *
 * @namespace
 * @alias module:Helpers.Http
 */
module.exports = {
    /**
     * Perform a buffered HTTP request with a custom method.
     *
     * @param {string} url - the URL to POST to
     * @param {string} method - the HTTP method to use
     * @param {string|null} data - the content of the request body; you can pass `null` for an empty body
     * @param {Object} [options] - request options
     * @param {string} [options.dataContentType] - the value of the `Content-Type` request header
     * @param {string} [options.auth] - the value of `Authorization` header
     * @param {string} [options.accept] - the value of `Accept` header
     * @param {BaseDevice} [options.useOAuth2] - if set, the `Authorization` header will be computed for the passed
     *                                           device based on the OAuth 2.0 standard; using this option also enables
     *                                           automatic refresh token handling (if the refresh token exists); this
     *                                           option is ignored if `auth` is also set
     * @param {string} [options.authMethod=Bearer] - set this to override the prefix of the `Authorization` header;
     *                                        this option is ignored unless `useOAuth2` is set
     * @param {string} [options.user-agent] - set the `User-Agent` header; if unset a default user agent is used
     * @param {Object.<string,string>} [options.extraHeaders] - other request headers to set
     * @param {boolean} [options.ignoreErrors=false] - set to `true` to ignore errors (HTTP statuses 300 and higher)
     * @param {boolean} [options.followRedirects=true] - set to `false` to disable automatic handling of HTTP redirects (status 301, 302 and 303)
     * @param {boolean} [options.raw=false] - return the binary response body instead of converting to a string
     * @return {string|Array} either the string response body, or a tuple with {@link Buffer} and content type.
     * @function
     * @async
     */
    request: httpRequest,

    /**
     * Perform a buffered HTTP GET.
     *
     * If `options.raw` is set, returns a tuple of the response (as a `Buffer`) and the `Content-Type` header.
     * Otherwise, it returns the response body as a string.
     * If the HTTP request fails (returns a status code greater or equal to 300), the promise is rejected.
     * The resulting `Error` object will have a `code` property containing the actual HTTP status code.
     * If the HTTP status code is a redirect (between 300 and 399 inclusive), the `redirect` property
     * on the error will contain the value of the `Location` header.
     *
     * @param {string} url - the URL to retrieve
     * @param {Object} [options] - request options
     * @param {string} [options.auth] - the value of `Authorization` header
     * @param {string} [options.accept] - the value of `Accept` header
     * @param {BaseDevice} [options.useOAuth2] - if set, the `Authorization` header will be computed for the passed
     *                                           device based on the OAuth 2.0 standard; using this option also enables
     *                                           automatic refresh token handling (if the refresh token exists); this
     *                                           option is ignored if `auth` is also set
     * @param {string} [options.authMethod=Bearer] - set this to override the prefix of the `Authorization` header;
     *                                        this option is ignored unless `useOAuth2` is set
     * @param {string} [options.user-agent] - set the `User-Agent` header; if unset a default user agent is used
     * @param {Object.<string,string>} [options.extraHeaders] - other request headers to set
     * @param {boolean} [options.ignoreErrors=false] - set to `true` to ignore errors (HTTP statuses 300 and higher)
     * @param {boolean} [options.followRedirects=true] - set to `false` to disable automatic handling of HTTP redirects (status 301, 302 and 303)
     * @param {boolean} [options.raw=false] - return the binary response body instead of converting to a string
     * @return {string|Array} either the string response body, or a tuple with {@link Buffer} and content type.
     * @async
     */
    get(url, options) { return httpRequest(url, 'GET', null, options); },

    /**
     * Perform a buffered HTTP POST.
     *
     * @param {string} url - the URL to POST to
     * @param {string|null} data - the content of the request body; you can pass `null` for an empty body
     * @param {Object} [options] - request options
     * @param {string} [options.dataContentType] - the value of the `Content-Type` request header
     * @param {string} [options.auth] - the value of `Authorization` header
     * @param {string} [options.accept] - the value of `Accept` header
     * @param {BaseDevice} [options.useOAuth2] - if set, the `Authorization` header will be computed for the passed
     *                                           device based on the OAuth 2.0 standard; using this option also enables
     *                                           automatic refresh token handling (if the refresh token exists); this
     *                                           option is ignored if `auth` is also set
     * @param {string} [options.authMethod=Bearer] - set this to override the prefix of the `Authorization` header;
     *                                        this option is ignored unless `useOAuth2` is set
     * @param {string} [options.user-agent] - set the `User-Agent` header; if unset a default user agent is used
     * @param {Object.<string,string>} [options.extraHeaders] - other request headers to set
     * @param {boolean} [options.ignoreErrors=false] - set to `true` to ignore errors (HTTP statuses 300 and higher)
     * @param {boolean} [options.followRedirects=true] - set to `false` to disable automatic handling of HTTP redirects (status 301, 302 and 303)
     * @param {boolean} [options.raw=false] - return the binary response body instead of converting to a string
     * @return {string|Array} either the string response body, or a tuple with {@link Buffer} and content type.
     * @async
     */
    post(url, data, options) { return httpRequest(url, 'POST', data, options); },

    /**
     * Perform a stream HTTP POST request.
     *
     * The response will be buffered as with {@link module:Helpers.Http.post}.
     *
     * @param {string} url - the URL to POST to
     * @param {string|null} data - the content of the request body; you can pass `null` for an empty body
     * @param {Object} [options] - request options
     * @param {string} [options.dataContentType] - the value of the `Content-Type` request header
     * @param {string} [options.auth] - the value of `Authorization` header
     * @param {string} [options.accept] - the value of `Accept` header
     * @param {BaseDevice} [options.useOAuth2] - if set, the `Authorization` header will be computed for the passed
     *                                           device based on the OAuth 2.0 standard; using this option also enables
     *                                           automatic refresh token handling (if the refresh token exists); this
     *                                           option is ignored if `auth` is also set
     * @param {string} [options.authMethod=Bearer] - set this to override the prefix of the `Authorization` header;
     *                                        this option is ignored unless `useOAuth2` is set
     * @param {string} [options.user-agent] - set the `User-Agent` header; if unset a default user agent is used
     * @param {Object.<string,string>} [options.extraHeaders] - other request headers to set
     * @param {boolean} [options.ignoreErrors=false] - set to `true` to ignore errors (HTTP statuses 300 and higher)
     * @param {boolean} [options.followRedirects=true] - set to `false` to disable automatic handling of HTTP redirects (status 301, 302 and 303)
     * @param {boolean} [options.raw=false] - return the binary response body instead of converting to a string
     * @return {string|Array} either the string response body, or a tuple with {@link Buffer} and content type.
     * @async
     */
    postStream(url, data, options) { return httpUploadStream(url, 'POST', data, options); },

    /**
     * Perform a streaming GET request.
     *
     *
     * The result is the [`http.IncomingMessage`](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
     * from the underlying nodejs HTTP API. The result is also a `stream.Readable` and can be used as such.
     *
     * @param {string} url - the URL to retrieve
     * @param {Object} [options] - request options
     * @param {string} [options.auth] - the value of `Authorization` header
     * @param {string} [options.accept] - the value of `Accept` header
     * @param {BaseDevice} [options.useOAuth2] - if set, the `Authorization` header will be computed for the passed
     *                                           device based on the OAuth 2.0 standard; using this option also enables
     *                                           automatic refresh token handling (if the refresh token exists); this
     *                                           option is ignored if `auth` is also set
     * @param {string} [options.authMethod=Bearer] - set this to override the prefix of the `Authorization` header;
     *                                        this option is ignored unless `useOAuth2` is set
     * @param {string} [options.user-agent] - set the `User-Agent` header; if unset a default user agent is used
     * @param {Object.<string,string>} [options.extraHeaders] - other request headers to set
     * @param {boolean} [options.ignoreErrors=false] - set to `true` to ignore errors (HTTP statuses 300 and higher)
     * @param {boolean} [options.followRedirects=true] - set to `false` to disable automatic handling of HTTP redirects (status 301, 302 and 303)
     * @return {http.IncomingMessage} the server response
     * @async
     */
    getStream(url, options) { return httpDownloadStream(url, 'GET', null, options); },
};
