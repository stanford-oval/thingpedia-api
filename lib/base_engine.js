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

const ThingTalk = require('thingtalk');

const ThingpediaHttpClient = require('./http_client');

/**
 * The base Almond engine class.
 *
 * This contains the only API that should be considered stable in the Engine.
 * All other APIs are a private implementation detail.
 */
class BaseEngine {
    /**
     * Construct an engine instance.
     *
     * @param {BasePlatform} platform - the platform associated with this engine
     * @param {Object} options - additional options
     * @param {string} [options.thingpediaUrl] - the Thingpedia URL to use (if the platform
     *                                           does not provide a {@link BaseClient})
     * @protected
     */
    constructor(platform, options = {}) {
        this._platform = platform;

        if (platform.hasCapability('thingpedia-client'))
            this._thingpedia = platform.getCapability('thingpedia-client');
        else
            this._thingpedia = new ThingpediaHttpClient(platform, options.thingpediaUrl);

        this._schemas = new ThingTalk.SchemaRetriever(this._thingpedia);
    }

    /**
     * The current tier of the engine.
     *
     * See {@link BaseDevice.Tier} for an explanation.
     *
     * @type {BaseDevice.Tier}
     * @readonly
     */
    get ownTier() {
        return 'desktop';
    }

    /**
     * The platform associated with the engine.
     *
     * @type {BasePlatform}
     * @readonly
     */
    get platform() {
        return this._platform;
    }

    /**
     * The Thingpedia Client associated with the engine.
     *
     * @type {BaseClient}
     * @readonly
     */
    get thingpedia() {
        return this._thingpedia;
    }

    /**
     * The ThingTalk SchemaRetriever associated with the engine.
     *
     * @type {ThingTalk.SchemaRetriever}
     * @readonly
     */
    get schemas() {
        return this._schemas;
    }
}
module.exports = BaseEngine; 
