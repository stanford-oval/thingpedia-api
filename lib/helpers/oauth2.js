// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015-2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Q = require('q');
const crypto = require('crypto');
const oauth = require('oauth');

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

module.exports = function OAuth2Helper(params) {
    function runOAuth2(engine, req) {
        var factory = this;
        var client_id = factory.metadata.auth.client_id || params.client_id;
        var client_secret = factory.metadata.auth.client_secret || rot13(params.client_secret);

        var customHeaders = params.custom_headers || {};
        if (params.use_basic_client_auth) {
            console.log('Setting basic auth header');
            customHeaders['Authorization'] = 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'));
        }
        var auth = new oauth.OAuth2(client_id,
                                    client_secret,
                                    '',
                                    params.authorize,
                                    params.get_access_token,
                                    customHeaders);
        auth.useAuthorizationHeaderforGET(true);
        var origin = engine.platform.getOrigin();
        var redirect_uri;
        if (params.redirect_uri)
            redirect_uri = params.redirect_uri;
        else
            redirect_uri = origin + '/devices/oauth2/callback/' + factory.metadata.kind;

        if (req === null) {
            // step 1
            var session = {};
            var query = {
                response_type: 'code',
                redirect_uri: redirect_uri,
            };
            if (params.set_access_type)
                query.access_type = 'offline';
            if (params.set_state) {
                var state = crypto.randomBytes(16).toString('hex');
                query.state = state;
                session['oauth2-state-' + factory.metadata.kind] = state;
            }
            if (params.scope)
                query.scope = params.scope.join(' ');

            return [auth.getAuthorizeUrl(query), session];
        } else {
            // step 2
            var code = req.query.code;
            var state = req.query.state;
            if (params.set_state &&
                state !== req.session['oauth2-state-' + factory.metadata.kind])
                return Q.reject(new Error("Invalid CSRF token"));
            delete req.session['oauth2-state-' + factory.metadata.kind];

            var options = {
                grant_type: 'authorization_code',
                redirect_uri: redirect_uri
            };
            return Q.ninvoke(auth, 'getOAuthAccessToken', code, options)
                .then(function(result) {
                    var accessToken = result[0];
                    var refreshToken = result[1];

                    return params.callback(engine, accessToken, refreshToken);
                }).catch((e) => {
                    console.error('Error obtaining access token', e);
                    if (!e.message)
                        throw new Error('Error obtaining access token');
                    else
                        throw e;
                });
        }
    }

    runOAuth2.install = function install(classdef) {
        classdef.refreshCredentials = function() {
            var device = this;
            var origin = device.engine.platform.getOrigin();
            var factory = device.constructor;
            var client_id = factory.metadata.auth.client_id || params.client_id;
            var client_secret = factory.metadata.auth.client_secret || rot13(params.client_secret);
            var auth = new oauth.OAuth2(client_id,
                                        client_secret,
                                        '',
                                        params.authorize,
                                        params.get_access_token);
            auth.useAuthorizationHeaderforGET(true);
            var redirect_uri;
            if (params.redirect_uri)
                redirect_uri = params.redirect_uri;
            else
                redirect_uri = origin + '/devices/oauth2/callback/' + factory.metadata.kind;

            var options = {
                grant_type: 'refresh_token',
                redirect_uri: redirect_uri
            };
            return Q.ninvoke(auth, 'getOAuthAccessToken', device.state.refreshToken, options)
                    .then(function(result) {
                    var accessToken = result[0];

                    device.state.accessToken = accessToken;
                    device.stateChanged();
                }).catch((e) => {
                    console.error('Error obtaining access token', e);
                    if (!e.message)
                        throw new Error('Error obtaining access token');
                    else
                        throw e;
                });
        }

        Object.defineProperty(classdef, 'accessToken', {
            configurable: false,
            enumerable: true,
            get: function() {
                return this.state.accessToken;
            }
        });
        Object.defineProperty(classdef, 'refreshToken', {
            configurable: false,
            enumerable: true,
            get: function() {
                return this.state.refreshToken;
            }
        });

        var oldqueryInterface = classdef.queryInterface;
        classdef.queryInterface = function(iface) {
            if (iface === 'oauth2')
                return this;
            else
                return oldqueryInterface ? oldqueryInterface.call(this, iface) : this.parent(iface);
        }
    }

    return runOAuth2;
}
