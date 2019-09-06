// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2016 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Mixins = require('./mixins.json');

module.exports = class ThingpediaClientBase {
    constructor() {
    }

    get locale() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getModuleLocation(id) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getDeviceCode(id) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getSchemas(kinds, withMetadata) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getDeviceList(klass, page, page_size) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getDeviceFactories(klass) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getDeviceSetup(kinds) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getKindByDiscovery(publicData) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getExamplesByKey(key) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getExamplesByKinds(kinds) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    clickExample(exampleId) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    lookupEntity(entityType, searchTerm) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    lookupLocation(searchTerm) {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getAllExamples() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getAllDeviceNames() {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getAllEntityTypes() {
        throw new Error('not implemented');
    }

    getMixins() {
        let mixins = {};
        for (let mixin of Mixins.data)
            mixins[mixin.kind] = mixin;
        return Promise.resolve(mixins);
    }
};
