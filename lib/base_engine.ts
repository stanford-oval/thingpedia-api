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


import * as ThingTalk from 'thingtalk';

import ThingpediaHttpClient from './http_client';
import BaseClient from './base_client';
import BasePlatform from './base_platform';

/**
 * The base Almond engine class.
 *
 * This contains the only API that should be considered stable in the Engine.
 * All other APIs are a private implementation detail.
 */
export default abstract class BaseEngine {
    protected _platform : BasePlatform;
    protected _thingpedia : BaseClient;
    protected _schemas : ThingTalk.SchemaRetriever;

    /**
     * Construct an engine instance.
     *
     * @param platform - the platform associated with this engine
     * @param options - additional options
     * @param options.thingpediaUrl - the Thingpedia URL to use (if the platform
     *                                does not provide a {@link BaseClient})
     */
    constructor(platform : BasePlatform, options : { thingpediaUrl ?: string } = {}) {
        this._platform = platform;

        if (platform.hasCapability('thingpedia-client'))
            this._thingpedia = platform.getCapability('thingpedia-client')!;
        else
            this._thingpedia = new ThingpediaHttpClient(platform, options.thingpediaUrl);

        this._schemas = new ThingTalk.SchemaRetriever(this._thingpedia);
    }

    /**
     * The identity of the current engine of the engine.
     *
     * This is a string composed of {@link BaseDevice.Tier} and a unique identifier.
     * It should be accessed and stored by devices that need local connectivity,
     * to ensure that they are only initialized in the correct engine.
     */
    get ownTier() : string {
        return 'desktop';
    }

    /**
     * The platform associated with the engine.
     */
    get platform() : BasePlatform {
        return this._platform;
    }

    /**
     * The Thingpedia Client associated with the engine.
     */
    get thingpedia() : BaseClient {
        return this._thingpedia;
    }

    /**
     * The ThingTalk SchemaRetriever associated with the engine.
     */
    get schemas() : ThingTalk.SchemaRetriever {
        return this._schemas;
    }
}
