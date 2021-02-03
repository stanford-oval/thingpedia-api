// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019-2021 The Board of Trustees of the Leland Stanford Junior University
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
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as ThingTalk from 'thingtalk';

import Modules from './loaders';

import type BaseDevice from './base_device';
import type BasePlatform from './base_platform';
import type BaseClient from './base_client';

function safeMkdir(dir : string) {
    try {
        fs.mkdirSync(dir);
    } catch(e) {
        if (e.code !== 'EEXIST')
            throw e;
    }
}

function safeSymlinkSync(from : string, to : string) {
    try {
        fs.symlinkSync(from, to, 'dir');
    } catch(e) {
        if (e.code !== 'EEXIST')
            throw e;
    }
}

type BuiltinRegistry = Record<string, { class : string, module : typeof BaseDevice }>;

interface ModuleDownloaderOptions {
    builtinGettextDomain ?: string;
}

interface Module {
    id : string;
    version : unknown; // FIXME

    clearCache() : void;
}

export default class ModuleDownloader {
    private _platform : BasePlatform;
    private _client : BaseClient;
    private _schemas : ThingTalk.SchemaRetriever;
    private _builtins : BuiltinRegistry;
    private _builtinGettextDomain : string|undefined;
    private _cacheDir : string;
    private _moduleRequests : Map<string, Promise<Module>>;

    constructor(platform : BasePlatform,
                client : BaseClient,
                schemas : ThingTalk.SchemaRetriever,
                builtins : BuiltinRegistry = {},
                options : ModuleDownloaderOptions = {}) {
        this._platform = platform;
        this._client = client;

        // used to typecheck the received manifests
        this._schemas = schemas;

        this._builtins = builtins;
        this._builtinGettextDomain = options.builtinGettextDomain;
        this._cacheDir = platform.getCacheDir() + '/device-classes';
        this._moduleRequests = new Map;

        safeMkdir(this._cacheDir);
        safeMkdir(this._cacheDir + '/node_modules');

        if (platform.type !== 'android') {
            let ownPath = path.dirname(require.resolve('..'));
            if (process.env.TEST_MODE)
                ownPath = require.resolve('./index');

            safeSymlinkSync(ownPath, this._cacheDir + '/node_modules/thingpedia');
            safeSymlinkSync(path.dirname(require.resolve('thingtalk')), this._cacheDir + '/node_modules/thingtalk');

            const developerDirs = this._getDeveloperDirs();
            if (developerDirs) {
                for (const dir of developerDirs) {
                    safeMkdir(dir + '/node_modules');
                    safeSymlinkSync(ownPath, dir + '/node_modules/thingpedia');
                    safeSymlinkSync(path.dirname(require.resolve('thingtalk')), dir + '/node_modules/thingtalk');
                }
            }
        }
    }

    get platform() {
        return this._platform;
    }

    get client() {
        return this._client;
    }

    async getCachedMetas() {
        const files = await util.promisify(fs.readdir)(this._cacheDir);
        const objs = await Promise.all(files.map(async (name) => {
            try {
                if (name === 'node_modules')
                    return null;
                const file = path.resolve(this._cacheDir, name);
                if (name.endsWith('.tt')) {
                    const buffer = await util.promisify(fs.readFile)(file);
                    const parsed = ThingTalk.Syntax.parse(buffer.toString('utf8'));
                    assert(parsed instanceof ThingTalk.Ast.Library);
                    const classDef = parsed.classes[0];

                    return ({ name: classDef.kind,
                              version: classDef.getImplementationAnnotation<number>('version')! });
                } else {
                    return null;
                }
            } catch(e) {
                return ({ name: name,
                          version: 'Error: ' + e.message });
            }
        }));
        return objs.filter((o) => o !== null);
    }

    async updateModule(id : string) {
        let module;
        try {
            module = await this._moduleRequests.get(id);
        } catch(e) {
            // ignore errors
        }
        this._moduleRequests.delete(id);

        if (module)
            await module.clearCache();

        await this.loadClass(id, false);
    }

