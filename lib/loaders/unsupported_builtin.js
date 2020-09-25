// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
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

import { makeBaseDeviceMetadata } from '../compat';
import { UnsupportedError } from '../errors';
import BaseDevice from '../base_device';

export default class UnsupportedBuiltinModule {
    constructor(id, manifest, loader) {
        // version does not matter for builtin modules
        manifest.annotations.version = new ThingTalk.Ast.Value.Number(0);
        this._id = id;
        this._manifest = manifest;

        this._loaded = class UnsupportedDevice extends BaseDevice {
            constructor(engine, state) {
                super(engine, state);

                this.uniqueId = this.kind;
            }

            checkAvailable() {
                return BaseDevice.Availability.OWNER_UNAVAILABLE;
            }
        };

        for (let action in manifest.actions) {
            this._loaded.prototype['do_' + action] = function(params) {
                throw new UnsupportedError();
            };
        }
        for (let query in manifest.queries) {
            this._loaded.prototype['get_' + query] = function(params, filter, count) {
                throw new UnsupportedError();
            };
            this._loaded.prototype['subscribe_' + query] = function(params, state, filter) {
                throw new UnsupportedError();
            };
            this._loaded.prototype['history_' + query] = function(params, base, delta, filters) {
                return null; // no history
            };
            this._loaded.prototype['sequence_' + query] = function(params, base, limit, filters) {
                return null; // no sequence history
            };
        }

        this._loaded.metadata = makeBaseDeviceMetadata(manifest);
    }

    get id() {
        return this._id;
    }
    get manifest() {
        return this._manifest;
    }
    get version() {
        return this._manifest.annotations.version.toJS();
    }

    clearCache() {
        // nothing to do here
    }

    getDeviceClass() {
        return Promise.resolve(this._loaded);
    }
}
