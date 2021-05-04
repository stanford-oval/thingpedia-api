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

import { makeBaseDeviceMetadata } from '../compat';
import { UnsupportedError } from '../errors';
import BaseDevice from '../base_device';

import type BaseEngine from '../base_engine';
import type ModuleDownloader from '../downloader';

export default class UnsupportedBuiltinModule {
    private _id : string;
    private _manifest : ThingTalk.Ast.ClassDef;
    private _loaded : BaseDevice.DeviceClass<BaseDevice>;

    constructor(id : string,
                manifest : ThingTalk.Ast.ClassDef,
                loader : ModuleDownloader) {
        // version does not matter for builtin modules
        manifest.annotations.version = new ThingTalk.Ast.Value.Number(0);
        this._id = id;
        this._manifest = manifest;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this._loaded = class UnsupportedDevice extends BaseDevice {
            constructor(engine : BaseEngine, state : BaseDevice.DeviceState) {
                super(engine, state);

                this.uniqueId = this.kind;
            }

            async checkAvailable() {
                return BaseDevice.Availability.OWNER_UNAVAILABLE;
            }
        };

        for (const action in manifest.actions) {
            (this._loaded.prototype as any)['do_' + action] = function() {
                throw new UnsupportedError();
            };
        }
        for (const query in manifest.queries) {
            (this._loaded.prototype as any)['get_' + query] = function() {
                throw new UnsupportedError();
            };
            (this._loaded.prototype as any)['subscribe_' + query] = function() {
                throw new UnsupportedError();
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
        return this._manifest.getImplementationAnnotation<number>('version')!;
    }

    clearCache() {
        // nothing to do here
    }

    getDeviceClass() {
        return Promise.resolve(this._loaded);
    }
}
