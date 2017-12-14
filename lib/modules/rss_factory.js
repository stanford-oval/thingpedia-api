// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Helpers = require('../helpers');
const PollingStream = Helpers.PollingStream;
const BaseDevice = require('../base_device');

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

function invokeQuery(device, auth, url) {
    return Helpers.Rss.get(url, { auth: auth, useOAuth2: device });
}

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

module.exports = class RSSModule {
    constructor(kind, ast) {
        this._id = kind;
        this._manifest = ast;
        var isNoneFactory = ast.auth.type === 'none' && Object.keys(ast.params).length === 0;
        var isNoneAuth = ast.auth.type === 'none';

        this._loaded = class GenericRSSDevice extends BaseDevice {
            constructor(engine, state) {
                super(engine, state);

                var params = Object.keys(ast.params);

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
                    this.name = String.prototype.format.apply(ast.name, this.params);
                if (ast.description !== undefined) {
                    this.description = String.prototype.format.apply(ast.description,
                                                                     this.params);
                }

                console.log('RSS device ' + this.name + ' initialized');
            }

            checkAvailable() {
                return BaseDevice.Availability.AVAILABLE;
            }
        };
        this._loaded.metadata = ast;

        const authfn = makeAuth(ast);
        for (let query in ast.queries) {
            const block = ast.queries[query];
            let pollInterval = module.manifest.queries[query].poll_interval;
            if (!pollInterval)
                pollInterval = module.manifest.queries[query]['poll-interval'];

            this._loaded.prototype['get_' + query] = function(params, count, filter) {
                // ignore count and filter

                let url = String.prototype.format.apply(block.url, this.device.params);
                return invokeQuery(this, authfn(this), url);
            };
            this._loaded.prototype['subscribe_' + query] = function(params, state, filter) {
                return new PollingStream(state, pollInterval, () => this['get_' + query](params));
            };
            this._loaded.prototype['history_' + query] = function(params, base, delta, filters) {
                return null; // no history
            };
            this._loaded.prototype['sequence_' + query] = function(params, base, limit, filters) {
                return null; // no sequence history
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
