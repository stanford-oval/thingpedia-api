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


import * as Utils from '../utils';
import { makeBaseDeviceMetadata } from '../compat';
import * as ConfigMixins from '../config';
import BaseDevice from '../base_device';

export default class BaseGenericModule {
    constructor(kind, ast) {
        this._id = kind;
        this._manifest = ast;
        this._loaded = null;

        this._config = ConfigMixins.get(this._manifest);
    }

    _loadModule() {
        let params = [];
        if (this._config.module === 'org.thingpedia.config.form')
            params = Object.keys(Utils.findMixinArg(this._config.mixin, 'params'));
        else if (this._config.module === 'org.thingpedia.config.oauth2')
            params = Utils.findMixinArg(this._config.mixin, 'profile') || [];

        this._loaded = class GenericDevice extends BaseDevice {
            constructor(engine, state) {
                super(engine, state);
                this.params = params.map((k) => state[k]);
            }

            checkAvailable() {
                return BaseDevice.Availability.AVAILABLE;
            }
        };
        if (this._config)
            this._config.install(this._loaded);

        this._loaded.manifest = this._manifest;
        this._loaded.metadata = makeBaseDeviceMetadata(this._manifest);
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
        if (this._loaded === null) {
            try {
                this._loadModule();
            } catch(e) {
                this._loaded = null;
                return Promise.reject(e);
            }
        }
        return Promise.resolve(this._loaded);
    }
}
