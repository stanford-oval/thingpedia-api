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
import type Gettext from 'node-gettext';

import BaseJavascriptModule from './base_js';
import ModuleDownloader from '../downloader';
import BaseDevice from '../base_device';

function translate(annotation : unknown, gettext : Gettext, domain : string) {
    if (typeof annotation === 'string') {
        return gettext.dgettext(domain, annotation);
    } else if (Array.isArray(annotation)) {
        return annotation.map((str) => gettext.dgettext(domain, str));
    } else if (typeof annotation === 'object') {
        const translated : Record<string, unknown> = {};
        for (const subkey in annotation)
            translated[subkey] = translate((annotation as Record<string, unknown>)[subkey], gettext, domain);
        return translated;
    } else {
        return annotation;
    }
}

function applyTranslation(metadata : ThingTalk.Ast.NLAnnotationMap, gettext : Gettext, domain : string) {
    for (const key in metadata)
        metadata[key] = translate(metadata[key], gettext, domain);
}

function applyTranslationFunction(fndef : ThingTalk.Ast.FunctionDef, gettext : Gettext, domain : string) {
    applyTranslation(fndef.metadata, gettext, domain);

    for (const arg of fndef.args)
        applyTranslation(fndef.getArgument(arg)!.metadata, gettext, domain);
}

export default class BuiltinModule extends BaseJavascriptModule {
    private _loaded : BaseDevice.DeviceClass<BaseDevice>;

    constructor(id : string,
                classDef : ThingTalk.Ast.ClassDef,
                loader : ModuleDownloader,
                deviceClass : BaseDevice.DeviceClass<BaseDevice>,
                builtinGettextDomain : string|undefined) {
        // version does not matter for builtin modules
        classDef.annotations.version = new ThingTalk.Ast.Value.Number(0);
        super(id, classDef, loader);

        if (builtinGettextDomain) {
            const gettext = loader.platform.getCapability('gettext');
            if (gettext) {
                applyTranslation(classDef.metadata, gettext, builtinGettextDomain);

                for (const query in classDef.queries)
                    applyTranslationFunction(classDef.queries[query], gettext, builtinGettextDomain);
                for (const query in classDef.actions)
                    applyTranslationFunction(classDef.actions[query], gettext, builtinGettextDomain);
            }
        }

        this._loaded = deviceClass;
    }

    clearCache() {
        // nothing to do here
    }
    async _doGetDeviceClass() {
        return this._completeLoading(this._loaded);
    }
}
