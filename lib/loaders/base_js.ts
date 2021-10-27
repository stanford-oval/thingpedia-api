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
import * as stream from 'stream';
import * as ThingTalk from 'thingtalk';

import { getPollInterval } from '../utils';
import { makeBaseDeviceMetadata } from '../compat';
import { ImplementationError } from '../errors';
import * as ConfigMixins from '../config';
import * as Helpers from '../helpers';
import BaseClient from '../base_client';
import type ModuleDownloader from '../downloader';
import BaseDevice from '../base_device';

import BaseLoader from './base';

/* eslint-disable no-invalid-this */

// shared code between all modules with JS implementation

function isIterable(result : any) : result is Iterable<unknown>|AsyncIterable<unknown> {
    return typeof result === 'object' && result !== null &&
        (typeof result[Symbol.iterator] === 'function' || typeof result[Symbol.asyncIterator] === 'function');
}

// wrap implementation functions in async functions
// the goal is two fold:
// - the calling code can expect a promise, rather than a raw JS result
// - synchronous errors (eg JS errors TypeErrors) get converted
//   into rejected promise, even if the error occurs before the
//   callee has a chance to set up Promise.resolve().then(() => ...)
// - type checking of the return value ensures understandable
//   error messages, rather than failing deep in a compiled ThingTalk
//   function with no stack
function safeWrapQuery<ThisArg, Args extends unknown[], Return>(query : (this : ThisArg, ...args : Args) => Promise<Return>, queryName : string) :
    (this : ThisArg, ...args : Args) => Promise<Return & Iterable<unknown>|AsyncIterable<unknown>> {
    return async function(...args) {
        const result = await query.apply(this, args);
        if (!isIterable(result))
            throw new ImplementationError(`The query ${queryName} must return an async-iterable or iterable object (eg. Array), got ${result}`);
        return result;
    };
}
function safeWrapAction<ThisArg, Args extends unknown[], Return>(action : (this : ThisArg, ...args : Args) => Promise<Return>) :
    (this : ThisArg, ...args : Args) => Promise<Return> {
    return async function(...args) {
        return action.apply(this, args);
    };
}

// same thing, but for subscribe_, which must *synchronously*
// return a stream
function safeWrapSubscribe<ThisArg, Args extends unknown[], Return>(subscribe : (this : ThisArg, ...args : Args) => Return, queryName : string)
    : (this : ThisArg, ...args : Args) => (Return & stream.Readable) {
    return function(...args) {
        const result = subscribe.apply(this, args);
        if (!(result instanceof stream.Readable))
            throw new ImplementationError(`The subscribe function for ${queryName} must return an instance of stream.Readable, got ${result}`);
        return result;
    };
}

export default abstract class BaseJavascriptLoader extends BaseLoader {
    protected _loader : ModuleDownloader;
    protected _config : ConfigMixins.Base|null;
    protected _client : BaseClient;
    protected _loading : Promise<BaseDevice.DeviceClass<BaseDevice>>|null;
    protected _modulePath : string|null;

    constructor(kind : string, manifest : ThingTalk.Ast.ClassDef, parents : Record<string, ThingTalk.Ast.ClassDef>, loader : ModuleDownloader) {
        super(kind, manifest, parents);
        assert(loader);

        this._loader = loader;
        this._client = loader.client;

        this._loading = null;
        this._modulePath = null;

        this._config = ConfigMixins.get(this._manifest);
    }

    get config() {
        return this._config;
    }

    static get [Symbol.species]() : new(kind : string,
        manifest : ThingTalk.Ast.ClassDef,
        parents : Record<string, ThingTalk.Ast.ClassDef>,
        loader : ModuleDownloader) => BaseJavascriptLoader {
        // TRICKY NOTE: in JS, "static" means class method, not static method
        // so we can use "this", and "this" refers to the class where this accessor
        // is invoked; hence, if this accessor is called on a derived class, we
        // will return the derived class, which is the desired behavior (and also
        // how this feature is used by native Array and native RegExp)
        return this as any;
    }

    abstract clearCache() : void;

