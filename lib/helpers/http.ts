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

import assert from 'assert';
import * as stream from 'stream';
import * as http from 'http';
import * as https from 'https';
import * as Url from 'url';

import type BaseDevice from '../base_device';

/**
 * HTTP Helpers.
 *
 * @module
 */

function getModule(parsed : http.ClientRequestArgs) {
    if (parsed.protocol === 'https:')
        return https;
    else
        return http;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export interface HTTPRequestOptions {
    dataContentType ?: string;
    auth ?: string;
    accept ?: string;
    useOAuth2 ?: BaseDevice;
    authMethod ?: string;
    'user-agent' ?: string;
    extraHeaders ?: { [key : string] : string };
    ignoreErrors ?: boolean;
    followRedirects ?: boolean;
    raw ?: boolean;
    debug ?: boolean;
    timeout ?: number;
}

export class HTTPError extends Error {
    code : number;
    detail : string;
    url : string;
    redirect ?: string;

    constructor(statusCode : number, url : string, data : string) {
        super('Unexpected HTTP error ' + statusCode + ' in request to ' + url);
        this.code = statusCode;
        this.url = url;
        this.detail = data;
    }
}

type NonStreamResult<DownloadRawT extends boolean> =
    DownloadRawT extends true ? [Buffer, string] :
    DownloadRawT extends false ? string :
    [Buffer, string]|string;

type RequestResult<DownloadStreamT extends boolean, DownloadRawT extends boolean> =
    DownloadStreamT extends true ? http.IncomingMessage :
    DownloadStreamT extends false ? NonStreamResult<DownloadRawT> :
    http.IncomingMessage|NonStreamResult<DownloadRawT>;

function httpRequestStream<UploadStreamT extends boolean, DownloadStreamT extends boolean, DownloadRawT extends boolean>(url : string,
                                                                                                                         method : string,
                                                                                                                         data : UploadStreamT extends true ? stream.Readable : string|Buffer|null,
                                                                                                                         options_ : HTTPRequestOptions|undefined,
                                                                                                                         uploadStream : UploadStreamT,
                                                                                                                         downloadStream : DownloadStreamT,
                                                                                                                         downloadRaw : DownloadRawT,
                                                                                                                         attemptedOAuth2 = false) : Promise<RequestResult<DownloadStreamT, DownloadRawT>> {
    const options : HTTPRequestOptions = options_ || {};

    let parsed : http.ClientRequestArgs = Url.parse(url);
    const proxy = process.env.THINGENGINE_PROXY;
    if (proxy && (!parsed.port || parsed.port === '80' || parsed.port === '443')) {
        parsed = Url.parse(proxy);
        parsed.path = url;
    }

    parsed.method = method;
    parsed.headers = {};

    let oauth2 : BaseDevice.OAuth2Interface|null = null;
    if (options.auth) {
        parsed.headers['Authorization'] = options.auth;
    } else if (options.useOAuth2) {
        oauth2 = options.useOAuth2.queryInterface('oauth2');

        if (oauth2 !== null) {
            const authMethod : string = options.authMethod || 'Bearer';
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
    parsed.timeout = options.timeout ?? DEFAULT_TIMEOUT;

    const ignoreErrors = !!options.ignoreErrors;

    return new Promise((callback, errback) => {
        const req = getModule(parsed).request(parsed, (res : http.IncomingMessage) => {
            if ((options.followRedirects === true || options.followRedirects === undefined) &&
                (res.statusCode === 302 || res.statusCode === 301 ||
                 res.statusCode === 308 || res.statusCode === 307)) {
                res.resume();
                const location = res.headers['location'];
                assert(location);
                const redirect = Url.resolve(url, location);
                callback(httpRequestStream(redirect, method, data, options,
                    uploadStream, downloadStream, downloadRaw));
                return;
            }
            if ((options.followRedirects === true || options.followRedirects === undefined) &&
                res.statusCode === 303) {
                res.resume();
                const location = res.headers['location'];
                assert(location);
                const redirect = Url.resolve(url, location);
                callback(httpRequestStream(redirect, 'GET', null, options,
                    false, downloadStream, downloadRaw));
                return;
            }
            if (!ignoreErrors && res.statusCode === 401 && oauth2 !== null && !attemptedOAuth2 && oauth2.refreshToken) {
                res.resume();
                console.log('Refreshing OAuth 2 credentials for failure in request to ' + url);
                callback(oauth2.refreshCredentials().then(() =>
                    httpRequestStream(url, method, data, options, uploadStream, downloadStream, downloadRaw, true)));
                return;
            }
            if (!ignoreErrors && res.statusCode! >= 300) {
                let data = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (options.debug && (res.statusCode !== 301 && res.statusCode !== 302 && res.statusCode !== 303))
                        console.log('HTTP request failed: ' + data);

                    const error = new HTTPError(res.statusCode!, url, data);
                    if (res.statusCode! >= 300 && res.statusCode! < 400) {
                        const location = res.headers['location'];
                        assert(location);
                        error.redirect = Url.resolve(url, location);
                    }
                    errback(error);
                });
                return;
            }

            if (downloadStream) {
                callback(res as RequestResult<DownloadStreamT, DownloadRawT>);
            } else {
                if (downloadRaw) {
                    const data : Buffer[] = [];
                    let len = 0;
                    res.on('data', (chunk) => {
                        data.push(chunk);
                        len += chunk.length;
                    });
                    res.on('end', () => {
                        callback([Buffer.concat(data, len), res.headers['content-type']] as RequestResult<DownloadStreamT, DownloadRawT>);
                    });
                } else {
                    let data = '';
                    res.setEncoding('utf8');
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        callback(data as RequestResult<DownloadStreamT, DownloadRawT>);
                    });
                }
            }
        });
        req.on('timeout', () => {
            req.destroy();
        });
        req.on('error', (err) => {
            errback(err);
        });
        if (data) {
            if (uploadStream)
                (data as stream.Readable).pipe(req);
            else
                req.end(data);
        } else {
            req.end();
        }
    });
}

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
 * @return {Promise<string>|Promise<Array>} either the string response body, or a tuple with `Buffer` and content type.
 */
