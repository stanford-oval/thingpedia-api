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

import Base from './base_generic';
import * as Utils from '../utils';
import * as Helpers from '../helpers';
import { ImplementationError } from '../errors';

/**
 * Loader for device classes that use RSS.
 */
export default class RSSLoader extends Base {
    protected _loadModule() {
        super._loadModule();

        for (const [query, fndef] of this._iterateFunctions(this._manifest, 'queries')) {
            const pollInterval = Utils.getPollInterval(fndef);
            const baseurl = fndef.getImplementationAnnotation<string>('url')!;

            this._loaded!.prototype['get_' + query] = function(params : any, hints : any) {
                // ignore count and filter

                const url = Utils.formatString(baseurl, this.state, params)!;
                return Helpers.Rss.get(url, { auth: this.auth, useOAuth2: this });
            };

            if (pollInterval === 0)
                throw new ImplementationError(`Poll interval cannot be 0 for RSS query ${query}`);
            if (pollInterval > 0) {
                this._loaded!.prototype['subscribe_' + query] = function(params : any, state : any, hints : any) {
                    return new Helpers.PollingStream(state, pollInterval, () => this['get_' + query](params));
                };
            } else {
                this._loaded!.prototype['subscribe_' + query] = function(params : any, state : any, hints : any) {
                    throw new Error('This query is non-deterministic and cannot be monitored');
                };
            }
        }
        for (const action in this._manifest.actions)
            throw new ImplementationError(`Invalid action ${action}: RSS devices cannot have actions`);
    }
}
