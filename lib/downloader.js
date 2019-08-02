// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('util');
const ThingTalk = require('thingtalk');

const Modules = require('./loaders');

function safeMkdir(dir) {
    try {
        fs.mkdirSync(dir);
    } catch(e) {
        if (e.code !== 'EEXIST')
            throw e;
    }
}

module.exports = class ModuleDownloader {
    constructor(platform, client, schemas, builtins = {}) {
        this._platform = platform;
        this._client = client;

        // used to typecheck the received manifests
        this._schemas = schemas;

        this._builtins = builtins;
        this._cacheDir = platform.getCacheDir() + '/device-classes';
        this._moduleRequests = new Map;

        safeMkdir(this._cacheDir);
        safeMkdir(this._cacheDir + '/node_modules');

        if (platform.type !== 'android') {
            try {
                fs.symlinkSync(path.dirname(require.resolve('thingpedia')),
                               this._cacheDir + '/node_modules/thingpedia');
            } catch(e) {
                if (e.code !== 'EEXIST')
                    throw e;
            }
            try {
                fs.symlinkSync(path.dirname(require.resolve('thingtalk')),
                               this._cacheDir + '/node_modules/thingtalk');
            } catch(e) {
                if (e.code !== 'EEXIST')
                    throw e;
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
                var file = path.resolve(this._cacheDir, name);
                if (name.endsWith('.tt')) {
                    const buffer = await util.promisify(fs.readFile)(file);
                    const parsed = ThingTalk.Grammar.parse(buffer.toString('utf8')).classes[0];

                    return ({ name: parsed.kind,
                              version: parsed.annotations.version.toJS() });
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

    updateModule(id) {
        return Promise.resolve().then(() => {
            if (!this._moduleRequests.has(id))
                return null;

            return this._moduleRequests.get(id).catch((e) => {
                // ignore errors
                return null;
            });
        }).then((module) => {
            this._moduleRequests.delete(id);
            return module;
        }).then((module) => {
            if (!module)
                return Promise.resolve();

            return module.clearCache();
        }).then(() => {
            return this.loadClass(id, false);
        });
    }

    getModule(id) {
        this._ensureModuleRequest(id);
        return this._moduleRequests.get(id);
    }

    async _loadClassCode(id, canUseCache) {
        if (!this._platform.hasCapability('code-download'))
            return Promise.reject(new Error('Code download is not allowed on this platform'));

        if (this._builtins[id])
            return this._builtins[id].class;

        var manifestTmpPath = this._cacheDir + '/' + id + '.tt.tmp';
        var manifestPath = this._cacheDir + '/' + id + '.tt';

        let useCached = false;

        let classCode;
        if (canUseCache) {
            try {
                const stat = await util.promisify(fs.stat)(manifestPath);
                var now = new Date;
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

    async loadClass(id, canUseCache) {
        const classCode = await this._loadClassCode(id, canUseCache);
        const parsed = await ThingTalk.Grammar.parseAndTypecheck(classCode, this._schemas);

        assert(parsed.isMeta && parsed.classes.length === 1);
        const classdef = parsed.classes[0];
        this._schemas.injectClass(classdef);
        return classdef;
    }

    injectModule(id, module) {
        this._moduleRequests.set(id, Promise.resolve(module));
    }

    async _doLoadModule(id) {
        try {
            const classdef = await this.loadClass(id, true);
            const module = classdef.loader.module;

            if (module === 'org.thingpedia.builtin') {
                if (this._builtins[id])
                    return new Modules['org.thingpedia.builtin'](id, classdef, this, this._builtins[id].module);
                else
                    return new Modules['org.thingpedia.builtin.unsupported'](id, classdef, this);
            }

            console.log('Loaded class definition for ' + id + ', module type: '+ module + ', version: ' + classdef.annotations.version.toJS());

            return new (Modules[module])(id, classdef, this);
        } catch(e) {
            // on error, propagate error but don't cache it (so the next time we'll try again)
            this._moduleRequests.delete(id);
            throw e;
        }
    }

    _ensureModuleRequest(id) {
        if (this._moduleRequests.has(id))
            return;

        const request = this._doLoadModule(id);
        this._moduleRequests.set(id, request);
    }
};
