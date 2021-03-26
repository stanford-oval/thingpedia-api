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


import * as events from 'events';

/**
 * A simple persistent key-value store.
 *
 * The store is designed to be fast and easy to use, and makes little guarantees of
 * consistency, durability or scalability. Use it only for small amounts of data
 * that has little value.
 *
 * This is backed by {@link Helpers.FilePreferences} in most platforms, and by Android's `SharedPreferences`
 * on Android.
 *
 */
export default abstract class Preferences extends events.EventEmitter {
    constructor() {
        super();
    }

    /* istanbul ignore next */
    /**
     * List all names in this preference store.
     *
     * @return {String[]}
     */
    keys() : string[] {
        return [];
    }

    /* istanbul ignore next */
    /**
     * Retrieve the named preference, or undefined if there is no stored value for it
     *
     * @param {string} name - the preference name
     * @return {any} - the value, or `undefined`
     */
    get(name : string) : unknown {
        return undefined;
    }

    /* istanbul ignore next */
    /**
     * Set the named preference to the given value, which can be any object for which
     * a valid JSON representation exists (any non-cyclic object without non enumerable
     * properties)
     *
     * @param {string} name - the preference name
     * @param {any} value - the value
    */
    set<T>(name : string, value : T) : T {
        throw new Error('Abstract method');
    }

    /* istanbul ignore next */
    /**
     * Remove the given preference key from the store.
     *
     * @param {string} name - the preference key to delete
     */
    delete(name : string) : void {
        throw new Error('Abstract method');
    }

    /* istanbul ignore next */
    /**
     * Mark the given preference name as changed.
     *
     * This method should be called if the value is mutated without calling `set()`, for
     * example if the value is an object or array and some of its properties/indices are changed.
     *
     * @param {string} [name] - which preference name changed; if omitted, all preferences will
     *                          be considered changed
     */
    changed(name : string) : void {
        throw new Error('Abstract method');
    }
}
