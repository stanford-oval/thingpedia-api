// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2017 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Q = require('q');
const path = require('path');
const fs = require('fs');
const tmp = require('tmp');

const Module = require('module');

const Helpers = require('../helpers');

// shared code between v1 and v2 modules

function resolve(mainModule) {
    if (!mainModule.startsWith('/'))
        throw new Error('Invalid relative module path');
    if (require.resolve)
        return require.resolve(mainModule);
    else
        return Module._resolveFilename(mainModule, module, false);
}

function clearRequireCache(mainModule) {
    try {
        var fileName = resolve(mainModule);
        console.log(mainModule + ' was cached as ' + fileName);

        delete require.cache[fileName];

        var prefix = path.dirname(fileName) + '/';
        for (var key in require.cache) {
            if (key.startsWith(prefix))
                delete require.cache[key];
        }
    } catch(e) {
        // do nothing
    }
}


module.exports = class BaseJavascriptModule {
    constructor(id, manifest, platform, client) {
        this._client = client;
        this._platform = platform;
        this._cacheDir = platform.getCacheDir() + '/device-classes';
        this._id = id;
        this._manifest = manifest;

        this._loading = null;
        this._modulePath = null;
    }

    get id() {
        return this._id;
    }
    get manifest() {
        return this._manifest;
    }
    get version() {
        return this._manifest.version;
    }

    clearCache() {
        this._loading = null;

        if (this._modulePath)
            clearRequireCache(this._modulePath);
    }

    _completeLoading(module) {
        throw new Error('Must be overridden');
    }

    _loadJsModule(id) {
        var modulePath = this._modulePath;
        var version = JSON.parse(fs.readFileSync(modulePath + '/package.json').toString('utf8'))['thingpedia-version'];
        if (version !== this._manifest.version) {
            console.log('Cached module ' + this.id + ' is out of date');
            return null;
        }

        var module = require(modulePath);
        module.require = function(subpath) {
            return require(path.resolve(modulePath, subpath));
        };
        module.metadata = this._manifest;

        this._completeLoading(module);

        if (module.runOAuth2 && module.runOAuth2.install)
            module.runOAuth2.install(module.prototype);

        return module;
    }

    getDeviceFactory() {
        if (this._loading)
            return this._loading;

        this._modulePath = path.resolve(process.cwd(), this._cacheDir + '/' + this._id);

        if (fs.existsSync(this._modulePath)) {
            var cached = this._loadJsModule();
            if (cached)
                return this._loading = cached;
        }

        return this._loading = this._client.getModuleLocation(this._id, this._manifest.version)
        .then((redirect) => Helpers.Http.getStream(redirect))
        .then((response) =>
            Q.nfcall(tmp.file, { mode: 0o600,
                                    keep: true,
                                    dir: this._platform.getTmpDir(),
                                    prefix: 'thingengine-' + this._id + '-',
                                    postfix: '.zip' })
            .then((result) => {
                var stream = fs.createWriteStream('', { fd: result[1], flags: 'w' });

                return new Promise((callback, errback) => {
                    response.pipe(stream);
                    stream.on('finish', () => {
                        callback(result[0]);
                    });
                    stream.on('error', errback);
                });
            })
        ).then((zipPath) => {
            try {
                fs.mkdirSync(this._modulePath);
            } catch(e) {
                if (e.code !== 'EEXIST')
                    throw e;
            }

            var unzip = this._platform.getCapability('code-download');
            return unzip.unzip(zipPath, this._modulePath).then(() => {
                fs.unlinkSync(zipPath);
            });
        }).then(() => this._loadJsModule()).catch((e) => {
            this._loading = null;
            throw e;
        });
    }
};
