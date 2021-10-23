// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
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

import * as ThingTalk from 'thingtalk';

import * as Utils from '../utils';
import * as Helpers from '../helpers';
import { UnsupportedError } from '../errors';
import BaseClient from '../base_client';
import ModuleDownloader from '../downloader';

import Base from './base_generic';

/**
 * A loader that creates a device class proxying all ThingTalk function calls through the
 * Thingpedia API.
 *
 * This is used when a Thingpedia skill is unavailable locally due to missing
 * API keys.
 */
export default class ProxyLoader extends Base {
    private _tpClient : BaseClient;

    constructor(kind : string, manifest : ThingTalk.Ast.ClassDef, parents : Record<string, ThingTalk.Ast.ClassDef>, loader : ModuleDownloader) {
        super(kind, manifest, parents);

        this._tpClient = loader.client;
    }

    protected _loadModule() {
        super._loadModule();

        const tpClient = this._tpClient;
        for (const [action,] of this._iterateFunctions(this._manifest, 'actions')) {
            this._loaded!.prototype['do_' + action] = function(params : Record<string, unknown>) {
                // actions cannot be proxied
                throw new UnsupportedError();
            };
        }

        for (const [query, fndef] of this._iterateFunctions(this._manifest, 'queries')) {
            const pollInterval = Utils.getPollInterval(fndef);

            this._loaded!.prototype['get_' + query] = function(params : Record<string, unknown>, hints : ThingTalk.Runtime.CompiledQueryHints, env : ThingTalk.ExecEnvironment) {
                return tpClient.invokeQuery(this.kind, this.uniqueId!, query, params, hints);
            };

            if (pollInterval === 0) {
                this._loaded!.prototype['subscribe_' + query] = function() {
                    // subscribe calls cannot be proxied yet, because the subscription state would need to be replicated
                    // on the server
                    throw new UnsupportedError();
                };
            }
            if (pollInterval > 0) {
                this._loaded!.prototype['subscribe_' + query] = function(params : Record<string, unknown>, state : any, hints : ThingTalk.Runtime.CompiledQueryHints, env : ThingTalk.ExecEnvironment) {
                    return new Helpers.PollingStream(state, pollInterval, () => this['get_' + query](params, hints, env));
                };
            } else {
                this._loaded!.prototype['subscribe_' + query] = function() {
                    throw new Error('This query is non-deterministic and cannot be monitored');
                };
            }
        }
    }
}
