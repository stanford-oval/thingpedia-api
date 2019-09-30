// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const events = require('events');

/**
 * A simple persistent key-value store.
 *
 * The store is designed to be fast and easy to use, and makes little guarantees of
 * consistency, durability or scalability. Use it only for small amounts of data
 * that has little value.
 *
 * This is backed by {@link module:Helpers.FilePreferences} in most platforms, and by Android's `SharedPreferences`
 * on Android.
 *
 * @extends events.EventEmitter
 */
class Preferences extends events.EventEmitter {
    /* istanbul ignore next */
    /**
     * List all names in this preference store.
     *
     * @return {String[]}
     * @abstract
     */
    keys() {
        return [];
    }

    /* istanbul ignore next */
    /**
     * Retrieve the named preference, or undefined if there is no stored value for it
     *
     * @param {string} name - the preference name
     * @return {any} - the value, or `undefined`
     * @abstract
     */
    get(name) {
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
     * @abstract
    */
    set(name, value) {
        throw new Error('Abstract method');
    }

    /* istanbul ignore next */
    /**
     * Remove the given preference key from the store.
     *
     * @param {string} name - the preference key to delete
     * @abstract
     */
    delete(name) {
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
     * @abstract
     */
    changed(name) {
        throw new Error('Abstract method');
    }
}
module.exports = Preferences; 
