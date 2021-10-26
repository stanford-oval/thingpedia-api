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

import * as ThingTalk from 'thingtalk';
import * as path from 'path';
import * as fs from 'fs';
import * as tmp from 'tmp';
import * as util from 'util';
import * as Module from 'module';

import * as Helpers from '../helpers';
import * as I18n from '../i18n';
import BasePlatform from '../base_platform';
import ModuleDownloader from '../downloader';
import BaseDevice from '../base_device';

import BaseJavascriptLoader from './base_js';

function resolve(mainModule : string) {
    if (process.platform !== 'win32' && !mainModule.startsWith('/'))
        throw new Error('Invalid relative module path');
    if (require.resolve)
        return require.resolve(mainModule);
    else
        return (Module as any)._resolveFilename(mainModule, module, false);
}

function clearRequireCache(mainModule : string) {
    try {
        const fileName = resolve(mainModule);
        console.log(mainModule + ' was cached as ' + fileName);

        delete require.cache[fileName];

        const prefix = path.dirname(fileName) + '/';
        for (const key in require.cache) {
            if (key.startsWith(prefix))
                delete require.cache[key];
        }
    } catch(e) {
        // do nothing
    }
}

/**
 * Base class of all loaders that retrieve JS code on-demand from a
 * Thingpedia server and cache it on disk.
 *
 * This differs from {@link BaseJavascriptLoader} because the latter covers
 * {@link BuiltinLoader} too.
 */
export default class BaseOnDiskJavascriptLoader extends BaseJavascriptLoader {
    private _platform : BasePlatform;
    private _cacheDir : string;

    constructor(kind : string, manifest : ThingTalk.Ast.ClassDef, parents : Record<string, ThingTalk.Ast.ClassDef>, loader : ModuleDownloader) {
        super(kind, manifest, parents, loader);

        this._platform = loader.platform;
        this._cacheDir = loader.platform.getCacheDir() + '/device-classes';
        this._modulePath = null;

        // for compat with thingpedia devices that have not been updated recently
        if (!this._manifest.annotations.package_version)
            this._manifest.annotations.package_version = this._manifest.annotations.version;
    }

    get package_version() {
        return this._manifest.annotations.package_version.toJS() as number;
    }

    clearCache() {
        this._loading = null;

        if (this._modulePath)
            clearRequireCache(this._modulePath);
    }

    private async _loadJsModule() {
        const modulePath = this._modulePath!;
        const version = JSON.parse(fs.readFileSync(modulePath + '/package.json').toString('utf8'))['thingpedia-version'];

        if (version !== undefined && version !== this.package_version) {
            console.log(`Cached module ${this.id} is out of date (found ${version}, want ${this.package_version})`);
            return null;
        }

        let deviceClass = await import(modulePath);
        // ES Module compatibility for "export default"
        if (typeof deviceClass !== 'function' && typeof deviceClass.default === 'function')
            deviceClass = deviceClass.default;
        deviceClass.require = function(subpath : string) {
            return require(path.resolve(modulePath, subpath));
        };

        const modir = path.resolve(modulePath, 'po');

        const gettext = this._platform.getCapability('gettext');
        if (await util.promisify(fs.exists)(modir)) {
            if (gettext && this._platform.locale !== 'en-US')
                await I18n.loadTextdomainDirectory(gettext, this._platform.locale, this.id, modir);
        }
        if (gettext) {
            deviceClass.gettext = {
                gettext: gettext.dgettext.bind(gettext, this.id),
                ngettext: gettext.dngettext.bind(gettext, this.id)
            };
        } else {
            deviceClass.gettext = {
                gettext(x : string) {
                    return x;
                },
                ngettext(x1 : string, xn : string, n : number) {
                    return n === 1 ? x1 : xn;
                },
            };
        }

        return this._completeLoading(deviceClass);
    }

    protected async _doGetDeviceClass() : Promise<BaseDevice.DeviceClass<BaseDevice>> {
        this._modulePath = path.resolve(process.cwd(), this._cacheDir + '/' + this._id);

        try {
            if (fs.existsSync(this._modulePath)) {
                const deviceClass = await this._loadJsModule();
                if (deviceClass !== null)
                    return deviceClass;
            }

            if (!this._platform.hasCapability('code-download'))
                throw new Error('Code download is not allowed on this platform');

            const redirect = await this._client.getModuleLocation(this._id);

            if (redirect.startsWith('file:///') && !redirect.endsWith('.zip')) {
                this._modulePath = redirect.substring('file://'.length);
                return (await this._loadJsModule())!;
            }

            const response = await Helpers.Content.getStream(this._platform, redirect);

            const [path, fd] = await new Promise<[string, number]>((resolve, reject) => {
                tmp.file({ mode: 0o600,
                           keep: true,
                           dir: this._platform.getTmpDir(),
                           prefix: 'thingengine-' + this._id + '-',
                           postfix: '.zip' }, (err, path, fd) => {
                    if (err)
                        reject(err);
                    else
                        resolve([path, fd]);
                });
            });
            const stream = fs.createWriteStream('', { fd, flags: 'w' });
            const zipPath = await new Promise<string>((callback, errback) => {
                response.pipe(stream);
                stream.on('finish', () => {
                    callback(path);
                });
                stream.on('error', errback);
            });
            try {
                fs.mkdirSync(this._modulePath);
            } catch(e : any) {
                if (e.code !== 'EEXIST')
                    throw e;
            }

            const unzip = this._platform.getCapability('code-download')!;
            await unzip.unzip(zipPath, this._modulePath);
            fs.unlinkSync(zipPath);
            return (await this._loadJsModule())!;
        } catch(e) {
            this._loading = null;
            throw e;
        }
    }
}
