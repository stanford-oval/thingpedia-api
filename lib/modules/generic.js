// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const BaseDevice = require('../base_device');
const Helpers = require('../helpers');
const Utils = require('./utils');

function makeAuth(ast) {
    if (ast.auth.type === 'none') {
        return () => undefined;
    } else if (ast.auth.type === 'oauth2') {
        return () => undefined;
    } else if (ast.auth.type === 'basic') {
        return (device) => ('Basic ' + (new Buffer(device.username + ':' +
                                          device.password)).toString('base64'));
    } else {
        return () => undefined;
    }
}

// FIXME webhooks
// FIXME websockets

function makeOAuth(kind, ast, devclass) {
    function OAuthCallback(engine, accessToken, refreshToken) {
        var obj = { kind: kind,
                    accessToken: accessToken,
                    refreshToken: refreshToken };

        if (ast.auth.get_profile) {
            var auth = 'Bearer ' + accessToken;
            return Helpers.Http.get(ast.auth.get_profile, { auth: auth,
                                                            accept: 'application/json' })
                .then((response) => {
                    var profile = JSON.parse(response);

                    ast.auth.profile.forEach((p) => {
                        obj[p] = profile[p];
                    });

                    return engine.devices.loadOneDevice(obj, true);
                });
        } else {
            return engine.devices.loadOneDevice(obj, true);
        }
    }

    var runOAuth2 = Helpers.OAuth2({ kind: kind,
                                     client_id: ast.auth.client_id,
                                     client_secret: ast.auth.client_secret,
                                     authorize: ast.auth.authorize,
                                     get_access_token: ast.auth.get_access_token,
                                     set_state: ast.auth.set_state,
                                     callback: OAuthCallback });
    runOAuth2.install(devclass.prototype);
    devclass.runOAuth2 = runOAuth2;
}

module.exports = class GenericRestModule {
    constructor(kind, ast) {
        this._id = kind;
        this._manifest = ast;

        const isNoneFactory = ast.auth.type === 'none' && Object.keys(ast.params).length === 0;
        const isNoneAuth = ast.auth.type === 'none';
        this._loaded = class GenericRestDevice extends BaseDevice {
            constructor(engine, state) {
                super(engine, state);

                let params = Object.keys(ast.params);
                if (isNoneFactory)
                    this.uniqueId = kind;
                else if (isNoneAuth)
                    this.uniqueId = kind + '-' + params.map((k) => (k + '-' + state[k])).join('-');
                else
                    this.uniqueId = undefined; // let DeviceDatabase pick something

                if (ast.auth.type === 'oauth2' && Array.isArray(ast.auth.profile))
                    params = params.concat(ast.auth.profile);

                this.params = params.map((k) => state[k]);
                if (ast.name !== undefined)
                    this.name = Utils.formatString(ast.name, this.state);
                if (ast.description !== undefined)
                    this.description = Utils.formatString(ast.description, this.state);

                console.log('Generic device ' + this.name + ' initialized');
            }

            checkAvailable() {
                return BaseDevice.Availability.AVAILABLE;
            }

            refreshCredentials() {
                // FINISHME refresh the access token using the refresh token
            }
        };
        this._loaded.metadata = ast;

        const authfn = makeAuth(ast);
        for (let action in ast.actions) {
            const block = ast.actions[action];

            this._loaded.prototype['do_' + action] = function(params) {
                const props = {};
                for (let name in block) {
                    if (typeof block[name] === 'string')
                        props[name] = Utils.formatString(block[name], this.state, params);
                    else
                        props[name] = block[name];
                }
                if (!props.url)
                    throw new Error('Must specify endpoint url');
                let defaultobj = props['default'] || {};
                let method = props.method || 'POST';

                var obj = {};
                Object.assign(obj, defaultobj);
                Object.assign(obj, params);
                return Helpers.Http.request(props.url, method, JSON.stringify(obj),
                                    { auth: authfn(this),
                                      useOAuth2: this,
                                      dataContentType: 'application/json' });
            };
        }

        if (ast.auth.type === 'oauth2')
            makeOAuth(kind, ast, this._loaded);
    }

    get id() {
        return this._id;
    }
    get manifest() {
        return this._manifest;
    }
    get version() {
        return this._manifest.version;
    }

    clearCache() {
        // nothing to do here
    }

    getDeviceFactory() {
        return this._loaded;
    }
};
