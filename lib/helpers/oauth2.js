//
// This file is part of ThingEngine
//
// Copyright 2015-2016 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const crypto = require('crypto');
const oauth = require('oauth');

// encryption ;)
function rot13(x) {
    return Array.prototype.map.call(x, (ch) => {
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
        const factory = this;
        if (!factory.metadata.auth.client_id && !params.client_id)
            throw new Error('Missing OAuth Client ID in Authentication part of the manifest');
        const client_id = factory.metadata.auth.client_id || params.client_id;
        if (!factory.metadata.auth.client_secret && !params.client_secret)
            throw new Error('Missing OAuth Client Secret in Authentication part of the manifest');
        const client_secret = factory.metadata.auth.client_secret || rot13(params.client_secret);

        const customHeaders = params.custom_headers || {};
        if (params.use_basic_client_auth) {
            console.log('Setting basic auth header');
            customHeaders['Authorization'] = 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'));
        }
        const auth = new oauth.OAuth2(client_id,
                                      client_secret,
                                      '',
                                      params.authorize,
                                      params.get_access_token,
                                      customHeaders);
        auth.useAuthorizationHeaderforGET(true);
        const origin = engine.platform.getOrigin();
        let redirect_uri;
        if (params.redirect_uri)
            redirect_uri = params.redirect_uri;
        else
            redirect_uri = origin + '/devices/oauth2/callback/' + factory.metadata.kind;

        if (req === null) {
            // step 1
            const session = {};
            const query = {
                response_type: 'code',
                redirect_uri: redirect_uri,
            };
            if (params.set_access_type)
                query.access_type = 'offline';
            if (params.set_state) {
                const state = crypto.randomBytes(16).toString('hex');
                query.state = state;
                session['oauth2-state-' + factory.metadata.kind] = state;
            }
            if (params.scope)
                query.scope = params.scope.join(' ');

            return [auth.getAuthorizeUrl(query), session];
        } else {
            // step 2
            const code = req.query.code;
            const state = req.query.state;
            if (params.set_state &&
                state !== req.session['oauth2-state-' + factory.metadata.kind])
                return Promise.reject(new Error("Invalid CSRF token"));
            delete req.session['oauth2-state-' + factory.metadata.kind];

            const options = {
                grant_type: 'authorization_code',
                redirect_uri: redirect_uri
            };
            return new Promise((resolve, reject) => {
                auth.getOAuthAccessToken(code, options, (err, accessToken, refreshToken, extraData) => {
                    if (err)
                        reject(err);
                    else
                        resolve([accessToken, refreshToken, extraData]);
                });
            }).then(([accessToken, refreshToken, extraData]) => {
                return params.callback(engine, accessToken, refreshToken, extraData);
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
        Object.defineProperty(classdef, 'refreshCredentials', {
            value: function refreshCredentials() {
                const origin = this.engine.platform.getOrigin();
                const factory = this.constructor;
                const client_id = factory.metadata.auth.client_id || params.client_id;
                const client_secret = factory.metadata.auth.client_secret || rot13(params.client_secret);
                const auth = new oauth.OAuth2(client_id,
                                              client_secret,
                                              '',
                                              params.authorize,
                                              params.get_access_token);
                auth.useAuthorizationHeaderforGET(true);
                let redirect_uri;
                if (params.redirect_uri)
                    redirect_uri = params.redirect_uri;
                else
                    redirect_uri = origin + '/devices/oauth2/callback/' + factory.metadata.kind;

                const options = {
                    grant_type: 'refresh_token',
                    redirect_uri: redirect_uri
                };
                return new Promise((resolve, reject) => {
                    auth.getOAuthAccessToken(this.state.refreshToken, options, (err, accessToken) => {
                        if (err)
                            reject(err);
                        else
                            resolve(accessToken);
                    });
                }).then((accessToken) => {
                    this.state.accessToken = accessToken;
                    this.stateChanged();
                }).catch((e) => {
                    console.error('Error obtaining access token', e);
                    if (!e.message)
                        throw new Error('Error obtaining access token');
                    else
                        throw e;
                });
            },
            configurable: true,
            enumerable: false,
            writable: true
        });

        // ignore errors definining the properties, in case
        // a class already has its own definitions
        try {
            Object.defineProperty(classdef, 'accessToken', {
                configurable: false,
                enumerable: true,
                get: function() {
                    return this.state.accessToken;
                }
            });
        } catch(e) {
            // ignore
        }
        try {
            Object.defineProperty(classdef, 'refreshToken', {
                configurable: false,
                enumerable: true,
                get: function() {
                    return this.state.refreshToken;
                }
            });
        } catch(e) {
            // ignore
        }

        var oldqueryInterface = classdef.queryInterface;
        Object.defineProperty(classdef, 'queryInterface', {
            value: function queryInterface(iface) {
                if (iface === 'oauth2')
                    return this;
                else
                    return oldqueryInterface ? oldqueryInterface.call(this, iface) : null;
            },
            configurable: true,
            enumerable: false,
            writable: true
        });
    };

    return runOAuth2;
};
