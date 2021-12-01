// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
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
import { Ast, } from 'thingtalk';
import * as fs from 'fs';
import * as util from 'util';
import * as qs from 'qs';

import * as Helpers from './helpers';
import { getCategory } from './compat';
import { makeDeviceFactory } from './device_factory_utils';

import BaseClient from './base_client';
import FileParameterProvider from './file_parameter_provider';

// who to contact to resolve locations and entities
const THINGPEDIA_URL = 'https://thingpedia.stanford.edu/thingpedia/api/v3';

interface APIQueryParams {
    locale ?: string;
    thingtalk_version ?: string;
    developer_key ?: string;
    [key : string] : string|undefined;
}


/**
 * A Thingpedia Client backed by local files.
 *
 */
export default class FileClient extends BaseClient {
    private _locale : string;
    private _devices : string|null;
    private _entities : BaseClient.EntityTypeRecord[]|null;
    private _dataset : string|null;
    private _examples : { [key : string] : Ast.Example[] };
    private _thingpediafilename : string;
    private _entityfilename : string|undefined;
    private _datasetfilename : string|undefined;
    private _loaded : Promise<void>|null;
    private _entityProvider : FileParameterProvider|null;

    /**
     * Construct a new FileClient.
     *
     * @param {Object} args - construction parameters
     * @param {string} args.locale - the locale of the user
     * @param {string} args.thingpedia - the path to the `thingpedia.tt` file
     * @param {string} args.entities - the path to the `entities.json` file
     * @param {string} args.dataset - the path to the `dataset.tt` file
     */
    constructor(args : {
        thingpedia : string;
        locale : string;
        entities ?: string;
        dataset ?: string;
        parameter_datasets ?: string;
    }) {
        super();
        this._locale = args.locale;
        this._devices = null;
        this._entities = null;

        this._dataset = null;
        this._examples = {};

        this._thingpediafilename = args.thingpedia;
        this._entityfilename = args.entities;
        this._datasetfilename = args.dataset;

        this._entityProvider = null;
        if (args.parameter_datasets)
            this._entityProvider = new FileParameterProvider(args.parameter_datasets, args.locale);
        this._loaded = null;
    }

    get locale() : string {
        return this._locale;
    }

    getModuleLocation(id : string) : Promise<string> {
        throw new Error('not implemented');
    }

    getDeviceSetup(kinds : string[]) : Promise<{ [key : string] : BaseClient.DeviceFactory|BaseClient.MultipleDeviceFactory|null }> {
        throw new Error('not implemented');
    }

    getKindByDiscovery(publicData : any) : Promise<string> {
        throw new Error('not implemented');
    }

