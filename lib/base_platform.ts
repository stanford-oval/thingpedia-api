// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
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

import Preferences from './prefs';
import { CapabilityMap } from './capabilities';
import BaseDevice from './base_device';

/**
 * The profile of the user.
 */
export interface UserProfile {
    /**
     * Platform-specific account identifier.
     */
    account : string;

    /**
     * Locale identifier.
     */
    locale : string;

    /**
     * Timezone identifier.
     */
    timezone : string;

    /**
     * Real name of the user.
     */
    name ?: string;

    email ?: string;
    email_verified ?: boolean;

    phone ?: string;
    phone_verified ?: boolean;
}

/**
 * The base class of the Almond platform layers.
 *
 * All platform specific APIs should be accessed through an instance of this class.
 */
export default abstract class BasePlatform {
    constructor() {}

    /* istanbul ignore next */
    /**
     * A semi-opaque identifier of the type of platform.
     */
    get type() : string {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Retrieve the locale of the current user, as a BCP 47 tag.
     */
    get locale() : string {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Retrieve the preferred timezone of the current user.
     */
    get timezone() : string {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Retrieve the device to configure to provide platform-specific functionality.
     */
    getPlatformDevice() : { kind : string, class : string, module : BaseDevice.DeviceClass<BaseDevice> }|null {
        return null;
    }

    /* istanbul ignore next */
    /**
     * Retrieve the profile of the current user.
     */
    getProfile() : UserProfile {
        // by default, we delegate to this.locale and this.timezone
        // and leave the other fields unset
        // this is for compatibility with existing platforms
        // platforms are expected to override this method
        return {
            account: 'unknown',
            locale: this.locale,
            timezone: this.timezone
        };
    }

    /* istanbul ignore next */
    /**
     * Attempt to change some profile fields of the current user.
     *
     * Fields that are not present are not modified.
     *
     * @returns whether the modification actually occurred.
     */
    async setProfile(newProfile : {
        locale ?: string;
        timezone ?: string;
        name ?: string;
        email ?: string;
        phone ?: string;
    }) : Promise<boolean> {
        return false;
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
    hasCapability(cap : keyof CapabilityMap) : boolean {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Retrieve an interface to an optional functionality provided by the
     * platform.
     *
     * This will return `null` if {@link BasePlatform.hasCapability}(cap) is `false`.
     *
     * @param {string} cap - the capability name
     * @return {any|null} an interface implementing the given capability
     */
    getCapability<T extends keyof CapabilityMap>(cap : T) : CapabilityMap[T]|null {
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
    getSharedPreferences() : Preferences {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Get a directory that is guaranteed to be writable
     * (in the private data space for Android)
     *
     * @return {string} a directory path
     */
    getWritableDir() : string {
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
    getTmpDir() : string {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Get a directory good for long term caching of code
     * and metadata.
     *
     * @return {string} a directory path
     */
    getCacheDir() : string {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Get the Thingpedia developer key, if one is configured.
     *
     * @return {string|null} the configured developer key, or null
     */
    getDeveloperKey() : string|null {
        throw new Error('not implemented');
    }

    /**
     * Retrieve the HTTP origin to use for OAuth redirects.
     *
     * This defaults to {@link BasePlatform.getOrigin} but can be overridden
     * by subclasses that need different origins for HTTP and OAuth.
     *
     * @return {string} an HTTP origin (protocol, hostname and port)
     */
    getOAuthRedirect() : string {
        return this.getOrigin();
    }

    /* istanbul ignore next */
    /**
     * Retrieve the HTTP origin to use to refer to the current platform.
     *
     * @return {string} an HTTP origin (protocol, hostname and port)
     */
    getOrigin() : string {
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
    getCloudId() : string|null {
        throw new Error('not implemented');
    }

    getAuthToken() : string|undefined {
        return undefined;
    }
    setAuthToken(token : string|undefined) : boolean {
        return false;
    }
}
