// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2017 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const BaseJavascriptModule = require('./base_js');
const PollingStream = require('../helpers/polling');

module.exports = class ThingpediaModuleV2 extends BaseJavascriptModule {
    _completeLoading(module) {
        for (let query in this.manifest.queries) {
            if (!module.prototype['subscribe_' + query]) {
                const pollInterval = this.manifest.queries[query].poll_interval;
                module.prototype['subscribe_' + query] = function(params, state, filter) {
                    return new PollingStream(state, pollInterval, () => {
                        return this['get_' + query](params);
                    });
                };
            }
            if (!module.prototype['history_' + query]) {
                module.prototype['history_' + query] = function(params, base, delta, filters) {
                    return null; // no history
                };
            }
            if (!module.prototype['sequence_' + query]) {
                module.prototype['sequence_' + query] = function(params, base, limit, filters) {
                    return null; // no sequence history
                };
            }
        }
    }
};