    private async _load() {
        this._devices = (await util.promisify(fs.readFile)(this._thingpediafilename)).toString();

        if (this._entityfilename)
            this._entities = JSON.parse(String(await util.promisify(fs.readFile)(this._entityfilename))).data;
        else
            this._entities = null;

        if (this._datasetfilename) {
            this._dataset = await util.promisify(fs.readFile)(this._datasetfilename, { encoding: 'utf8' });
            let parsed;
            try {
                parsed = await ThingTalk.Syntax.parse(this._dataset, ThingTalk.Syntax.SyntaxType.Normal, {
                    locale: this.locale,
                    timezone: 'UTC'
                });
            } catch(e) {
                if (e.name !== 'SyntaxError')
                    throw e;
                parsed = await ThingTalk.Syntax.parse(this._dataset, ThingTalk.Syntax.SyntaxType.Legacy, {
                    locale: this.locale,
                    timezone: 'UTC'
                });
            }
            assert(parsed instanceof Ast.Library);

            for (const dataset of parsed.datasets) {
                for (const example of dataset.examples) {
                    const primitives : string[] = [];
                    for (const [, prim] of example.iteratePrimitives(false)) {
                        assert(prim instanceof Ast.Invocation || prim instanceof Ast.ExternalBooleanExpression);
                        const selector = prim.selector;
                        if (selector instanceof Ast.DeviceSelector && !primitives.includes(selector.kind))
                            primitives.push(selector.kind);
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

        if (this._entityProvider)
            await this._entityProvider.load();
    }

    private _ensureLoaded() {
        if (this._loaded)
            return this._loaded;
        else
            return this._loaded = this._load();
    }

    async getDeviceList(klass ?: string, page = 0, page_size = 10) : Promise<BaseClient.DeviceListRecord[]> {
        await this._ensureLoaded();

        const parsed = ThingTalk.Syntax.parse(this._devices!, ThingTalk.Syntax.SyntaxType.Normal, {
            locale: this.locale,
            timezone: 'UTC'
        });
        assert(parsed instanceof Ast.Library);
        const list : BaseClient.DeviceListRecord[] = [];
        for (const classDef of parsed.classes.slice(page_size * page, page_size * (page+1))) {
            const category = getCategory(classDef);
            if (klass && klass !== category)
                continue;

            list.push({
                primary_kind: classDef.kind,
                name: classDef.nl_annotations.thingpedia_name || classDef.kind,
                description: classDef.nl_annotations.thingpedia_description || '',
                category,
                subcategory: classDef.getImplementationAnnotation<string>('subcategory') || 'service',
                license: classDef.getImplementationAnnotation<string>('license') || '',
                website: classDef.getImplementationAnnotation<string>('website') || '',
                repository: classDef.getImplementationAnnotation<string>('repository') || '',
                issue_tracker: classDef.getImplementationAnnotation<string>('issue_tracker') || '',
            });
        }
        return list;
    }

    async searchDevice(q : string) : Promise<BaseClient.DeviceListRecord[]> {
        await this._ensureLoaded();

        q = q.toLowerCase();

        const parsed = ThingTalk.Syntax.parse(this._devices!, ThingTalk.Syntax.SyntaxType.Normal, {
            locale: this.locale,
            timezone: 'UTC'
        });
        assert(parsed instanceof Ast.Library);
        const list : BaseClient.DeviceListRecord[] = [];
        for (const classDef of parsed.classes) {
            const record = {
                primary_kind: classDef.kind,
                name: classDef.nl_annotations.thingpedia_name || classDef.kind,
                description: classDef.nl_annotations.thingpedia_description || '',
                category: getCategory(classDef),
                subcategory: classDef.getImplementationAnnotation<string>('subcategory') || 'service',
                license: classDef.getImplementationAnnotation<string>('license') || '',
                website: String(classDef.getImplementationAnnotation<string>('website') || ''),
                repository: String(classDef.getImplementationAnnotation<string>('repository') || ''),
                issue_tracker: String(classDef.getImplementationAnnotation<string>('issue_tracker') || ''),
            };

            // very simple search
            if (record.name.toLowerCase().includes(q) ||
                record.description.toLowerCase().includes(q))
                list.push(record);
        }
        return list;
    }

    async getDeviceFactories(klass : string) : Promise<BaseClient.DeviceFactory[]> {
        await this._ensureLoaded();

        const parsed = ThingTalk.Syntax.parse(this._devices!, ThingTalk.Syntax.SyntaxType.Normal, {
            locale: this.locale,
            timezone: 'UTC'
        });
        assert(parsed instanceof Ast.Library);
        const list : BaseClient.DeviceFactory[] = [];
        for (const classDef of parsed.classes) {
            const factory = makeDeviceFactory(classDef);
            if (factory)
                list.push(factory);
        }
        return list;
    }

    async getSchemas(kinds : string[], useMeta ?: boolean) : Promise<string> {
        await this._ensureLoaded();

        // ignore kinds, just return the full file, SchemaRetriever will take care of the rest
        return this._devices!;
    }
    async getDeviceCode(kind : string) : Promise<string> {
        // we don't have the full class, so we just return the meta info
        await this._ensureLoaded();

        const parsed = ThingTalk.Syntax.parse(this._devices!, ThingTalk.Syntax.SyntaxType.Normal, {
            locale: this.locale,
            timezone: 'UTC'
        });
        assert(parsed instanceof Ast.Library);
        for (const classDef of parsed.classes) {
            if (classDef.kind === kind)
                return classDef.prettyprint();
        }
        throw new Error('Not Found');
    }

    async getAllExamples() : Promise<string> {
        await this._ensureLoaded();
        return this._dataset!;
    }

    async getExamplesByKey(key : string) : Promise<string> {
        throw new Error('not implemented');
    }

    async getExamplesByKinds(kinds : string[])  : Promise<string> {
        assert(Array.isArray(kinds));
        await this._ensureLoaded();

        let examples : Ast.Example[] = [];
        for (const device of kinds) {
            if (device in this._examples)
                examples = examples.concat(this._examples[device]);
        }

        const name = `org.thingpedia.dynamic.by_kinds.${kinds.join('__')}`;
        const dataset = new Ast.Dataset(null, name, examples);
        const library = new Ast.Input.Library(null, [], [dataset]);
        return library.prettyprint();
    }

    async clickExample(exampleId : number) : Promise<void> {
        // do nothing
    }

    async getAllDeviceNames() : Promise<BaseClient.DeviceNameRecord[]> {
        await this._ensureLoaded();

        const parsed = ThingTalk.Syntax.parse(this._devices!, ThingTalk.Syntax.SyntaxType.Normal, {
            locale: this.locale,
            timezone: 'UTC'
        });
        assert(parsed instanceof Ast.Library);
        const names = [];
        for (const classDef of parsed.classes) {
            names.push({
                kind: classDef.kind,
                kind_canonical: classDef.metadata.canonical as string
            });
        }
        return names;
    }

    async getAllEntityTypes() : Promise<BaseClient.EntityTypeRecord[]> {
        await this._ensureLoaded();
        return this._entities || [];
    }

    private async _httpRequest(to : string, params : APIQueryParams = {}, accept = 'application/json', options = { extractData: true }) {
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

    async lookupEntity(entityType : string, searchTerm : string) : Promise<BaseClient.EntityLookupResult> {
        if (this._entityProvider) {
            const result = await this._entityProvider.lookupEntity(entityType, searchTerm);
            if (result.length > 0)
                return { data: result, meta: { name: entityType, is_well_known: false, has_ner_support: true } };
        }

        return this._httpRequest('/entities/lookup/' + encodeURIComponent(entityType),
            { q: searchTerm }, 'application/json', { extractData: false });
    }

    lookupLocation(searchTerm : string, around ?: {
        latitude : number;
        longitude : number;
    }) : Promise<BaseClient.LocationRecord[]> {
        if (around) {
            return this._httpRequest('/locations/lookup',
                { q: searchTerm, latitude: String(around.latitude), longitude: String(around.longitude) }, 'application/json');
        } else {
            return this._httpRequest('/locations/lookup',
                { q: searchTerm }, 'application/json');
        }
    }

    invokeQuery() : never {
        throw new Error('not implemented');
    }
}
