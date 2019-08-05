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

    getCachedDeviceClasses() {
        return this._downloader.getCachedMetas();
    }

    updateDeviceClass(kind) {
        return this._downloader.updateModule(kind);
    }

    getDeviceClass(kind) {
        return this._downloader.getModule(kind)
            .then((module) => module.getDeviceClass());
    }

    loadFromOAuth(kind) {
        return this.getDeviceClass(kind).then((deviceClass) => deviceClass.loadFromCustomOAuth(this._engine));
    }
    completeOAuth(kind, url, session) {
        return this.getDeviceClass(kind).then((deviceClass) => deviceClass.completeCustomOAuth(this._engine, url, session));
    }

    loadInteractively(kind, delegate) {
        return this.getDeviceClass(kind).then((deviceClass) => deviceClass.loadInteractively(this._engine, delegate));
    }

    loadFromDiscovery(kind, publicData, privateData) {
        return this.getDeviceClass(kind).then((deviceClass) =>
            deviceClass.loadFromDiscovery(this._engine, publicData, privateData));
    }

    loadSerialized(kind, serializedDevice) {
        return this.getDeviceClass(kind).then((deviceClass) => {
            return new deviceClass(this._engine, serializedDevice);
        });
    }
};
module.exports.prototype.$rpcMethods = ['runOAuth2', 'getCachedModules'];
