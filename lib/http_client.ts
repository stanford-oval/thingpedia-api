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
import * as qs from 'querystring';
import * as fs from 'fs';
import { promises as pfs } from 'fs';
import * as path from 'path';
import * as util from 'util';
import byline from 'byline';

import * as Helpers from './helpers';
import BaseClient from './base_client';
import BasePlatform from './base_platform';
import { makeDeviceFactory } from './device_factory_utils';
import FileParameterProvider from './file_parameter_provider';

const DEFAULT_THINGPEDIA_URL = 'https://thingpedia.stanford.edu/thingpedia';

interface SimpleRequestOptions {
    extractData ?: boolean;
    method ?: string;
}
interface APIQueryParams {
    locale ?: string;
    thingtalk_version ?: string;
    developer_key ?: string;
    [key : string] : string|undefined;
}

/**
 * A Thingpedia Client that communicates with Thingpedia over HTTP(S).
 *
 * If the developer-dir shared preference is set, HTTP results are overridden
 * with the manifest.tt in the developer directory.
 *
 */
export default class HttpClient extends BaseClient {
    platform : BasePlatform;
    private _url : string;
    private _localEntityProvider : Promise<FileParameterProvider|null>|null;

    /**
     * Construct a new HttpClient.
     *
     * @param {BasePlatform} platform - the platform owning this client
     * @param {string} [url] - the Thingpedia URL to use
     */
    constructor(platform : BasePlatform, url = DEFAULT_THINGPEDIA_URL) {
        super();
        this.platform = platform;
        this._url = url + '/api/v3';
        this._localEntityProvider = null;
    }

    /**
     * Retrieve the current user's developer key.
     *
     */
    get developerKey() : string|null {
        return this.platform.getDeveloperKey();
    }

    get locale() : string {
        return this.platform.locale;
    }

    private _jsonToAstValue(value : unknown) : Ast.Value {
        if (value === null || value === undefined)
            return new Ast.UndefinedValue();

        if (typeof value === 'boolean')
            return new Ast.BooleanValue(value);
        else if (typeof value === 'number')
            return new Ast.NumberValue(value);
        else if (typeof value === 'string')
            return new Ast.StringValue(value);

        if (Array.isArray(value))
            return new Ast.ArrayValue(value.map((v) => this._jsonToAstValue(v)));

        const obj = value as Record<string, unknown>;
        const mapped : Record<string, Ast.Value> = {};
        for (const key in obj)
            mapped[key] = this._jsonToAstValue(obj[key]);
        return new Ast.ObjectValue(mapped);
    }

    private async _addConfigFromSecretsJSON(ourConfig : Ast.MixinImportStmt, filepath : string, deviceKind ?: string) {
        try {
            let secretJSON = JSON.parse(await pfs.readFile(filepath, { encoding: 'utf8' }));
            if (typeof secretJSON !== 'object' || secretJSON === null)
                return;
            if (deviceKind !== undefined)
                secretJSON = secretJSON[deviceKind];
            if (typeof secretJSON !== 'object' || secretJSON === null)
                return;

            for (const inParam of ourConfig.in_params) {
                if (inParam.value.isUndefined && secretJSON[inParam.name] !== undefined)
                    inParam.value = this._jsonToAstValue(secretJSON[inParam.name]);
            }
        } catch(e) {
            // ignore error if the file is missing, or if it doesn't parse as JSON (likely encrypted)
            if (e.code === 'ENOENT' || e.name === 'SyntaxError')
                return;

            throw e;
        }
    }

    private async _addConfigFromThingpedia(ourConfig : Ast.MixinImportStmt, deviceKind : string) {
        try {
            const officialMetadata = await this._getDeviceCodeHttp(deviceKind);
            const officialParsed = ThingTalk.Syntax.parse(officialMetadata, ThingTalk.Syntax.SyntaxType.Normal, {
                locale: this.locale,
                timezone: 'UTC'
            });
            assert(officialParsed instanceof Ast.Library);

            ourConfig.in_params = ourConfig.in_params.filter((ip) => !ip.value.isUndefined);
            const ourConfigParams = new Set(ourConfig.in_params.map((ip) => ip.name));
            const officialConfig = officialParsed.classes[0].config;
            assert(officialConfig);

            for (const in_param of officialConfig.in_params) {
                if (!ourConfigParams.has(in_param.name))
                    ourConfig.in_params.push(in_param);
            }
        } catch(e) {
            if (e.code !== 404)
                throw e;
        }
    }

