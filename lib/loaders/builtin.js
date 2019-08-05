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

module.exports = class BuiltinModule extends BaseJavascriptModule {
    constructor(id, manifest, loader, deviceClass) {
        // version does not matter for builtin modules
        manifest.annotations.version = ThingTalk.Ast.Value.Number(0);
        super(id, manifest, loader);
        
        this._loaded = deviceClass;
    }
    
    clearCache() {
        // nothing to do here
    }
    async _doGetDeviceClass() {
        return this._completeLoading(this._loaded);
    }
};