    getModule(id : string) {
        this._ensureModuleRequest(id);
        return this._moduleRequests.get(id);
    }

    private _getDeveloperDirs() : string[]|undefined {
        const prefs = this.platform.getSharedPreferences();
        let developerDirs = prefs.get('developer-dir');
        if (!developerDirs)
            return undefined;
        if (!Array.isArray(developerDirs))
            developerDirs = [developerDirs];
        return developerDirs as string[];
    }

    async _loadClassCode(id : string, canUseCache : boolean) {
        if (!this._platform.hasCapability('code-download'))
            return Promise.reject(new Error('Code download is not allowed on this platform'));

        if (this._builtins[id])
            return this._builtins[id].class;

        // if there is a developer directory, and it contains a manifest for the current device, load
        // it directly, bypassing the cache logic
        const developerDirs = this._getDeveloperDirs();

        // moderate HACK to access HttpClient internal interface
        const client : BaseClient & ({
            _getLocalDeviceManifest ?: (localPath : string, id : string) => Promise<ThingTalk.Ast.ClassDef>
        }) = this._client;
        if (developerDirs && client._getLocalDeviceManifest) {
            for (const dir of developerDirs) {
                const localPath = path.resolve(dir, id, 'manifest.tt');
                if (await util.promisify(fs.exists)(localPath))
                    return (await client._getLocalDeviceManifest(localPath, id)).prettyprint();
            }
        }

        const manifestTmpPath = this._cacheDir + '/' + id + '.tt.tmp';
        const manifestPath = this._cacheDir + '/' + id + '.tt';

        let useCached = false;

        let classCode : string;
        if (canUseCache) {
            try {
                const stat = await util.promisify(fs.stat)(manifestPath);
                const now = new Date;
                if (now.getTime() - stat.mtime.getTime() > 7 * 24 * 3600 * 1000)
                    useCached = false;
                else
                    useCached = true;
            } catch(e) {
                if (e.code !== 'ENOENT')
                    throw e;
                useCached = false;
            }
        }
        if (useCached)
            classCode = (await util.promisify(fs.readFile)(manifestPath)).toString('utf8');
        else
            classCode = await this._client.getDeviceCode(id);
        const stream = fs.createWriteStream(manifestTmpPath, { flags: 'w', mode: 0o600 });
        await new Promise((callback, errback) => {
            stream.write(classCode);
            stream.end();
            stream.on('finish', callback);
            stream.on('error', errback);
        });
        fs.renameSync(manifestTmpPath, manifestPath);
        return classCode;
    }

    async loadClass(id : string, canUseCache : boolean) {
        const classCode = await this._loadClassCode(id, canUseCache);
        const parsed = await ThingTalk.Syntax.parse(classCode).typecheck(this._schemas);

        assert(parsed instanceof ThingTalk.Ast.Library && parsed.classes.length === 1);
        const classdef = parsed.classes[0];
        this._schemas.injectClass(classdef);
        return classdef;
    }

    injectModule(id : string, module : Module) {
        this._moduleRequests.set(id, Promise.resolve(module));
    }

    private async _doLoadModule(id : string) {
        try {
            const classdef = await this.loadClass(id, true);
            const module = classdef.loader!.module as keyof typeof Modules;

            if (module === 'org.thingpedia.builtin') {
                if (this._builtins[id]) {
                    return new Modules['org.thingpedia.builtin'](id, classdef, this, this._builtins[id].module,
                                                                 this._builtinGettextDomain);
                } else {
                    return new Modules['org.thingpedia.builtin.unsupported'](id, classdef, this);
                }
            }

            console.log('Loaded class definition for ' + id + ', module type: '+ module + ', version: ' + classdef.annotations.version.toJS());

            return new (Modules[module])(id, classdef, this);
        } catch(e) {
            // on error, propagate error but don't cache it (so the next time we'll try again)
            this._moduleRequests.delete(id);
            throw e;
        }
    }

    private _ensureModuleRequest(id : string) {
        if (this._moduleRequests.has(id))
            return;

        const request = this._doLoadModule(id);
        this._moduleRequests.set(id, request);
    }
}
