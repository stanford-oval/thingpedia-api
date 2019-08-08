// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2017-2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const stream = require('stream');

const { getPollInterval } = require('../utils');
const { makeBaseDeviceMetadata } = require('../compat');
const { ImplementationError } = require('../errors');
const ConfigMixins = require('../config');
const Helpers = require('../helpers');

// shared code between all modules with JS implementation

function isIterable(result) {
    return typeof result === 'object' && result !== null &&
        typeof result[Symbol.iterator] === 'function';
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
function safeWrapQuery(query, queryName) {
    return async function () {
        const result = await query.apply(this, arguments);
        if (!isIterable(result))
            throw new ImplementationError(`The query ${queryName} must return an iterable object (eg. Array), got ${result}`);
        return result;
    };
}
function safeWrapAction(action) {
    return async function () {
        return action.apply(this, arguments);
    };
}

// same thing, but for subscribe_, which must *synchronously*
// return a stream
function safeWrapSubscribe(subscribe, queryName) {
    return function () {
        const result = subscribe.apply(this, arguments);
        if (!(result instanceof stream.Readable))
            throw new ImplementationError(`The subscribe function for ${queryName} must return an instance of stream.Readable, got ${result}`);
        return result;
    };
}

module.exports = class BaseJavascriptModule {
    constructor(id, manifest, loader) {
        assert(id);
        assert(manifest);
        assert(loader);

        this._loader = loader;
        this._client = loader.client;
        this._id = id;
        this._manifest = manifest;

        this._loading = null;
        this._modulePath = null;

        this._config = ConfigMixins.get(this._manifest);
    }

    get id() {
        return this._id;
    }
    get manifest() {
        return this._manifest;
    }
    get version() {
        return this._manifest.annotations.version.toJS();
    }

    static get [Symbol.species]() {
        // TRICKY NOTE: in JS, "static" means class method, not static method
        // so we can use "this", and "this" refers to the class where this accessor
        // is invoked; hence, if this accessor is called on a derived class, we
        // will return the derived class, which is the desired behavior (and also
        // how this feature is used by native Array and native RegExp)
        return this;
    }

    /* istanbul ignore next */
    clearCache() {
        throw new TypeError('Not Implemented');
    }

    /* istanbul ignore next */
    _doGetDeviceClass() {
        throw new TypeError('Not Implemented');
    }

    async _createSubmodule(id, manifest, deviceClass) {
        const submodule = new (this.constructor[Symbol.species])(id, manifest, this._loader);
        await submodule._completeLoading(deviceClass);

        return submodule;
    }

    async _completeLoading(deviceClass) {
        this._config.install(deviceClass);
        deviceClass.metadata = makeBaseDeviceMetadata(this._manifest);

        for (let action in this._manifest.actions) {
            if (typeof deviceClass.prototype['do_' + action] !== 'function')
                throw new ImplementationError(`Implementation for action ${action} missing`);
            deviceClass.prototype['do_' + action] = safeWrapAction(deviceClass.prototype['do_' + action]);
        }
        for (let query in this._manifest.queries) {
            //skip functions with `handle_thingtalk` annotation
            if(this._manifest.queries[query].annotations['handle_thingtalk'])
                continue;

            let pollInterval = getPollInterval(this._manifest.queries[query]);

            if (pollInterval === 0 && typeof deviceClass.prototype['subscribe_' + query] !== 'function')
                throw new ImplementationError(`Poll interval === 0 but no subscribe function was found`);
            if (typeof deviceClass.prototype['get_' + query] !== 'function')
                throw new ImplementationError(`Implementation for query ${query} missing`);

            deviceClass.prototype['get_' + query] = safeWrapQuery(deviceClass.prototype['get_' + query], query);
            if (!deviceClass.prototype['subscribe_' + query]) {
                if (pollInterval > 0) {
                    deviceClass.prototype['subscribe_' + query] = function(params, state, filter) {
                        return new Helpers.PollingStream(state, pollInterval, () => this['get_' + query](params));
                    };
                } else if (pollInterval < 0) {
                    deviceClass.prototype['subscribe_' + query] = function(params, state, filter) {
                        throw new Error('This query is non-deterministic and cannot be monitored');
                    };
                }
            } else {
                deviceClass.prototype['subscribe_' + query] = safeWrapSubscribe(deviceClass.prototype['subscribe_' + query], query);
            }
            if (!deviceClass.prototype['history_' + query]) {
                deviceClass.prototype['history_' + query] = function(params, base, delta, filters) {
                    return null; // no history
                };
            }
            if (!deviceClass.prototype['sequence_' + query]) {
                deviceClass.prototype['sequence_' + query] = function(params, base, limit, filters) {
                    return null; // no sequence history
                };
            }
        }

        const subdevices = deviceClass.subdevices || {};
        let child_types = this._manifest.annotations.child_types;
        if (child_types)
            child_types = child_types.toJS();
        else
            child_types = [];

        await Promise.all(child_types.map(async (childId) => {
            if (!(childId in subdevices)) {
                console.error(`Child device ${childId} is not declared in ${deviceClass.name}.subdevices, this will cause unexpected behavior`);
                return;
            }

            const childClassDef = await this._loader.loadClass(childId, true);
            const submodule = await this._createSubmodule(childId, childClassDef, subdevices[childId]);
            this._loader.injectModule(childId, submodule);
        }));

        this._loading = deviceClass;
        return deviceClass;
    }

    getDeviceClass() {
        if (this._loading)
            return Promise.resolve(this._loading);

        return this._loading = this._doGetDeviceClass();
    }
};
