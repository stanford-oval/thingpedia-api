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
import * as crypto from 'crypto';
import * as qs from 'querystring';

import { OAuthError } from '../errors';
import type BaseEngine from '../base_engine';
import type BaseDevice from '../base_device';
import * as Http from './http';

/* eslint-disable no-invalid-this */

type OAuthCodeQuery = {
    response_type : 'code';
    redirect_uri : string;
    client_id : string;
    access_type ?: string;
    state ?: string;
    scope ?: string;
    code_challenge ?: string;
    code_challenge_method ?: 'S256';
};

namespace OAuth2Helper {
export interface OAuthHelperParams<T extends BaseDevice> {
    use_basic_client_auth ?: boolean;
    custom_headers ?: Record<string, string>;
    authorize : string;
    get_access_token : string;
    redirect_uri ?: string;
    set_access_type ?: boolean;
    set_state ?: boolean;
    use_pkce ?: boolean;
    scope ?: string[];
    callback ?: (engine : BaseEngine, accessToken : string, refreshToken : string|undefined, extraData : Record<string, unknown>) => Promise<T>;
}

export type DeviceClass<T extends BaseDevice> = BaseDevice.DeviceClass<T> & {
    loadFromOAuth2(engine : BaseEngine, accessToken : string, refreshToken : string, extraData : Record<string, unknown>) : Promise<T>;
};

export interface HTTPRequest {
    query : Record<string, string|string[]|undefined>;
    session : Record<string, string>;
}

export interface OAuthRunner<T extends BaseDevice> {
    (this : DeviceClass<T>, engine : BaseEngine, req : null) : [string, Record<string, string>];
    (this : DeviceClass<T>, engine : BaseEngine, req : HTTPRequest) : Promise<T|null>;
    install(classdef : T) : void;
}
}

interface NormalizedOAuthParams {
    client_id : string;
    client_secret : string;
    redirect_uri : string;
    custom_headers : Record<string, string>;
    authorize : string;
    get_access_token : string;
    use_pkce : boolean;
}

function normalizeOAuthParams<T extends BaseDevice>(params : OAuth2Helper.OAuthHelperParams<T>,
                                                    factory : OAuth2Helper.DeviceClass<T>,
                                                    engine : BaseEngine) : NormalizedOAuthParams {
    if (!factory.metadata.auth.client_id)
        throw new OAuthError('Missing OAuth Client ID in Authentication part of the manifest');
    const client_id = factory.metadata.auth.client_id;
    if (factory.metadata.auth.client_secret === undefined)
        throw new OAuthError('Missing OAuth Client Secret in Authentication part of the manifest');
    const client_secret = factory.metadata.auth.client_secret;

    const custom_headers = params.custom_headers || {};
    if (params.use_basic_client_auth)
        custom_headers['Authorization'] = 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'));

    const origin = engine.platform.getOAuthRedirect();
    let redirect_uri;
    if (params.redirect_uri)
        redirect_uri = params.redirect_uri;
    else
        redirect_uri = origin + '/devices/oauth2/callback/' + factory.metadata.kind;

    return {
        client_id, client_secret, redirect_uri, custom_headers,
        authorize: params.authorize,
        get_access_token: params.get_access_token,
        use_pkce: !!params.use_pkce
    };
}

function sha256(x : string) : Buffer {
    const hash = crypto.createHash('sha256');
    hash.update(x);
    return hash.digest();
}

