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

function translate(annotation : unknown, gettext : (x : string) => string) {
    if (typeof annotation === 'string') {
        return gettext(annotation);
    } else if (Array.isArray(annotation)) {
        return annotation.map((str) => gettext(str));
    } else if (typeof annotation === 'object') {
        const translated : Record<string, unknown> = {};
        for (const subkey in annotation)
            translated[subkey] = translate((annotation as Record<string, unknown>)[subkey], gettext);
        return translated;
    } else {
        return annotation;
    }
}

function applyTranslation(metadata : ThingTalk.Ast.NLAnnotationMap, gettext : (x : string) => string) {
    for (const key in metadata)
        metadata[key] = translate(metadata[key], gettext);
}

function applyTranslationFunction(fndef : ThingTalk.Ast.FunctionDef, gettext : (x : string) => string) {
    applyTranslation(fndef.metadata, gettext);

    for (const arg of fndef.args)
        applyTranslation(fndef.getArgument(arg)!.metadata, gettext);
}

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
                deviceClass : BaseDevice.DeviceClass<BaseDevice>,
                builtinGettext ?: (x : string) => string) {
        // version does not matter for builtin modules
        manifest.annotations.version = new ThingTalk.Ast.Value.Number(0);
        super(kind, manifest, parents, loader);

        if (builtinGettext) {
            applyTranslation(manifest.metadata, builtinGettext);

            for (const query in manifest.queries)
                applyTranslationFunction(manifest.queries[query], builtinGettext);
            for (const query in manifest.actions)
                applyTranslationFunction(manifest.actions[query], builtinGettext);
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