    protected abstract _doGetDeviceClass() : Promise<BaseDevice.DeviceClass<BaseDevice>>;

    protected async _createSubmodule(id : string,
                                     manifest : ThingTalk.Ast.ClassDef,
                                     parents : Record<string, ThingTalk.Ast.ClassDef>,
                                     deviceClass : BaseDevice.DeviceClass<BaseDevice>) {
        const submodule = new (this.constructor as typeof BaseJavascriptLoader)[Symbol.species](id, manifest, parents, this._loader);
        await submodule._completeLoading(deviceClass);

        return submodule;
    }

    protected async _completeLoading(deviceClass : BaseDevice.DeviceClass<BaseDevice>) {
        if (this._config)
            this._config.install(deviceClass);
        deviceClass.manifest = this._manifest;
        deviceClass.metadata = makeBaseDeviceMetadata(this._manifest);

        for (const [action,] of this._iterateFunctions(this._manifest, 'actions')) {
            if (typeof deviceClass.prototype['do_' + action] !== 'function')
                throw new ImplementationError(`Implementation for action ${action} missing`);
            deviceClass.prototype['do_' + action] = safeWrapAction(deviceClass.prototype['do_' + action]);
        }
        for (const [query, queryDef] of this._iterateFunctions(this._manifest, 'queries')) {
            // skip functions with `handle_thingtalk` annotation
            if (queryDef.annotations['handle_thingtalk']) {
                if (typeof deviceClass.prototype['query'] !== 'function')
                    throw new ImplementationError(`Implementation for the query function to handle Thingtalk is missing`);
                if (queryDef.is_monitorable && typeof deviceClass.prototype['subscribe'] !== 'function')
                    throw new ImplementationError(`Implementation for the subscribe function to handle ThingTalk is missing`);
                continue;
            }

            const pollInterval = getPollInterval(queryDef);

            if (pollInterval === 0 && typeof deviceClass.prototype['subscribe_' + query] !== 'function')
                throw new ImplementationError(`Poll interval === 0 but no subscribe function was found`);
            if (typeof deviceClass.prototype['get_' + query] !== 'function')
                throw new ImplementationError(`Implementation for query ${query} missing`);

            deviceClass.prototype['get_' + query] = safeWrapQuery(deviceClass.prototype['get_' + query], query);
            if (!deviceClass.prototype['subscribe_' + query]) {
                if (pollInterval > 0) {
                    deviceClass.prototype['subscribe_' + query] = function(params : Record<string, unknown>, state : any, hints : ThingTalk.Runtime.CompiledQueryHints, env : ThingTalk.ExecEnvironment) {
                        return new Helpers.PollingStream(state, pollInterval, () => this['get_' + query](params, hints, env));
                    };
                } else if (pollInterval < 0) {
                    deviceClass.prototype['subscribe_' + query] = function(params : Record<string, unknown>, state : any, hints : ThingTalk.Runtime.CompiledQueryHints, env : ThingTalk.ExecEnvironment) {
                        throw new Error('This query is non-deterministic and cannot be monitored');
                    };
                }
            } else {
                deviceClass.prototype['subscribe_' + query] = safeWrapSubscribe(deviceClass.prototype['subscribe_' + query], query);
            }
        }

        const subdevices = deviceClass.subdevices || {};
        const child_types = this._manifest.getImplementationAnnotation<string[]>('child_types') || [];

        await Promise.all(child_types.map(async (childId) => {
            if (!(childId in subdevices)) {
                console.error(`Child device ${childId} is not declared in ${deviceClass.name}.subdevices, this will cause unexpected behavior`);
                return;
            }

            const [childClassDef, parents] = await this._loader.loadClass(childId);
            const submodule = await this._createSubmodule(childId, childClassDef, parents, subdevices[childId]);
            this._loader.injectModule(childId, submodule);
        }));

        this._loading = Promise.resolve(deviceClass);
        return deviceClass;
    }

    getDeviceClass() {
        if (this._loading)
            return this._loading;

        return this._loading = this._doGetDeviceClass();
    }
}
