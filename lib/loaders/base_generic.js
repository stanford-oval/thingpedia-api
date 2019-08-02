// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2017 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Utils = require('../utils');
const { makeBaseDeviceMetadata } = require('../compat');
const ConfigMixins = require('../config');
const BaseDevice = require('../base_device');

module.exports = class BaseGenericModule {
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

        const name = this._manifest.metadata.name;
        const description = this._manifest.metadata.description;

        this._loaded = class GenericDevice extends BaseDevice {
            constructor(engine, state) {
                super(engine, state);

                this.params = params.map((k) => state[k]);
                if (name !== undefined)
                    this.name = Utils.formatString(name, this.state);
                if (description !== undefined)
                    this.description = Utils.formatString(description, this.state);
            }

            checkAvailable() {
                return BaseDevice.Availability.AVAILABLE;
            }
        };
        this._config.install(this._loaded);

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
};
