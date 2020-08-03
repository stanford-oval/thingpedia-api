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

const Mixins = require('./mixins.json');

/**
 * The base class of all clients to access the Thingpedia API.
 *
 * Accessing the Thingpedia API from Almond occurs in a platform-specific manner,
 * through clients that extend this class.
 *
 * @interface
 */
class BaseClient {
    /**
     * @protected
     */
    constructor() {
    }

    /**
     * The locale to use when querying Thingpedia, as BCP 47 tag.
     *
     * @type {string}
     * @readonly
     */
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
}
module.exports = BaseClient;
