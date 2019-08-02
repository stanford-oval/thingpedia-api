// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const ModuleDownloader = require('./downloader');

module.exports = class DeviceFactory {
    constructor(engine, client, builtins) {
        this._engine = engine;
        this._downloader = new ModuleDownloader(engine.platform, client, engine.schemas, builtins);
    }

    getCachedModules() {
        return this._downloader.getCachedMetas();
    }

    updateFactory(kind) {
        return this._downloader.updateModule(kind);
    }

    // compatibiliy interface
    getFactory(kind) {
        return this.getDeviceClass(kind);
    }

    getDeviceClass(kind) {
        return this._downloader.getModule(kind)
            .then((module) => module.getDeviceClass());
    }

    runOAuth2(kind, req) {
        return this.getDeviceClass(kind).then((deviceClass) => deviceClass.runOAuth2(this._engine, req));
    }

    runInteractiveConfiguration(kind, delegate) {
        return this.getDeviceClass(kind).then((deviceClass) => deviceClass.configureFromAlmond(this._engine, delegate));
    }

    loadFromDiscovery(kind, publicData, privateData) {
        return this.getDeviceClass(kind).then((deviceClass) =>
            deviceClass.loadFromDiscovery(this._engine, publicData, privateData));
    }

    createDevice(kind, serializedDevice) {
        return this.getFactory(kind).then((factory) => {
            return new factory(this._engine, serializedDevice);
        });
    }
};
module.exports.prototype.$rpcMethods = ['runOAuth2', 'getCachedModules'];