export function request(url : string,
                        method : string,
                        data : string|Buffer|null,
                        options : HTTPRequestOptions & { raw : true }) : Promise<[Buffer, string]>;
export function request(url : string,
                        method : string,
                        data : string|Buffer|null,
                        options ?: HTTPRequestOptions) : Promise<string>;
export function request(url : string,
                        method : string,
                        data : string|Buffer|null,
                        options : HTTPRequestOptions = {}) : Promise<[Buffer, string]|string> {
    return httpRequestStream(url, method, data, options, false, false, !!options.raw);
}

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
 * @return {Promise<string>|Promise<Array>} either the string response body, or a tuple with `Buffer` and content type.
 */
export function get(url : string, options : HTTPRequestOptions & { raw : true }) : Promise<[Buffer, string]>;
export function get(url : string, options ?: HTTPRequestOptions) : Promise<string>;
export function get(url : string, options : HTTPRequestOptions = {}) : Promise<[Buffer, string]|string> {
    return httpRequestStream(url, 'GET', null, options, false, false, !!options.raw);
}

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
 * @return {Promise<string>|Promise<Array>} either the string response body, or a tuple with `Buffer` and content type.
 */
export function post(url : string, data : string|Buffer, options : HTTPRequestOptions & { raw : true }) : Promise<[Buffer, string]>;
export function post(url : string, data : string|Buffer, options ?: HTTPRequestOptions) : Promise<string>;
export function post(url : string, data : string|Buffer, options : HTTPRequestOptions = {}) : Promise<[Buffer, string]|string> {
    return httpRequestStream(url, 'POST', data, options, false, false, !!options.raw);
}

/**
 * Perform a stream HTTP POST request.
 *
 * The response will be buffered as with {@link Helpers.Http.post}.
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
 * @return {Promise<string>|Promise<Array>} either the string response body, or a tuple with `Buffer` and content type.
 */
export function postStream(url : string, data : stream.Readable, options : HTTPRequestOptions & { raw : true }) : Promise<[Buffer, string]>;
export function postStream(url : string, data : stream.Readable, options ?: HTTPRequestOptions) : Promise<string>;
export function postStream(url : string, data : stream.Readable, options : HTTPRequestOptions = {}) : Promise<[Buffer, string]|string> {
    return httpRequestStream(url, 'POST', data, options, true, false, !!options.raw);
}

function httpDownloadStream(url : string,
                            method : string,
                            data : string|Buffer|null,
                            options ?: HTTPRequestOptions) : Promise<http.IncomingMessage> {
    return httpRequestStream(url, method, data, options, false, true, false);
}

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
 * @return {Promise<http.IncomingMessage>} the server response
 */
export function getStream(url : string, options ?: HTTPRequestOptions) : Promise<http.IncomingMessage> {
    return httpDownloadStream(url, 'GET', null, options);
}

/**
 * Perform a streaming HTTP request with a custom method.
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
 * @return {Promise<string>|Promise<Array>} either the string response body, or a tuple with `Buffer` and content type.
 */
export function requestStream(url : string,
                              method : string,
                              data : string|Buffer|null,
                              options : HTTPRequestOptions = {}) : Promise<http.IncomingMessage> {
    return httpRequestStream(url, method, data, options, false, true, false);
}