    private async _getLocalDeviceManifest(manifestPath : string, deviceKind : string) {
        const ourMetadata = (await util.promisify(fs.readFile)(manifestPath)).toString();
        const ourParsed = ThingTalk.Syntax.parse(ourMetadata, ThingTalk.Syntax.SyntaxType.Normal, {
            locale: this.locale,
            timezone: 'UTC'
        });
        assert(ourParsed instanceof Ast.Library);

        const ourClassDef = ourParsed.classes[0];
        ourClassDef.annotations.version = new Ast.Value.Number(-1);

        if (ourClassDef.is_abstract)
            return ourClassDef;

        const ourConfig = ourClassDef.config;
        if (!ourConfig)
            return ourClassDef;

        // ourConfig might lack some of the fields that are in the
        // real metadata, such as api keys and OAuth secrets
        //
        // we look in three places for the missing fields:
        // 1. in a secrets.json file in the same directory, containing directly the secrets for this device
        // 2. in a secrets.json file in the global user directory, containing secrets for all devices (indexed by device kind)
        // 3. in the upstream thingpedia

        if (ourConfig.in_params.every((v) => !v.value.isUndefined))
            return ourClassDef;
        await this._addConfigFromSecretsJSON(ourConfig, path.resolve(manifestPath, '../secrets.json'));
        if (ourConfig.in_params.every((v) => !v.value.isUndefined))
            return ourClassDef;

        await this._addConfigFromSecretsJSON(ourConfig, path.resolve(this.platform.getWritableDir(), 'secrets.json'), deviceKind);
        if (ourConfig.in_params.every((v) => !v.value.isUndefined))
            return ourClassDef;

        await this._addConfigFromThingpedia(ourConfig, deviceKind);
        return ourClassDef;
    }

    private _getDeveloperDirs() : string[]|undefined {
        const prefs = this.platform.getSharedPreferences();
        let developerDirs = prefs.get('developer-dir') as string[]|string|undefined;
        if (!developerDirs)
            return undefined;
        if (!Array.isArray(developerDirs))
            developerDirs = [developerDirs];
        return developerDirs;
    }

    private async _tryGetLocalDeviceManifest(developerDirs : string[], kind : string) {
        const localeParts = this.locale.toLowerCase().split(/[-_.@]/);

        // try with locale first
        while (localeParts.length > 0) {
            for (const dir of developerDirs) {
                const localPath = path.resolve(dir, kind, `manifest.${localeParts.join('-')}.tt`);
                if (await util.promisify(fs.exists)(localPath))
                    return this._getLocalDeviceManifest(localPath, kind);
            }
            localeParts.pop();
        }

        // try without locale next
        for (const dir of developerDirs) {
            const localPath = path.resolve(dir, kind, `manifest.tt`);
            if (await util.promisify(fs.exists)(localPath))
                return this._getLocalDeviceManifest(localPath, kind);
        }

        return null;
    }

    async getDeviceCode(kind : string) : Promise<string> {
        const developerDirs = this._getDeveloperDirs();

        if (developerDirs) {
            const classDef = await this._tryGetLocalDeviceManifest(developerDirs, kind);
            if (classDef !== null)
                return classDef.prettyprint();
        }

        return this._getDeviceCodeHttp(kind);
    }

    async getModuleLocation(id : string) : Promise<string> {
        const developerDirs = this._getDeveloperDirs();

        if (developerDirs) {
            for (const dir of developerDirs) {
                if (await util.promisify(fs.exists)(path.resolve(dir, id)))
                    return 'file://' + path.resolve(dir, id);
            }
        }

        return this._getModuleLocationHttp(id);
    }

    async getSchemas(kinds : string[], withMetadata ?: boolean) : Promise<string> {
        const developerDirs = this._getDeveloperDirs();

        if (!developerDirs)
            return this._getSchemasHttp(kinds, withMetadata);

        const forward : string[] = [];
        const handled : Ast.ClassDef[] = [];

        for (const kind of kinds) {
            const classDef = await this._tryGetLocalDeviceManifest(developerDirs, kind);
            if (classDef !== null)
                handled.push(classDef);
            else
                forward.push(kind);
        }

        let code = '';
        if (handled.length > 0)
            code += new Ast.Input.Library(null, handled, []).prettyprint();
        if (forward.length > 0)
            code += await this._getSchemasHttp(kinds, withMetadata);

        return code;
    }

