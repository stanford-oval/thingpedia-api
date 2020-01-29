// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2017-2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const ThingTalk = require('thingtalk');

const BaseJavascriptModule = require('./base_js');

function translate(annotation, gettext, domain) {
    if (typeof annotation === 'string') {
        return gettext.dgettext(domain, annotation);
    } else if (Array.isArray(annotation)) {
        return annotation.map((str) => gettext.dgettext(domain, annotation));
    } else if (typeof annotation === 'object') {
        let translated = {};
        for (let subkey in annotation)
            translated[subkey] = translate(annotation[subkey], gettext, domain);
        return translated;
    } else {
        return annotation;
    }
}

function applyTranslation(metadata, gettext, domain) {
    for (let key in metadata)
        metadata[key] = translate(metadata[key], gettext, domain);
}

function applyTranslationFunction(fndef, gettext, domain) {
    applyTranslation(fndef.metadata, gettext, domain);

    for (let arg of fndef.args)
        applyTranslation(fndef.getArgument(arg).metadata, gettext, domain);
}

module.exports = class BuiltinModule extends BaseJavascriptModule {
    constructor(id, classDef, loader, deviceClass, builtinGettextDomain) {
        // version does not matter for builtin modules
        classDef.annotations.version = ThingTalk.Ast.Value.Number(0);
        super(id, classDef, loader);

        if (builtinGettextDomain) {
            const gettext = loader.platform.getCapability('gettext');
            if (gettext) {
                applyTranslation(classDef.metadata, gettext, builtinGettextDomain);

                for (let query in classDef.queries)
                    applyTranslationFunction(classDef.queries[query], gettext, builtinGettextDomain);
                for (let query in classDef.actions)
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
};
