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

import { Ast } from 'thingtalk';

import BaseDevice from '../base_device';

export default class BaseConfigMixin {
    private _classdef : Ast.ClassDef;
    private _mixin : Ast.MixinImportStmt;

    constructor(classdef : Ast.ClassDef) {
        this._classdef = classdef;
        this._mixin = classdef.config!;
    }

    get classdef() {
        return this._classdef;
    }
    get kind() {
        return this._classdef.kind;
    }
    get mixin() {
        return this._mixin;
    }
    get module() {
        return this._mixin.module;
    }

    /**
     * Check if some API keys or secrets are missing in this config mixin.
     *
     * This is indicated by an $? value in the manifest that survived after
     * loading secrets.json
     *
     * Returning true causes the module to fail to load directly, and forces
     * the use of a proxy through the Thingpedia API.
     *
     * @returns `true` if some config parameters are missing, `false` otherwise
     */
    hasMissingKeys() {
        return this._mixin.in_params.some((ip) => ip.value.isUndefined);
    }

    install(deviceClass : BaseDevice.DeviceClass<BaseDevice>) {
        // do nothing, successfully
    }
}
