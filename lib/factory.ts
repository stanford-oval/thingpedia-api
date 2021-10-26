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

import BaseClient from './base_client';
import BaseEngine from './base_engine';
import ModuleDownloader from './downloader';
import ConfigDelegate from './config_delegate';
import BaseDevice from './base_device';

/**
 * Factory class that can create device instances.
 *
 * Users of Thingpedia (that is, Almond engine implementors) must never create instances directly,
 * and must always use this class. This ensures that all Thingpedia interfaces have the correct
 * metadata and the correct default methods.
 */
export default class DeviceFactory {
    private _engine : BaseEngine;
    private _downloader : ModuleDownloader;

    /**
     * Construct a new DeviceFactory.
     *
     * @param engine - the engine that will be passed to newly constructed devices
     * @param client - the client to use to contact Thingpedia
     * @param builtins - implementation of builtin classes
     * @param options - additional configuration options
     * @param options.builtinGettext - gettext function to use to translate builtin devices
     */
    constructor(engine : BaseEngine,
                client : BaseClient,
                builtins : Record<string, { class : ThingTalk.Ast.ClassDef, module : BaseDevice.DeviceClass<BaseDevice> }> = {}) {
        this._engine = engine;
        this._downloader = new ModuleDownloader(engine.platform, client, engine.schemas, builtins);
    }

    /**
     * Retrieve the list of cached device classes.
     *
     * @return the list of device classes
     */
    getCachedDeviceClasses() {
        return this._downloader.getCachedMetas();
    }

    /**
     * Update the cached device class with the given ID.
     *
     * @param kind - the class identifier to update
     */
    updateDeviceClass(kind : string) {
        return this._downloader.updateModule(kind);
    }

    /**
     * Retrieve the device class with the given ID, fully initialized.
     *
     * @param kind - the class identifier to retrieve
     */
    getDeviceClass(kind : string) : Promise<BaseDevice.DeviceClass<BaseDevice>> {
        return this._downloader.getModule(kind)
            .then((module) => module.getDeviceClass());
    }

    /**
     * Load a new device of the given class ID using an OAuth-like flow.
     *
     * See {@link BaseDevice.loadFromCustomOAuth} for details
     *
     * @param kind - the class identifier to load
     * @return - a tuple with redirect URL and session
     */
    loadFromOAuth(kind : string) {
        return this.getDeviceClass(kind).then((deviceClass) => deviceClass.loadFromCustomOAuth(this._engine));
    }
    /**
     * Complete configuring a new device using an OAuth-like flow.
     *
     * See {@link BaseDevice.completeCustomOAuth} for details
     *
     * @param - the class identifier to load
     * @param - the OAuth redirect URL
     * @param - the session object
     * @return - the newly configured device
     */
    completeOAuth(kind : string, url : string, session : Record<string, string>) {
        return this.getDeviceClass(kind).then((deviceClass) => deviceClass.completeCustomOAuth(this._engine, url, session));
    }

    /**
     * Load a new device of the given class ID using an interactive flow.
     *
     * See {@link BaseDevice.loadInteractively} for details
     *
     * @param - the class identifier to load
     * @param - the delegate to use for configuration
     * @return - the newly configured device
     */
    loadInteractively(kind : string, delegate : ConfigDelegate) {
        return this.getDeviceClass(kind).then((deviceClass) => deviceClass.loadInteractively(this._engine, delegate));
    }

    /**
     * Load a new device of the given class ID using a discovery protocol.
     *
     * The returned device is not fully initialized, and the caller must call
     * {@link BaseDevice.completeDiscovery} to finish initialization.
     * See {@link BaseDevice.loadFromDiscovery} for details.
     *
     * @param - the class identifier to load
     * @param publicData - protocol specific data that is public (e.g. Bluetooth UUIDs)
     * @param privateData - protocol specific data that is specific to the device and
     *                               private to the user (e.g. Bluetooth HW address)
     * @return - the partially configured device
     */
    loadFromDiscovery(kind : string, publicData : Record<string, unknown>, privateData : Record<string, unknown>) {
        return this.getDeviceClass(kind).then((deviceClass) =>
            deviceClass.loadFromDiscovery(this._engine, publicData, privateData));
    }

    /**
     * Load a new device of the given class ID from its serialized state.
     *
     * @param - the class identifier to load
     * @param - the serialized state
     * @return - the initialized device
     */
    loadSerialized(kind : string, serializedDevice : Record<string, unknown>) {
        return this.getDeviceClass(kind).then((deviceClass) => {
            return new deviceClass(this._engine, serializedDevice);
        });
    }
}
