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
