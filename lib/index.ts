// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details


import './string_format';

import Messaging from './messaging';
import Preferences from './prefs';
import BaseDevice, { Availability, Tier } from './base_device';
import * as Helpers from './helpers';
import * as ObjectSet from './helpers/object_set';
import ConfigDelegate from './config_delegate';
import { OAuthError } from './errors';
import BaseClient from './base_client';
import HttpClient from './http_client';
import FileClient from './file_thingpedia_client';
import DeviceFactory from './factory';
import { ImplementationError, UnsupportedError } from './errors';
import BaseEngine from './base_engine';
import BasePlatform, { UserProfile } from './base_platform';
import * as DeviceConfigUtils from './device_factory_utils';
import * as Capabilities from './capabilities';
import DialogueHandler from './dialogue-handler';
import * as FormatObjects from './format_objects';

import * as ThingTalk from 'thingtalk';
import FileParameterProvider from './file_parameter_provider';

/**
 * Versioning information for the library.
 *
 * Use this object to check if the currently loaded Thingpedia SDK
 * is compatible with your device, and to dynamically check if a specific
 * feature is present.
 *
 * Note: you should never bundle the Thingpedia SDK with your device.
 *
 * @namespace
 */
const VERSION = {
    /** Major version number (incremented on incompatible changes) */
    major: 2,
    /** Minor version number (incremented on feature additions) */
    minor: 10,
    /** Full version string, in semantic version format */
    full: '2.10.0-alpha.6',
    /** Convert the version number to a number (for comparisons) */
    valueOf() : number {
        return this.major * 100 + this.minor;
    },
    toString() : string {
        return this.full;
    },
    /**
     * Check if the current version is compatible with the passed in version
     *
     * @param v - the version, as a number or object with `major` and minor properties
     * @return {Boolean}
     */
    compatible(v : number|{
        major : number;
        minor : number;
    }) : boolean {
        if (typeof v === 'number')
            return this.valueOf() >= v && Math.floor(v/100) === this.major;
        else
            return this.major === v.major && this.minor >= v.minor;
    },
    /**
     * Check if the given feature is present.
     *
     * It is ok to pass invalid or unrecognized feature names to this function,
     * which will then return `false`.
     *
     * In this version of the library, the following feature names are recognized:
     * - `rss`: RSS helpers and loaders
     * - `value-types`: ThingTalk value types are re-exported
     * - `thingpedia-client`: Thingpedia Client APIs are present
     *
     * @param {String} f - a feature name
     * @return {Boolean} whether the named feature is supported.
     */
    hasFeature(f : string) : boolean {
        switch (f) {
        case 'rss':
        case 'value-types':
        case 'thingpedia-client':
            return true;
        default:
            return false;
        }
    }
};

namespace Value {
    // export both as type and as value
    export type Entity = ThingTalk.Builtin.Entity;
    export type Currency = ThingTalk.Builtin.Currency;
    export type Location = ThingTalk.Builtin.Location;
    export type Time = ThingTalk.Builtin.Time;

    export const Entity = ThingTalk.Builtin.Entity;
    export const Currency = ThingTalk.Builtin.Currency;
    export const Location = ThingTalk.Builtin.Location;
    export const Time = ThingTalk.Builtin.Time;
}

export {
    VERSION as version,

    // APIs for implementers of Thingpedia interfaces
    BaseDevice,
    Availability,
    Tier,

    // helper libraries and portions of ThingTalk API that are public/stable
    Helpers,
    Value,

    // interfaces (for documentation/type-checking only)
    Messaging,
    ConfigDelegate,
    Preferences,
    Capabilities,
    UserProfile,
    DialogueHandler,
    FormatObjects,

    // compatibility export
    ObjectSet,

    // APIs for users of Thingpedia interfaces
    BaseEngine,
    BasePlatform,
    BaseClient,
    HttpClient,
    FileClient,
    DeviceFactory,
    DeviceConfigUtils,
    FileParameterProvider,

    // expose errors
    ImplementationError,
    UnsupportedError,
    OAuthError,
};
