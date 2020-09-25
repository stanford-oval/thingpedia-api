// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
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


import ModuleDownloader from './downloader';

/**
 * Factory class that can create device instances.
 *
 * Users of Thingpedia (that is, Almond engine implementors) must never create instances directly,
 * and must always use this class. This ensures that all Thingpedia interfaces have the correct
 * metadata and the correct default methods.
 */
export default class DeviceFactory {
    /**
     * Construct a new DeviceFactory.
     *
     * @param {BaseEngine} engine - the engine that will be passed to newly constructed devices
     * @param {BaseClient} client - the client to use to contact Thingpedia
     * @param {Object} [builtins] - implementation of builtin classes
     * @param {Object} [options] - additional configuration options
     * @param {string} [options.builtinGettextDomain] - gettext domain to use to translate builtin devices
     */
    constructor(engine, client, builtins, options) {
        this._engine = engine;
        this._downloader = new ModuleDownloader(engine.platform, client, engine.schemas, builtins, options);
    }

    /**
     * Retrieve the list of cached device classes.
     *
     * @return {Object[]} the list of device classes
     * @async
     */
    getCachedDeviceClasses() {
        return this._downloader.getCachedMetas();
    }

    /**
     * Update the cached device class with the given ID.
     *
     * @param {string} kind - the class identifier to update
     * @async
     */
    updateDeviceClass(kind) {
        return this._downloader.updateModule(kind);
    }

    /**
     * Retrieve the device class with the given ID, fully initialized.
     *
     * @param {string} - the class identifier to retrieve
     * @return {Class.<BaseDevice>}
     * @async
     */
    getDeviceClass(kind) {
        return this._downloader.getModule(kind)
            .then((module) => module.getDeviceClass());
    }

    /**
     * Load a new device of the given class ID using an OAuth-like flow.
     *
     * See {@link BaseDevice.loadFromCustomOAuth} for details
     *
     * @param {string} - the class identifier to load
     * @return {Array} - a tuple with redirect URL and session
     */
    loadFromOAuth(kind) {
        return this.getDeviceClass(kind).then((deviceClass) => deviceClass.loadFromCustomOAuth(this._engine));
    }
    /**
     * Complete configuring a new device using an OAuth-like flow.
     *
     * See {@link BaseDevice.completeCustomOAuth} for details
     *
     * @param {string} - the class identifier to load
     * @param {string} - the OAuth redirect URL
     * @param {Object.<string,string>} - the session object
     * @return {BaseDevice} - the newly configured device
     */
    completeOAuth(kind, url, session) {
        return this.getDeviceClass(kind).then((deviceClass) => deviceClass.completeCustomOAuth(this._engine, url, session));
    }

    /**
     * Load a new device of the given class ID using an interactive flow.
     *
     * See {@link BaseDevice.loadInteractively} for details
     *
     * @param {string} - the class identifier to load
     * @param {ConfigDelegate} - the delegate to use for configuration
     * @return {BaseDevice} - the newly configured device
     */
    loadInteractively(kind, delegate) {
        return this.getDeviceClass(kind).then((deviceClass) => deviceClass.loadInteractively(this._engine, delegate));
    }

    /**
     * Load a new device of the given class ID using a discovery protocol.
     *
     * The returned device is not fully initialized, and the caller must call
     * {@link BaseDevice#completeDiscovery} to finish initialization.
     * See {@link BaseDevice.loadFromDiscovery} for details.
     *
     * @param {string} - the class identifier to load
     * @param {Object} publicData - protocol specific data that is public (e.g. Bluetooth UUIDs)
     * @param {Object} privateData - protocol specific data that is specific to the device and
     *                               private to the user (e.g. Bluetooth HW address)
     * @return {BaseDevice} - the partially configured device
     */
    loadFromDiscovery(kind, publicData, privateData) {
        return this.getDeviceClass(kind).then((deviceClass) =>
            deviceClass.loadFromDiscovery(this._engine, publicData, privateData));
    }

    /**
     * Load a new device of the given class ID from its serialized state.
     *
     * @param {string} - the class identifier to load
     * @param {Object} - the serialized state
     * @return {BaseDevice} - the initialized device
     */
    loadSerialized(kind, serializedDevice) {
        return this.getDeviceClass(kind).then((deviceClass) => {
            return new deviceClass(this._engine, serializedDevice);
        });
    }
}
DeviceFactory.prototype.$rpcMethods = ['runOAuth2', 'getCachedModules'];
