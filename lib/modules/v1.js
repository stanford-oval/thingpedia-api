// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2017 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const BaseJavascriptModule = require('./base_js');

module.exports = class ThingpediaModuleV1 extends BaseJavascriptModule {
    _completeLoading(module) {
        console.log('ModuleType org.thingpedia.v1 is deprecated, switch to v2');

        for (let query in this.manifest.queries) {
            const queryArgs = this.manifest.queries[query].args;

            module.prototype['get_' + query] = function(params, count, filter) {
                // replicate what ChannelFactory used to do, in a simplified best effort way
                let channelClass = this.getQueryClass(query);
                let channel = new channelClass(this._engine, this);

                let linearParams = queryArgs.map((a) => params[a.name]);
                // ignore count and filter
                return channel.invokeQuery(linearParams).then((results) => results.map((r) => {
                    let obj = {};
                    queryArgs.forEach((arg, i) => {
                        obj[arg.name] = r[i];
                    });
                    return obj;
                }));
            };
            module.prototype['subscribe_' + query] = function(params, state, filter) {
                throw new Error('Monitor of legacy queries is not implemented, switch to V2 module instead');
            };
            module.prototype['history_' + query] = function(params, base, delta, filters) {
                return null; // no history
            };
            module.prototype['sequence_' + query] = function(params, base, limit, filters) {
                return null; // no sequence history
            };
        }
        for (let action in this.manifest.actions) {
            const actionArgs = this.manifest.actions[action].args;

            module.prototype['do_' + action] = function(params) {
                // replicate what ChannelFactory used to do, in a simplified best effort way

                let channelClass = this.getActionClass(action);
                let channel = new channelClass(this._engine, this);

                let linearParams = actionArgs.map((a) => params[a.name]);
                return channel.sendEvent(linearParams);
            };
        }
    }
};
