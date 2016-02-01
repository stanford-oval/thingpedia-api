// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015-2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Q = require('q');
const crypto = require('crypto');
const oauth = require('oauth');
const lang = require('lang');
const http = require('http');
const https = require('https');
const Url = require('url');

// encryption ;)
function rot13(x) {
    return Array.prototype.map.call(x, function(ch) {
        var code = ch.charCodeAt(0);
        if (code >= 0x41 && code <= 0x5a)
            code = (((code - 0x41) + 13) % 26) + 0x41;
        else if (code >= 0x61 && code <= 0x7a)
            code = (((code - 0x61) + 13) % 26) + 0x61;

        return String.fromCharCode(code);
    }).join('');
}

const OAuth2Helper = function(params) {
    function makeOAuthAPI() {
        var auth = new oauth.OAuth2(params.client_id,
                                    rot13(params.client_secret),
                                    '',
                                    params.authorize,
                                    params.get_access_token);
        auth.useAuthorizationHeaderforGET(true);
        return auth;
    }

    function runOAuthStep1(engine) {
        var auth = makeOAuthAPI();

        var origin = platform.getOrigin();
        var session = {};
        var query = {
            response_type: 'code',
            redirect_uri: origin + '/devices/oauth2/callback/' + params.kind
        };
        if (params.set_state) {
            var state = crypto.randomBytes(16).toString('hex');
            query.state = state;
            session['oauth2-state-' + params.kind] = state;
        }
        if (params.scope)
            query.scope = params.scope.join(' ');

        return [auth.getAuthorizeUrl(query), session];
    }

    function runOAuthStep2(engine, req) {
        var auth = makeOAuthAPI();

        var code = req.query.code;
        var state = req.query.state;
        if (params.set_state &&
            state !== req.session['oauth2-state-' + params.kind])
            return Q.reject(new Error("Invalid CSRF token"));
        delete req.session['oauth2-state-' + params.kind];

        var origin = platform.getOrigin();
        var options = {
            grant_type: 'authorization_code',
            redirect_uri: origin + '/devices/oauth2/callback/' + params.kind };
        return Q.ninvoke(auth, 'getOAuthAccessToken', code, options)
            .then(function(result) {
                var accessToken = result[0];
                var refreshToken = result[1];

                return params.callback(engine, accessToken, refreshToken);
            });
    }

    return function runOAuth2(engine, req) {
        if (req === null) {
            return runOAuthStep1(engine);
        } else {
            return runOAuthStep2(engine, req);
        }
    }
}

function getModule(parsed) {
    if (parsed.protocol === 'https:')
        return https;
    else
        return http;
}

function httpRequest(url, method, options) {
    if (!options)
        options = {};

    var parsed = Url.parse(url);
    parsed.method = method;
    parsed.headers = {};
    if (options.auth)
        parsed.headers['Authorization'] = options.auth;
    if (options.accept)
        parsed.headers['Accept'] = options.accept;

    return Q.Promise(function(callback, errback) {
        var req = getModule(parsed).request(parsed, function(res) {
            if (res.statusCode == 302 ||
                res.statusCode == 301) {
                httpRequest(res.headers['location'], options).then(callback, errback);
                return;
            }
            if (res.statusCode != 200) {
                errback(new Error('Unexpected HTTP error ' + res.statusCode));
                return;
            }

            var data = '';
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                data += chunk;
            });
            res.on('end', function() {
                callback(data);
            });
        });
        req.on('error', function(err) {
            errback(err);
        });
        req.end();
    });
}

const HttpHelper = {
    request: httpRequest,
    get: function(url, options) { return httpRequest(url, 'GET', options); }
};

module.exports = {
    OAuth2: OAuth2Helper,
    Http: HttpHelper,
};
