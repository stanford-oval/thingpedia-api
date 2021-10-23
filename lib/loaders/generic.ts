// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
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
import Base from './base_generic';
import { ImplementationError } from '../errors';

/**
 * Loader for devices that use the generic REST interface.
 */
export default class GenericRestLoader extends Base {
    protected _loadModule() {
        super._loadModule();

        for (const [action, fndef] of this._iterateFunctions(this._manifest, 'actions')) {
            const baseurl = fndef.getImplementationAnnotation<string>('url')!;
            const method =  fndef.getImplementationAnnotation<string>('method') || 'POST';

            this._loaded!.prototype['do_' + action] = function(params : any) {
                const url = Utils.formatString(baseurl, this.state, params)!;
                return Helpers.Http.request(url, method, JSON.stringify(params),
                    { auth: this.auth,
                                      useOAuth2: this,
                                      dataContentType: 'application/json' });
            };
        }

        for (const [query, fndef] of this._iterateFunctions(this._manifest, 'queries')) {
            const pollInterval = Utils.getPollInterval(fndef);
            const baseurl = fndef.getImplementationAnnotation<string>('url')!;
            const method =  fndef.getImplementationAnnotation<string>('method') || 'GET';

            this._loaded!.prototype['get_' + query] = function(params : any, hints : any, env : any) {
                // ignore count and filter

                const url = Utils.formatString(baseurl, this.state, params)!;
                let data = null;
                if (method !== "GET")
                    data = JSON.stringify(params);

                return Helpers.Http.request(url, method, data, {
                    dataContentType: (method === 'GET' ? undefined : 'application/json'),
                    auth: this.auth,
                    useOAuth2: this,
                    accept: 'application/json' }).then((response) => {
                    const parsed = JSON.parse(response);
                    return Utils.parseGenericResponse(parsed, fndef);
                });
            };

            if (pollInterval === 0)
                throw new ImplementationError(`Poll interval cannot be 0 for REST query ${query}`);
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
