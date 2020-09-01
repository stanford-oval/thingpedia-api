// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
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
"use strict";

/**
 * The base class of the Almond platform layers.
 *
 * All platform specific APIs should be accessed through an instance of this class.
 */
class BasePlatform {
    /**
     * @protected
     */
    constructor() {}

    /* istanbul ignore next */
    /**
     * A semi-opaque identifier of the type of platform.
     *
     * @type {string}
     * @readonly
     */
    get type() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Retrieve the locale of the current user, as a BCP 47 tag.
     *
     * @type {string}
     * @readonly
     */
    get locale() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Retrieve the preferred timezone of the current user.
     *
     * @type {string}
     * @readonly
     */
    get timezone() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Check if this platform has the required capability
     * (e,g. long running, big storage, reliable connectivity, server
     * connectivity, stable IP, local device discovery, bluetooth, etc.)
     *
     * @param {string} cap - the capability name
     * @return {boolean} true if the capability name is known and supported, false otherwise
    */
    hasCapability(cap) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Retrieve an interface to an optional functionality provided by the
     * platform.
     *
     * This will return `null` if {@link BasePlatform#hasCapability}(cap) is `false`.
     *
     * @param {string} cap - the capability name
     * @return {any|null} an interface implementing the given capability
     */
    getCapability(cap) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Obtain the shared preference store.
     *
     * Preferences are simple per-user key/value store which is shared across all devices
     * but private to this instance (tier) of the platform.
     *
     * @return {Preferences} the shared preference store.
     */
    getSharedPreferences() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Get a directory that is guaranteed to be writable
     * (in the private data space for Android)
     *
     * @return {string} a directory path
     */
    getWritableDir() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Get a temporary directory.
     *
     * Guaranteed to be writable, but not guaranteed
     * to persist across reboots or for long times
     * (i.e., it could be periodically cleaned by the system).
     *
     * @return {string} a directory path
     */
    getTmpDir() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Get a directory good for long term caching of code
     * and metadata.
     *
     * @return {string} a directory path
     */
    getCacheDir() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Get the Thingpedia developer key, if one is configured.
     *
     * @return {string|null} the configured developer key, or null
     */
    getDeveloperKey() {
        throw new Error('not implemented');
    }

    /**
     * Retrieve the HTTP origin to use for OAuth redirects.
     *
     * This defaults to {@link BasePlatform#getOrigin} but can be overridden
     * by subclasses that need different origins for HTTP and OAuth.
     *
     * @return {string} an HTTP origin (protocol, hostname and port)
     */
    getOAuthRedirect() {
        return this.getOrigin();
    }

    /* istanbul ignore next */
    /**
     * Retrieve the HTTP origin to use to refer to the current platform.
     *
     * @return {string} an HTTP origin (protocol, hostname and port)
     */
    getOrigin() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Retrieve the unique ID of the user in the cloud platform.
     *
     * This is used to identify the same user across multiple devices
     * running Almond (e.g. a phone and a home server).
     *
     * @return {string|null} an opaque unique ID
     */
    getCloudId() {
        throw new Error('not implemented');
    }
}
module.exports = BasePlatform; 
