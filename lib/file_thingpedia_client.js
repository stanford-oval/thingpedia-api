// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
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


import assert from 'assert';
import * as ThingTalk from 'thingtalk';
const Ast = ThingTalk.Ast;
import * as fs from 'fs';
import * as util from 'util';
import * as qs from 'qs';

import * as Helpers from './helpers';

import BaseClient from './base_client';

// who to contact to resolve locations and entities
const THINGPEDIA_URL = 'https://thingpedia.stanford.edu/thingpedia/api/v3';

/**
 * A Thingpedia Client backed by local files.
 *
 * @extends BaseClient
 */
export default class FileClient extends BaseClient {
    /**
     * Construct a new FileClient.
     *
     * @param {Object} args - construction parameters
     * @param {string} args.locale - the locale of the user
     * @param {string} args.thingpedia - the path to the `thingpedia.tt` file
     * @param {string} [args.entities] - the path to the `entities.json` file
     * @param {string} [args.dataset] - the path to the `dataset.tt` file
     */
    constructor(args) {
        super();
        this._locale = args.locale;
        this._devices = null;
        this._entities = null;

        this._dataset = null;
        this._examples = {};

        this._thingpediafilename = args.thingpedia;
        this._entityfilename = args.entities;
        this._datasetfilename = args.dataset;
        this._loaded = null;
    }

    get locale() {
        return this._locale;
    }

    async _load() {
        this._devices = (await util.promisify(fs.readFile)(this._thingpediafilename)).toString();

        if (this._entityfilename)
            this._entities = JSON.parse(await util.promisify(fs.readFile)(this._entityfilename)).data;
        else
            this._entities = null;

        if (this._datasetfilename) {
            this._dataset = await util.promisify(fs.readFile)(this._datasetfilename, { encoding: 'utf8' });
            const parsed = await ThingTalk.Grammar.parse(this._dataset).datasets;

            for (let dataset of parsed) {
                for (let example of dataset.examples) {
                    let primitives = [];
                    for (let [, prim] of example.iteratePrimitives()) {
                        if (prim.selector.isDevice && !primitives.includes(prim.selector.kind))
                            primitives.push(prim.selector.kind);
                    }
                    if (primitives.length === 1) {
                        const device = primitives[0];
                        if (device in this._examples)
                            this._examples[device].push(example);
                        else
                            this._examples[device] = [example];
                    }
                }
            }
        }

        return true;
    }

    _ensureLoaded() {
        if (this._loaded)
            return this._loaded;
        else
            return this._loaded = this._load();
    }

    async getSchemas(kinds, useMeta) {
        await this._ensureLoaded();

        // ignore kinds, just return the full file, SchemaRetriever will take care of the rest
        return this._devices;
    }
    async getDeviceCode(kind) {
        // we don't have the full class, so we just return the meta info
        await this._ensureLoaded();

        const parsed = ThingTalk.Grammar.parse(this._devices);
        for (let classDef of parsed.classes) {
            if (classDef.kind === kind)
                return classDef.prettyprint();
        }
        throw new Error('Not Found');
    }

    async getAllExamples() {
        await this._ensureLoaded();
        return this._dataset;
    }

    async getExamplesByKinds(kinds) {
        assert(Array.isArray(kinds));
        await this._ensureLoaded();

        let examples = [];
        for (let device of kinds) {
            if (device in this._examples)
                examples = examples.concat(this._examples[device]);
        }

        const name = `@org.thingpedia.dynamic.by_kinds.${kinds.join('__')}`;
        let dataset = new Ast.Dataset(null, name, 'en', examples, {});
        let library = new Ast.Input.Library(null, [], [dataset]);
        return library.prettyprint();
    }

    async getAllDeviceNames() {
        await this._ensureLoaded();

        const parsed = ThingTalk.Grammar.parse(this._devices);
        let names = [];
        for (let classDef of parsed.classes) {
            names.push({
                kind: classDef.kind,
                kind_canonical: classDef.metadata.canonical
            });
        }
        return names;
    }

    async getAllEntityTypes() {
        await this._ensureLoaded();
        return this._entities;
    }

    async _httpRequest(to, params = {}, accept = 'application/json', options = { extractData: true }) {
        params.locale = this.locale;
        params.thingtalk_version = ThingTalk.version;
        to += '?' + qs.stringify(params);
        const response = await Helpers.Http.get(THINGPEDIA_URL + to, { accept });
        const parsed = JSON.parse(response);
        if (parsed.result !== 'ok')
            throw new Error(`Operation failed: ${parsed.error || parsed.result}`);
        if (options.extractData)
            return parsed.data;
        else
            return parsed;
    }

    lookupEntity(entityType, searchTerm) {
        return this._httpRequest('/entities/lookup/' + encodeURIComponent(entityType),
            { q: searchTerm }, 'application/json', { extractData: false });
    }

    lookupLocation(searchTerm) {
        return this._httpRequest('/locations/lookup',
            { q: searchTerm }, 'application/json');
    }
}
