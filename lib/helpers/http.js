// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015-2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Q = require('q');
const http = require('http');
const https = require('https');
const Url = require('url');

function getModule(parsed) {
    if (parsed.protocol === 'https:')
        return https;
    else
        return http;
}

function httpRequestStream(url, method, data, options, uploadStream, downloadStream) {
    if (!options)
        options = {};

    var parsed = Url.parse(url);
    var proxy = process.env.THINGENGINE_PROXY;
    if (proxy && (!parsed.port || parsed.port == 80 || parsed.port == 443)) {
        parsed = Url.parse(proxy);
        parsed.path = url;
    }

    parsed.method = method;
    parsed.headers = {};
    if (options.auth)
        parsed.headers['Authorization'] = options.auth;
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

    return Q.Promise(function(callback, errback) {
        var req = getModule(parsed).request(parsed, function(res) {
            if (res.statusCode == 302 ||
                res.statusCode == 301) {
                res.resume();
                httpRequestStream(res.headers['location'], method, data, options,
                                  uploadStream, downloadStream).then(callback, errback);
                return;
            }
            if (res.statusCode == 303) {
                res.resume();
                httpRequestStream(res.headers['location'], 'GET', null, options,
                                  false, downloadStream).then(callback, errback);
                return;
            }
            if (res.statusCode >= 300) {
                var data = '';
                res.setEncoding('utf8');
                res.on('data', function(chunk) {
                    data += chunk;
                });
                res.on('end', function() {
                    console.log('HTTP request failed: ' + data);
                    errback(new Error('Unexpected HTTP error ' + res.statusCode));
                });
                return;
            }

            if (downloadStream) {
                callback(res);
            } else {
                if (options.raw) {
                    var data = [];
                    var len = 0;
                    res.on('data', function(chunk) {
                        data.push(chunk);
                        len += chunk.length;
                    });
                    res.on('end', function() {
                        callback([Buffer.concat(data, len), res.headers['content-type']]);
                    });
                } else {
                    var data = '';
                    res.setEncoding('utf8');
                    res.on('data', function(chunk) {
                        data += chunk;
                    });
                    res.on('end', function() {
                        callback(data);
                    });
                }
            }
        });
        req.on('error', function(err) {
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
    get: function(url, options) { return httpRequest(url, 'GET', null, options); },
    post: function(url, data, options) { return httpRequest(url, 'POST', data, options); },
    postStream: function(url, data, options) { return httpUploadStream(url, 'POST', data, options); },
    getStream: function(url, options) { return httpDownloadStream(url, 'GET', null, options); },
};
