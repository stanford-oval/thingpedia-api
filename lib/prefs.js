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
  A simple persistent key-value store.

  The store is designed to be fast and easy to use, and makes little guarantees of
  consistency, durability or scalability. Use it only for small amounts of data
  that has little value.

  This is backed by Helpers.FilePreferences in most platforms, and by Android's SharedPreferences
  on Android.
*/
module.exports = class Preferences extends events.EventEmitter {
    /**
      List all names in this preference store.
    */
    keys() {
        return [];
    }

    /**
      Retrieve the named preference, or undefined if there is no stored value for it
    */
    /* istanbul ignore next */
    get(name) {
        return undefined;
    }

    /**
      Set the named preference to the given value, which can be any object for which
      a valid JSON representation exists (any non-cyclic object without non enumerable
      properties)
    */
    /* istanbul ignore next */
    set(name, value) {
        throw new Error('Abstract method');
    }

    /**
      Remove the given preference key from the store.
    */
    /* istanbul ignore next */
    delete(name) {
        throw new Error('Abstract method');
    }

    /**
      Mark the given preference name as changed.

      This method should be called if the value is mutated without calling `set()`, for
      example if the value is an object or array and some of its properties/indices are changed.
    */
    changed(name) {
        throw new Error('Abstract method');
    }
};
