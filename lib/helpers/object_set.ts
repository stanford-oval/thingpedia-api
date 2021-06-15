// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
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


import * as events from 'events';

/**
 * The abstract interface that all ObjectSets must conform to.
 */
class AbstractObjectSet<T> extends events.EventEmitter {
    /**
     * Notifies that an object was to this set.
     *
     * @event Helpers.ObjectSet.Base#object-added
     * @param {Object} object - the added object
     */
    /**
     * Notifies that an object was removed from this set.
     *
     * @event Helpers.ObjectSet.Base#object-removed
     * @param {Object} object - the just-removed object
     */

    protected constructor() {
        super();
        this.setMaxListeners(Infinity);
    }

    /**
     * Report the addition of an object.
     *
     * @param {Object} o - the added object
     * @fires Helpers.ObjectSet.Base#object-added
     */
    protected objectAdded(o : T) : void {
        this.emit('object-added', o);
    }

    /**
     * Report the removal of an object.
     *
     * @param {Object} o - the removed object
     * @fires Helpers.ObjectSet.Base#object-removed
     */
    protected objectRemoved(o : T) : void {
        this.emit('object-removed', o);
    }

    /* istanbul ignore next */
    /**
     * List all objects currently in the set.
     *
     * @return {Object[]} - the objects in the set
     */
    values() : T[] {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    /**
     * Start this object set.
     *
     * This should be called for ObjectSets whose content
     * changes dynamically.
     */
    async start() : Promise<void> {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    /**
     * Stop this object set.
     *
     * This should be called for ObjectSets whose content
     * changes dynamically.
     */
    async stop() : Promise<void> {
        throw new Error('Not Implemented');
    }
}

/**
 * A simple implementation of {@link Helpers.ObjectSet.Base} backed by a {@link Map}.
 */
class SimpleObjectSet<T extends { uniqueId : string; }> extends AbstractObjectSet<T> {
    private _objects : Map<string, T>;

    constructor() {
        super();

        this._objects = new Map();
    }

    values() : T[] {
        return Array.from(this._objects.values());
    }

    /* istanbul ignore next */
    async start() : Promise<void> {
    }
    /* istanbul ignore next */
    async stop() : Promise<void> {
    }

    addOne(o : T|PromiseLike<T>|null) : Promise<void> {
        if (o === null)
            return Promise.resolve();
        if (!('then' in o) || typeof o.then !== 'function') {
            const ot = o as T;
            if (this._objects.has(ot.uniqueId))
                return Promise.resolve();
            this._objects.set(ot.uniqueId, ot);
            this.objectAdded(ot);
            return Promise.resolve();
        }

        return Promise.resolve(o).then((o) => {
            if (o === null)
                return;
            if (this._objects.has(o.uniqueId))
                return;
            this._objects.set(o.uniqueId, o);
            this.objectAdded(o);
        });
    }

    async addMany(objs : Array<T|null>) : Promise<void> {
        await Promise.all(objs.map((o) => this.addOne(o)));
    }

    removeOne(o : T) : void {
        if (!this._objects.has(o.uniqueId))
            return;
        this._objects.delete(o.uniqueId);
        this.objectRemoved(o);
    }

    getById(id : string) : T|undefined {
        return this._objects.get(id);
    }

    removeById(id : string) : void {
        const old = this._objects.get(id);
        if (old === undefined)
            return;
        this._objects.delete(id);
        this.objectRemoved(old);
    }

    removeIf(predicate : (x : T) => boolean) : T[] {
        const removed = [];
        for (const entry of this._objects) {
            const key = entry[0];
            const value = entry[1];
            if (predicate(value)) {
                removed.push(value);
                this._objects.delete(key);
                this.objectRemoved(value);
            }
        }

        return removed;
    }

    removeAll() : T[] {
        const removed = this.values();
        this._objects.clear();
        for (const o of removed)
            this.objectRemoved(o);
        return removed;
    }
}

/**
 * ObjectSet is an abstract set data structure that can be monitored for additions
 * and removal.
 *
 * @namespace
 */
export {
    SimpleObjectSet as Simple,
    AbstractObjectSet as Base
};
