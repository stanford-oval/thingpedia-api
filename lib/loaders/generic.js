// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Utils = require('../utils');
const Helpers = require('../helpers');
const Base = require('./base_generic');
const { ImplementationError } = require('../errors');

module.exports = class GenericRestModule extends Base {
    _loadModule() {
        super._loadModule();

        for (let action in this._manifest.actions) {
            const fndef = this._manifest.actions[action];
            const baseurl = fndef.annotations.url.toJS();
            let method = 'POST';
            if (fndef.annotations.method)
                method = fndef.annotations.method.toJS();

            this._loaded.prototype['do_' + action] = function(params) {
                const url = Utils.formatString(baseurl, this.state, params);
                return Helpers.Http.request(url, method, JSON.stringify(params),
                                    { auth: this.auth,
                                      useOAuth2: this,
                                      dataContentType: 'application/json' });
            };
        }

        for (let query in this._manifest.queries) {
            const fndef = this._manifest.queries[query];
            const pollInterval = Utils.getPollInterval(fndef);
            const baseurl = fndef.annotations.url.toJS();
            let method = 'GET';
            if (fndef.annotations.method)
                method = fndef.annotations.method.toJS();

            this._loaded.prototype['get_' + query] = function(params, filter, count) {
                // ignore count and filter

                const url = Utils.formatString(baseurl, this.state, params);
                let data = null;
                if (method !== "GET")
                    data = JSON.stringify(params);

                return Helpers.Http.request(url, method, data, {
                    dataContentType: (method === 'GET' ? null : 'application/json'),
                    auth: this.auth,
                    useOAuth2: this,
                    accept: 'application/json' }).then((response) => {
                    let parsed = JSON.parse(response);
                    return Utils.parseGenericResponse(parsed, fndef);
                });
            };

            if (pollInterval === 0)
                throw new ImplementationError(`Poll interval cannot be 0 for REST query ${query}`);
            if (pollInterval > 0) {
                this._loaded.prototype['subscribe_' + query] = function(params, state, filter) {
                    return new Helpers.PollingStream(state, pollInterval, () => this['get_' + query](params));
                };
            } else {
                this._loaded.prototype['subscribe_' + query] = function(params, state, filter) {
                    throw new Error('This query is non-deterministic and cannot be monitored');
                };
            }
            this._loaded.prototype['history_' + query] = function(params, base, delta, filters) {
                return null; // no history
            };
            this._loaded.prototype['sequence_' + query] = function(params, base, limit, filters) {
                return null; // no sequence history
            };
        }
    }
};