    private async _getLocalFactory(localPath : string, kind : string) : Promise<BaseClient.DeviceFactory|null> {
        const classDef = await this._getLocalDeviceManifest(localPath, kind);
        return makeDeviceFactory(classDef);
    }

    async getDeviceSetup(kinds : string[]) : Promise<{ [key : string] : BaseClient.DeviceFactory|null }> {
        const developerDirs = this._getDeveloperDirs();

        if (!developerDirs)
            return this._getDeviceSetupHttp(kinds);

        const forward : string[] = [];
        const handled : { [key : string] : BaseClient.DeviceFactory|null } = {};

        for (const kind of kinds) {
            let ok = false;
            for (const dir of developerDirs) {
                const localPath = path.resolve(dir, kind, 'manifest.tt');
                if (await util.promisify(fs.exists)(localPath)) {
                    handled[kind] = await this._getLocalFactory(localPath, kind);
                    ok = true;
                    break;
                }
            }
            if (!ok)
                forward.push(kind);
        }

        if (forward.length > 0)
            Object.assign(handled, await this._getDeviceSetupHttp(forward));

        return handled;
    }

    private _getModuleLocationHttp(id : string) : Promise<string> {
        let to = this._url + '/devices/package/' + id;
        if (this.developerKey)
            to += '?developer_key=' + this.developerKey;
        return Helpers.Http.get(to, { followRedirects: false }).then((res : string) => {
            throw new Error(`Expected a redirect downloading device ${id}`);
        }, (err : Helpers.Http.HTTPError) => {
            if (err.code >= 400)
                throw new Error(`Unexpected HTTP status ${err.code} downloading device ${id}`);

            return err.redirect!;
        });
    }

    private async _simpleRequest(to : string,
                                 params : APIQueryParams = {},
                                 accept = 'application/json',
                                 options : SimpleRequestOptions = { extractData: true, method: 'GET' }) : Promise<any> {
        params.locale = this.locale;
        params.thingtalk_version = ThingTalk.version;
        if (this.developerKey)
            params.developer_key = this.developerKey;
        to += '?' + qs.stringify(params);
        const response = await Helpers.Http.request(this._url + to, options.method || 'GET', '', { accept });
        if (accept === 'application/json') {
            const parsed = JSON.parse(response);
            if (parsed.result !== 'ok')
                throw new Error(`Operation failed: ${parsed.error || parsed.result}`);
            if (options.extractData)
                return parsed.data;
            else
                return parsed;
        } else {
            return response;
        }
    }

    // raw manifest code
    private _getDeviceCodeHttp(kind : string) {
        return this._simpleRequest('/devices/code/' + kind, {}, 'application/x-thingtalk');
    }

    private async _checkSnapshot() : Promise<string|null> {
        const cachePath = path.resolve(this.platform.getCacheDir(), 'snapshot.tt');
        // open the file first so we can be correct wrt concurrent writes to the file (which
        // occur as atomic renames)
        let file;
        try {
            file = await util.promisify(fs.open)(cachePath, 'r', 0o666);
        } catch(e) {
            if (e.code === 'ENOENT')
                return null;
            else
                throw e;
        }
        try {
            const stat = await util.promisify(fs.fstat)(file);
            // cache again if older than one day
            if (Number(stat.mtime) < Date.now() - 24 * 3600 * 1000)
                return null;

            return await util.promisify(fs.readFile)(file, { encoding: 'utf8' });
        } finally {
            await util.promisify(fs.close)(file);
        }
    }

