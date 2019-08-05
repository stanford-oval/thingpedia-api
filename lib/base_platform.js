// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

module.exports = class BasePlatform {
    /* istanbul ignore next */
    get type() {
        throw new Error('not implemented');
    }

    /**
      Retrieve the locale of the current user, as a BCP 47 tag.
     */
    /* istanbul ignore next */
    get locale() {
        throw new Error('not implemented');
    }

    /**
      Retrieve the preferred timezone of the current user.
     */
    /* istanbul ignore next */
    get timezone() {
        throw new Error('not implemented');
    }

    /**
      Check if this platform has the required capability
      (e,g. long running, big storage, reliable connectivity, server
      connectivity, stable IP, local device discovery, bluetooth, etc.)
    */
    /* istanbul ignore next */
    hasCapability(cap) {
        throw new Error('not implemented');
    }

    /**
      Retrieve an interface to an optional functionality provided by the
      platform.

      This will return null if hasCapability(cap) is false
    */
    /* istanbul ignore next */
    getCapability(cap) {
        throw new Error('not implemented');
    }

    /**
      Obtain a shared preference store

      Preferences are simple per-user key/value store which is shared across all devices
      but private to this instance (tier) of the platform.
    */
    /* istanbul ignore next */
    getSharedPreferences() {
        throw new Error('not implemented');
    }

    /**
      Get a directory that is guaranteed to be writable
      (in the private data space for Android)
     */
    /* istanbul ignore next */
    getWritableDir() {
        throw new Error('not implemented');
    }

    /**
      Get a temporary directory
      Guaranteed to be writable, but not guaranteed
      to persist across reboots or for long times
      (ie, it could be periodically cleaned by the system)
    */
    /* istanbul ignore next */
    getTmpDir() {
        throw new Error('not implemented');
    }

    /**
      Get a directory good for long term caching of code
      and metadata.
     */
    /* istanbul ignore next */
    getCacheDir() {
        throw new Error('not implemented');
    }

    /**
      Get the Thingpedia developer key, if one is configured
     */
    /* istanbul ignore next */
    getDeveloperKey() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getOrigin() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getCloudId() {
        throw new Error('not implemented');
    }
};
