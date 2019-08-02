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

const Base = require('./base_generic');
const Utils = require('../utils');
const Helpers = require('../helpers');
const { ImplementationError } = require('../errors');

module.exports = class RSSModule extends Base {
    _loadModule() {
        super._loadModule();

        for (let query in this._manifest.queries) {
            const fndef = this._manifest.queries[query];
            let pollInterval = Utils.getPollInterval(fndef);
            const baseurl = fndef.annotations.url.toJS();

            this._loaded.prototype['get_' + query] = function(params, count, filter) {
                // ignore count and filter

                let url = Utils.formatString(baseurl, this.state, params);
                return Helpers.Rss.get(url, { auth: this.auth, useOAuth2: this });
            };

            if (pollInterval === 0)
                throw new ImplementationError(`Poll interval cannot be 0 for RSS query ${query}`);
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
        for (let action in this._manifest.actions)
            throw new ImplementationError(`Invalid action ${action}: RSS devices cannot have actions`);
    }
};
