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


import * as ThingTalk from 'thingtalk';
import * as qs from 'querystring';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import * as Helpers from './helpers';
import ClientBase from './base_client';
import { makeDeviceFactory } from './device_factory_utils';

const DEFAULT_THINGPEDIA_URL = 'https://thingpedia.stanford.edu/thingpedia';

/**
 * A Thingpedia Client that communicates with Thingpedia over HTTP(S).
 *
 * If the developer-dir shared preference is set, HTTP results are overridden
 * with the manifest.tt in the developer directory.
 *
 * @extends BaseClient
 */
export default class HttpClient extends ClientBase {
    /**
     * Construct a new HttpClient.
     *
     * @param {BasePlatform} platform - the platform owning this client
     * @param {string} [url] - the Thingpedia URL to use
     */
    constructor(platform, url = DEFAULT_THINGPEDIA_URL) {
        super();
        this.platform = platform;
        this._url = url + '/api/v3';
    }

    /**
     * Retrieve the current user's developer key.
     *
     * @type {string|null}
     */
    get developerKey() {
        return this.platform.getDeveloperKey();
    }

    get locale() {
        return this.platform.locale;
    }

    async _getLocalDeviceManifest(manifestPath, deviceKind) {
        const ourMetadata = (await util.promisify(fs.readFile)(manifestPath)).toString();
        const ourParsed = ThingTalk.Grammar.parse(ourMetadata);
        ourParsed.classes[0].annotations.version = new ThingTalk.Ast.Value.Number(-1);

        if (!ourParsed.classes[0].is_abstract) {
            try {
                const ourConfig = ourParsed.classes[0].config;
                if (!ourConfig.in_params.some((v) => v.value.isUndefined))
                    return ourParsed.classes[0];

                // ourMetadata might lack some of the fields that are in the
                // real metadata, such as api keys and OAuth secrets
                // for that reason we fetch the metadata for thingpedia as well,
                // and fill in any missing parameter
                const officialMetadata = await this._getDeviceCodeHttp(deviceKind);
                const officialParsed = ThingTalk.Grammar.parse(officialMetadata);

                ourConfig.in_params = ourConfig.in_params.filter((ip) => !ip.value.isUndefined);
                const ourConfigParams = new Set(ourConfig.in_params.map((ip) => ip.name));
                const officialConfig = officialParsed.classes[0].config;

                for (let in_param of officialConfig.in_params) {
                    if (!ourConfigParams.has(in_param.name))
                        ourConfig.in_params.push(in_param);
                }

            } catch(e) {
                if (e.code !== 404)
                    throw e;
            }
        }

        return ourParsed.classes[0];
    }

    _getDeveloperDirs() {
        const prefs = this.platform.getSharedPreferences();
        let developerDirs = prefs.get('developer-dir');
        if (!developerDirs)
            return undefined;
        if (!Array.isArray(developerDirs))
            developerDirs = [developerDirs];
        return developerDirs;
    }

    async getDeviceCode(id) {
        const developerDirs = this._getDeveloperDirs();

        if (developerDirs) {
            for (let dir of developerDirs) {
                const localPath = path.resolve(dir, id, 'manifest.tt');
                if (await util.promisify(fs.exists)(localPath))
                    return (await this._getLocalDeviceManifest(localPath, id)).prettyprint();
            }
        }

        return this._getDeviceCodeHttp(id);
    }

    async getModuleLocation(id) {
        const developerDirs = this._getDeveloperDirs();

        if (developerDirs) {
            for (let dir of developerDirs) {
                if (await util.promisify(fs.exists)(path.resolve(dir, id)))
                    return 'file://' + path.resolve(dir, id);
            }
        }

        return this._getModuleLocationHttp(id);
    }

    async getSchemas(kinds, withMetadata) {
        const developerDirs = this._getDeveloperDirs();

        if (!developerDirs)
            return this._getSchemasHttp(kinds, withMetadata);

        const forward = [];
        const handled = [];

        for (let kind of kinds) {
            let ok = false;
            for (let dir of developerDirs) {
                const localPath = path.resolve(dir, kind, 'manifest.tt');
                if (await util.promisify(fs.exists)(localPath)) {
                    handled.push(await this._getLocalDeviceManifest(localPath, kind));
                    ok = true;
                    break;
                }
            }
            if (!ok)
                forward.push(kind);
        }

        let code = '';
        if (handled.length > 0)
            code += new ThingTalk.Ast.Input.Library(null, handled, []).prettyprint();
        if (forward.length > 0)
            code += await this._getSchemasHttp(kinds, withMetadata);

        return code;
    }

    async _getLocalFactory(localPath, kind) {
        const classDef = await this._getLocalDeviceManifest(localPath, kind);
        return makeDeviceFactory(classDef, {
            category: 'data', // doesn't matter too much
            name: classDef.metadata.thingpedia_name || classDef.metadata.name || kind,
        });
    }

