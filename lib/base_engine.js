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

module.exports = class BaseEngine {
    constructor(platform, options = {}) {
        this._platform = platform;

        if (platform.hasCapability('thingpedia-client'))
            this._thingpedia = platform.getCapability('thingpedia-client');
        else
            this._thingpedia = new ThingpediaHttpClient(platform, options.thingpediaUrl);

        this._schemas = new ThingTalk.SchemaRetriever(this._thingpedia);
    }

    get platform() {
        return this._platform;
    }
    get thingpedia() {
        return this._thingpedia;
    }
    get schemas() {
        return this._schemas;
    }
};
