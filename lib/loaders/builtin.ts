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

import BaseJavascriptLoader from './base_js';
import ModuleDownloader from '../downloader';
import BaseDevice from '../base_device';

/**
 * Loader for Thingpedia devices that are shipped inside Genie
 * itself.
 */
export default class BuiltinLoader extends BaseJavascriptLoader {
    private _loaded : BaseDevice.DeviceClass<BaseDevice>;

    constructor(kind : string,
                manifest : ThingTalk.Ast.ClassDef,
                parents : Record<string, ThingTalk.Ast.ClassDef>,
                loader : ModuleDownloader,
                deviceClass : BaseDevice.DeviceClass<BaseDevice>) {
        // version does not matter for builtin modules
        manifest.annotations.version = new ThingTalk.Ast.Value.Number(0);
        super(kind, manifest, parents, loader);
        this._loaded = deviceClass;
    }

    clearCache() {
        // nothing to do here
    }
    async _doGetDeviceClass() {
        return this._completeLoading(this._loaded);
    }
}