    private async _cacheSnapshot() : Promise<string> {
        const params : APIQueryParams = {
            meta: '1',
            locale: this.locale,
            thingtalk_version: ThingTalk.version,
        };
        if (this.developerKey)
            params.developer_key = this.developerKey;
        const stream = await Helpers.Http.getStream(this._url + '/snapshot/-1?' + qs.stringify(params), {
            accept: 'application/x-thingtalk'
        });
        const cachePath = path.resolve(this.platform.getCacheDir(), 'snapshot.tt');

        // perform an atomic write on the snapshot file: write to a temporary file then rename the file
        const cacheFile = fs.createWriteStream(cachePath + '.tmp');
        stream.pipe(cacheFile);
        await new Promise((resolve, reject) => {
            cacheFile.on('error', reject);
            cacheFile.on('finish', resolve);
        });
        await util.promisify(fs.rename)(cachePath + '.tmp', cachePath);
        return util.promisify(fs.readFile)(cachePath, { encoding: 'utf8' });
    }

    private async _getSchemasHttp(kinds : string[], withMetadata ?: boolean) : Promise<string> {
        // if we have cached the full snapshot, we return that
        const cached = await this._checkSnapshot();
        if (cached)
            return cached;

        return this._simpleRequest('/schema/' + kinds.join(','), {
            meta: withMetadata ? '1' : '0'
        }, 'application/x-thingtalk');
    }

    getDeviceList(klass ?: string, page ?: number, page_size ?: number) : Promise<BaseClient.DeviceListRecord[]> {
        const params : APIQueryParams = {
            page: page !== undefined ? String(page) : undefined,
            page_size: page_size !== undefined ? String(page_size) : undefined
        };
        if (klass)
            params.class = klass;
        return this._simpleRequest('/devices/all', params);
    }

    searchDevice(q : string) : Promise<BaseClient.DeviceListRecord[]> {
        return this._simpleRequest('/devices/search', { q });
    }

    getDeviceFactories(klass ?: string) : Promise<BaseClient.DeviceFactory[]> {
        const params : APIQueryParams = {};
        if (klass)
            params.class = klass;
        return this._simpleRequest('/devices/setup', params);
    }

    private _getDeviceSetupHttp(kinds : string[]) : Promise<{ [key : string] : BaseClient.DeviceFactory }> {
        return this._simpleRequest('/devices/setup/' + kinds.join(','));
    }

    async getKindByDiscovery(publicData : any) : Promise<string> {
        const to = this._url + '/devices/discovery';
        const params : APIQueryParams = {
            locale: this.locale,
            thingtalk_version: ThingTalk.version
        };
        if (this.developerKey)
            params.developer_key = this.developerKey;
        const response = await Helpers.Http.post(to + '?' + qs.stringify(params), JSON.stringify(publicData), { dataContentType: 'application/json' });
        assert(typeof response === 'string');
        const parsed = JSON.parse(response);
        if (parsed.result !== 'ok')
            throw new Error(`Operation failed: ${parsed.error || parsed.result}`);
        return parsed.data.kind;
    }

    getExamplesByKey(key : string) : Promise<string> {
        return this._simpleRequest('/examples/search', { q: key }, 'application/x-thingtalk');
    }

    async getExamplesByKinds(kinds : string[]) : Promise<string> {
        const developerDirs = this._getDeveloperDirs();

        if (!developerDirs)
            return this._getExamplesByKinds(kinds);

        const forward : string[] = [];
        const handled : string[]  = [];
        for (const kind of kinds) {
            let ok = false;
            for (const dir of developerDirs) {
                const localPath = path.resolve(dir, kind, 'dataset.tt');
                if (await util.promisify(fs.exists)(localPath)) {
                    handled.push(await util.promisify(fs.readFile)(localPath, { encoding: 'utf8' }));
                    ok = true;
                    break;
                }
            }
            if (!ok)
                forward.push(kind);
        }

        if (forward.length > 0)
            handled.push(await this._getExamplesByKinds(forward));

        const buffer = handled.join('\n');
        return buffer;
    }

    private _getExamplesByKinds(kinds : string[]) : Promise<string> {
        return this._simpleRequest('/examples/by-kinds/' + kinds.join(','), {}, 'application/x-thingtalk');
    }

    clickExample(exampleId : number) : Promise<void> {
        return this._simpleRequest('/examples/click/' + exampleId, {}, 'application/x-thingtalk',
            { method: 'POST' });
    }

    private _getLocalEntityProvider() {
        if (this._localEntityProvider)
            return this._localEntityProvider;
        return this._localEntityProvider = this._doGetLocalEntityProvider();
    }

