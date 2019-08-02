// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

module.exports = class BaseConfigMixin {
    constructor(classdef) {
        this._classdef = classdef;
        this._mixin = classdef.config;
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

    install(deviceClass) {
        // do nothing, successfully
    }
};