    async getDeviceSetup(kinds) {
        const developerDirs = this._getDeveloperDirs();

        if (!developerDirs)
            return this._getDeviceSetupHttp(kinds);

        const forward = [];
        const handled = {};

        for (let kind of kinds) {
            let ok = false;
            for (let dir of developerDirs) {
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

    _getModuleLocationHttp(id) {
        let to = this._url + '/devices/package/' + id;
        if (this.developerKey)
            to += '?developer_key=' + this.developerKey;
        return Helpers.Http.get(to, { followRedirects: false }).then((res) => {
            throw new Error(`Expected a redirect downloading device ${id}`);
        }, (err) => {
            if (err.code >= 400)
                throw new Error(`Unexpected HTTP status ${err.code} downloading device ${id}`);

            return err.redirect;
        });
    }

    async _simpleRequest(to, params = {}, accept = 'application/json', options = { extractData: true, method: 'GET' }) {
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
    _getDeviceCodeHttp(kind) {
        return this._simpleRequest('/devices/code/' + kind, {}, 'application/x-thingtalk');
    }

    async _checkSnapshot() {
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
            if (stat.mtime < Date.now() - 24 * 3600 * 1000)
                return null;

            return await util.promisify(fs.readFile)(file, { encoding: 'utf8' });
        } finally {
            await util.promisify(fs.close)(file);
        }
    }

    async _cacheSnapshot() {
        const params = {
            meta: '1',
            locale: this.locale,
            thingtalk_version: ThingTalk.version,
        };
        if (this.developerKey)
            params.developer_key = this.developerKey;
        const stream = await Helpers.Http.getStream(this._url + '/snapshot/-1?' + qs.stringify(params), '', {
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

    async _getSchemasHttp(kinds, withMetadata) {
        // if we have cached the full snapshot, we return that
        const cached = await this._checkSnapshot();
        if (cached)
            return cached;

        return this._simpleRequest('/schema/' + kinds.join(','), {
            meta: withMetadata ? '1' : '0'
        }, 'application/x-thingtalk');
    }

    getDeviceList(klass, page, page_size) {
        const params = { page, page_size };
        if (klass)
            params.class = klass;
        return this._simpleRequest('/devices/all', params);
    }

    getDeviceFactories(klass) {
        const params = {};
        if (klass)
            params.class = klass;
        return this._simpleRequest('/devices/setup', params);
    }

    _getDeviceSetupHttp(kinds) {
        return this._simpleRequest('/devices/setup/' + kinds.join(','));
    }

    async getKindByDiscovery(publicData) {
        let to = this._url + '/devices/discovery';
        const params = {
            locale: this.locale,
            thingtalk_version: ThingTalk.version
        };
        if (this.developerKey)
            params.developer_key = this.developerKey;
        const response = await Helpers.Http.post(to + '?' + qs.stringify(params), JSON.stringify(publicData), { dataContentType: 'application/json' });
        const parsed = JSON.parse(response);
        if (parsed.result !== 'ok')
            throw new Error(`Operation failed: ${parsed.error || parsed.result}`);
        return parsed.data.kind;
    }

    getExamplesByKey(key) {
        return this._simpleRequest('/examples/search', { q: key }, 'application/x-thingtalk');
    }

    async getExamplesByKinds(kinds) {
        const developerDirs = this._getDeveloperDirs();

        if (!developerDirs)
            return this._getExamplesByKinds(kinds);

        const forward = [];
        const handled = [];
        for (let kind of kinds) {
            let ok = false;
            for (let dir of developerDirs) {
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

    _getExamplesByKinds(kinds) {
        return this._simpleRequest('/examples/by-kinds/' + kinds.join(','), {}, 'application/x-thingtalk');
    }

    clickExample(exampleId) {
        return this._simpleRequest('/examples/click/' + exampleId, {}, 'application/x-thingtalk',
            { method: 'POST' });
    }

    lookupEntity(entityType, searchTerm) {
        return this._simpleRequest('/entities/lookup/' + encodeURIComponent(entityType),
            { q: searchTerm }, 'application/json', { extractData: false });
    }

    lookupLocation(searchTerm) {
        return this._simpleRequest('/locations/lookup',
            { q: searchTerm }, 'application/json');
    }

    getAllExamples() {
        return this._simpleRequest('/examples/all', {}, 'application/x-thingtalk');
    }

    async getAllEntityTypes() {
        return this._simpleRequest('/entities/all');
    }

    async getAllDeviceNames() {
        const names = [];

        let snapshot = await this._checkSnapshot();
        if (!snapshot)
            snapshot = await this._cacheSnapshot();

        const parsed = ThingTalk.Grammar.parse(snapshot);
        for (let classDef of parsed.classes) {
            names.push({
                kind: classDef.kind,
                kind_canonical: classDef.metadata.canonical
            });
        }

        const developerDirs = this._getDeveloperDirs();

        if (!developerDirs)
            return names;

        for (let dir of developerDirs) {
            for (let device of await util.promisify(fs.readdir)(dir)) {
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
}
