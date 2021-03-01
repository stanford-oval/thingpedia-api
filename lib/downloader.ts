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
        const cached = [];
        for (const promise of this._moduleRequests.values()) {
            try {
                const module = await promise;
                cached.push({ name: module.id, version: module.version });
            } catch(e) {
                // ignore error if the module fails to load
            }
        }
        return cached;
    }

    async updateModule(id : string) {
        let oldModule;
        try {
            oldModule = await this._moduleRequests.get(id);
        } catch(e) {
            // ignore errors
        }
        this._moduleRequests.delete(id);

        const newModule = await this.getModule(id);

        if (oldModule) {
            if (oldModule.version === newModule.version) {
                // keep the old module we had already loaded
                // this avoids reloading the JS code multiple times
                // unnecessarily
                this._moduleRequests.set(id, Promise.resolve(oldModule));
            } else {
                // remove any remnant of the old module
                await oldModule.clearCache();
            }
        }
    }

    getModule(id : string) {
        this._ensureModuleRequest(id);
        return this._moduleRequests.get(id)!;
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
        if (this._builtins[id])
            return this._builtins[id].class;

        return this._client.getDeviceCode(id);
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