    private async _getParameterDatasetsFile() {
        const developerDirs = this._getDeveloperDirs();

        if (!developerDirs)
            return null;

        // for each developer directory, search in the same directory
        // and in the parent directory
        // this covers the normal case where it's in the same directory,
        // and the thingpedia-common-devices case
        for (const d of developerDirs) {
            let localPath = path.resolve(d, 'parameter-datasets.tsv');
            if (await util.promisify(fs.exists)(localPath))
                return localPath;
            localPath = path.resolve(d, '../parameter-datasets.tsv');
            if (await util.promisify(fs.exists)(localPath))
                return localPath;
        }

        return null;
    }

    private async _doGetLocalEntityProvider() {
        const filename = await this._getParameterDatasetsFile();
        if (!filename)
            return null;
        const provider = new FileParameterProvider(filename, this.platform.locale);
        await provider.load();
        return provider;
    }

    async lookupEntity(entityType : string, searchTerm : string) : Promise<BaseClient.EntityLookupResult> {
        const localProvider = await this._getLocalEntityProvider();
        if (localProvider) {
            // ignore search term, return everything
            const result = await localProvider.lookupEntity(entityType, searchTerm);
            if (result.length > 0)
                return { data: result, meta: { name: entityType, is_well_known: false, has_ner_support: true } };
        }

        try {
            return await this._simpleRequest('/entities/lookup/' + encodeURIComponent(entityType),
                { q: searchTerm }, 'application/json', { extractData: false });
        } catch(e) {
            if (e.code !== 404)
                throw e;
            return { data: [], meta: { name: entityType, is_well_known: false, has_ner_support: false } };
        }
    }

    lookupLocation(searchTerm : string, around ?: {
        latitude : number;
        longitude : number;
    }) : Promise<BaseClient.LocationRecord[]> {
        if (around) {
            return this._simpleRequest('/locations/lookup',
                { q: searchTerm, latitude: String(around.latitude), longitude: String(around.longitude) }, 'application/json');
        } else {
            return this._simpleRequest('/locations/lookup',
                { q: searchTerm }, 'application/json');
        }
    }

    getAllExamples() : Promise<string> {
        return this._simpleRequest('/examples/all', {}, 'application/x-thingtalk');
    }

    async getAllEntityTypes() : Promise<BaseClient.EntityTypeRecord[]> {
        return this._simpleRequest('/entities/all');
    }

    async getAllDeviceNames() : Promise<BaseClient.DeviceNameRecord[]> {
        const names : BaseClient.DeviceNameRecord[] = [];

        let snapshot = await this._checkSnapshot();
        if (!snapshot)
            snapshot = await this._cacheSnapshot();

        const parsed = ThingTalk.Syntax.parse(snapshot, ThingTalk.Syntax.SyntaxType.Normal, {
            locale: this.locale,
            timezone: 'UTC'
        });
        assert(parsed instanceof Ast.Library);
        for (const classDef of parsed.classes) {
            names.push({
                kind: classDef.kind,
                kind_canonical: classDef.metadata.canonical
            });
        }

        const developerDirs = this._getDeveloperDirs();

        if (!developerDirs)
            return names;

        for (const dir of developerDirs) {
            for (const device of await util.promisify(fs.readdir)(dir)) {
                const localPath = path.resolve(dir, device, 'dataset.tt');
                if (await util.promisify(fs.exists)(localPath)) {
                    const classDef = (await this._getLocalDeviceManifest(localPath, device));
                    names.push({
                        kind: classDef.kind,
                        kind_canonical: classDef.metadata.canonical
                    });
                }
            }
        }

        return names;
    }

    async *invokeQuery(kind : string, uniqueId : string, query : string, params : Record<string, unknown>, hints : ThingTalk.Runtime.CompiledQueryHints) : AsyncIterable<Record<string, unknown>> {
        const queryparams : APIQueryParams = {
            locale: this.locale,
            thingtalk_version: ThingTalk.version,
        };
        if (this.developerKey)
            queryparams.developer_key = this.developerKey;

        const stream = await Helpers.Http.requestStream(this._url + '/proxy/query/' + kind + '/' + query + qs.stringify(queryparams), 'POST',
            JSON.stringify({ uniqueId, params, hints }), {
            accept: 'application/json-l'
            });

        for await (const line of stream.pipe(byline()))
            yield JSON.parse(line);
    }
}