function toBase64URL(x : Buffer) : string {
    try {
        return x.toString('base64url');
    } catch(e) {
        if (e.code !== 'ERR_UNKNOWN_ENCODING')
            throw e;
        return x.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
}

function oauthPart1<T extends BaseDevice>(params : OAuth2Helper.OAuthHelperParams<T>,
                                          factory : OAuth2Helper.DeviceClass<T>,
                                          engine : BaseEngine) : [string, Record<string, string>] {
    const normalized = normalizeOAuthParams(params, factory, engine);

    const session : Record<string, string> = {};
    const query : OAuthCodeQuery = {
        response_type: 'code',
        redirect_uri: normalized.redirect_uri,
        client_id: normalized.client_id
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
    if (normalized.use_pkce) {
        // PKCE is an extension of OAuth 2.0 that avoids the need of a client
        // secret

        // First generate a random verifier
        // Following https://datatracker.ietf.org/doc/html/rfc7636#section-4.1
        // we generate 32 random bytes and convert them to a 43 byte base64 string
        const verifier = toBase64URL(crypto.randomBytes(32));

        // Then generate the challenge
        // We only support the S256 method
        query.code_challenge = toBase64URL(sha256(verifier));
        query.code_challenge_method = 'S256';

        // Finally we store the verifier for later
        session['oauth2-pkce-' + factory.metadata.kind] = verifier;
    }

    return [params.authorize + '?' + qs.stringify(query), session];
}

type OAuthGrant = ({
    grant_type : 'authorization_code';
    code : string;
    code_verifier ?: string;
} | {
    grant_type : 'refresh_token';
    refresh_token : string;
}) & {
    client_id ?: string;
    client_secret ?: string;
    redirect_uri ?: string;
};
interface OAuthAccessTokenResult {
    access_token : string;
    refresh_token ?: string;
    expires_in ?: number;
    [key : string] : unknown;
}

async function getOAuthAccessToken(params : NormalizedOAuthParams,
                                   grant : OAuthGrant) : Promise<OAuthAccessTokenResult> {
    grant.client_id = params.client_id;
    if (!params.use_pkce)
        grant.client_secret = params.client_secret;
    grant.redirect_uri = params.redirect_uri;

    const response = await Http.post(params.get_access_token, qs.stringify(grant), {
        dataContentType: 'application/x-www-form-urlencoded',
        extraHeaders: params.custom_headers
    });

    let results : OAuthAccessTokenResult;
    try {
        results = JSON.parse(response);
    } catch(e) {
        if (e.name !== 'SyntaxError')
            throw e;
        results = qs.parse(response) as OAuthAccessTokenResult;
    }

    return results;
}

async function oauthPart2<T extends BaseDevice>(params : OAuth2Helper.OAuthHelperParams<T>,
                                                factory : OAuth2Helper.DeviceClass<T>,
                                                engine : BaseEngine,
                                                req : OAuth2Helper.HTTPRequest) : Promise<T|null> {
    const normalized = normalizeOAuthParams(params, factory, engine);

    const expectedState = req.session['oauth2-state-' + factory.metadata.kind];
    delete req.session['oauth2-state-' + factory.metadata.kind];

    // according to RFC 6749, if the user cancels, or some error
    // occurs, the browser is redirected to the configured redirect URL,
    // but with the `error` query parameter set to an error code
    // (https://tools.ietf.org/html/rfc6749#section-4.1.2.1)
    //
    // Of the error codes defined, `access_denied` can be triggered
    // legitimately if the user cancels / changes their mind, while
    // the others are all programming or configuration errors
    if (req.query.error) {
        if (req.query.error === 'access_denied') {
            // if the user cancels, do nothing, successfully
            return Promise.resolve(null);
        } else {
            // fail with an error - the error is in Thingpedia, not
            // in the client

            let msg;
            if (req.query.error_description)
                msg = String(req.query.error_description);
            else
                msg = String(req.query.error);

            throw new OAuthError(msg);
        }
    }

    const code = req.query.code;
    assert(typeof code === 'string');

    // NOTE: according to RFC 6749, `state` should be set on errors too
    // we are more lenient, and allow state to be unset on errors
    const state = req.query.state;
    if (params.set_state && state !== expectedState)
        throw new OAuthError("Invalid CSRF token");

    try {
        const grant : OAuthGrant = {
            grant_type: 'authorization_code',
            code: code
        };
        if (normalized.use_pkce) {
            const pkceVerifier = req.session['oauth2-pkce-' + factory.metadata.kind];
            delete req.session['oauth2-pkce-' + factory.metadata.kind];
            grant.code_verifier = pkceVerifier;
        }

        const result = await getOAuthAccessToken(normalized, grant);
        if (params.callback)
            return await params.callback(engine, result.access_token, result.refresh_token, result);
        else
            return await factory.loadFromOAuth2(engine, result.access_token, result.refresh_token, result) as T;
    } catch(e) {
        console.error('Error obtaining access token', e);
        if (!e.message)
            throw new OAuthError('Error obtaining access token');
        else
            throw new OAuthError(e.message);
    }
}

async function oauthRefresh<T extends BaseDevice>(self : T,
                                                  params : OAuth2Helper.OAuthHelperParams<T>) {
    const factory = self.constructor as OAuth2Helper.DeviceClass<T>;
    const normalized = normalizeOAuthParams(params, factory, self.engine);

    try {
        const result = await getOAuthAccessToken(normalized, {
            grant_type: 'refresh_token',
            refresh_token: self.state.refreshToken!
        });
        await self.updateOAuth2Token(result.access_token, result.refresh_token, result);
    } catch(e) {
        console.error('Error obtaining access token', e);
        if (!e.message)
            throw new OAuthError('Error obtaining access token');
        else
            throw new OAuthError(e.message);
    }
}

function OAuth2Helper<T extends BaseDevice>(params : OAuth2Helper.OAuthHelperParams<T>) : OAuth2Helper.OAuthRunner<T> {
    function runOAuth2(this : OAuth2Helper.DeviceClass<T>, engine : BaseEngine, req : null) : [string, Record<string, string>];
    function runOAuth2(this : OAuth2Helper.DeviceClass<T>, engine : BaseEngine, req : OAuth2Helper.HTTPRequest) : Promise<T|null>;
    function runOAuth2(this : OAuth2Helper.DeviceClass<T>, engine : BaseEngine, req : OAuth2Helper.HTTPRequest|null) {
        if (req === null) {
            // step 1
            return oauthPart1(params, this, engine);
        } else {
            // step 2
            return oauthPart2(params, this, engine, req);
        }
    }

    runOAuth2.install = function install(classdef : T) {
        Object.defineProperty(classdef, 'refreshCredentials', {
            value: function refreshCredentials(this : T) : Promise<void> {
                return oauthRefresh(this, params);
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

        const oldqueryInterface = classdef.queryInterface;
        Object.defineProperty(classdef, 'queryInterface', {
            value: function queryInterface(iface : string) {
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
}
export default OAuth2Helper;
