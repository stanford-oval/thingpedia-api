// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const events = require('events');

/**
 * The abstract interface that all ObjectSets must conform to.
 *
 * @memberof! module:Helpers.ObjectSet
 */
class Base extends events.EventEmitter {
    /**
     * Notifies that an object was to this set.
     *
     * @event module:Helpers.ObjectSet.Base#object-added
     * @param {Object} object - the added object
     */
    /**
     * Notifies that an object was removed from this set.
     *
     * @event module:Helpers.ObjectSet.Base#object-removed
     * @param {Object} object - the just-removed object
     */

    /**
     * @protected
     */
    constructor() {
        super();
        this.setMaxListeners(Infinity);
    }

    /**
     * Report the addition of an object.
     *
     * @param {Object} o - the added object
     * @fires module:Helpers.ObjectSet.Base#object-added
     * @protected
     */
    objectAdded(o) {
        this.emit('object-added', o);
    }

    /**
     * Report the removal of an object.
     *
     * @param {Object} o - the removed object
     * @fires module:Helpers.ObjectSet.Base#object-removed
     * @protected
     */
    objectRemoved(o) {
        this.emit('object-removed', o);
    }

    /* istanbul ignore next */
    /**
     * List all objects currently in the set.
     *
     * @return {Object[]} - the objects in the set
     * @abstract
     */
    values() {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    /**
     * Start this object set.
     *
     * This should be called for ObjectSets whose content
     * changes dynamically.
     * @abstract
     */
    async start() {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    /**
     * Stop this object set.
     *
     * This should be called for ObjectSets whose content
     * changes dynamically.
     * @abstract
     */
    async stop() {
        throw new Error('Not Implemented');
    }
}

/**
 * A simple implementation of {@link module:Helpers.ObjectSet.Base} backed by a {@link Map}.
 *
 * @extends module:Helpers.ObjectSet.Base
 * @memberof! module:Helpers.ObjectSet
 */
class Simple extends Base {
    constructor() {
        super();

        this._objects = new Map();
    }

    values() {
        return Array.from(this._objects.values());
    }

    /* istanbul ignore next */
    start() {
    }
    /* istanbul ignore next */
    stop() {
    }

    addOne(o) {
        if (o === null)
            return Promise.resolve();
        if (typeof o.then !== 'function') {
            if (this._objects.has(o.uniqueId))
                return Promise.resolve();
            this._objects.set(o.uniqueId, o);
            this.objectAdded(o);
            return Promise.resolve();
        }

        return o.then((o) => {
            if (o === null)
                return;
            if (this._objects.has(o.uniqueId))
                return;
            this._objects.set(o.uniqueId, o);
            this.objectAdded(o);
        });
    }

    addMany(objs) {
        return Promise.all(objs.map((o) => this.addOne(o)));
    }

    removeOne(o) {
        if (!this._objects.has(o.uniqueId))
            return;
        this._objects.delete(o.uniqueId);
        this.objectRemoved(o);
    }

    getById(id) {
        return this._objects.get(id);
    }

    removeById(id) {
        if (!this._objects.has(id))
            return;
        var old = this._objects.get(id);
        this._objects.delete(id);
        this.objectRemoved(old);
    }

    removeIf(predicate) {
        var removed = [];
        for (var entry of this._objects) {
            var key = entry[0];
            var value = entry[1];
            if (predicate(value)) {
                removed.push(value);
                this._objects.delete(key);
                this.objectRemoved(value);
            }
        }

        return removed;
    }

    removeAll() {
        var removed = this.values();
        this._objects.clear();
        for (var o of removed)
            this.objectRemoved(o);
        return removed;
    }
}

/**
 * ObjectSet is an abstract set data structure that can be monitored for additions
 * and removal.
 *
 * @namespace
 * @alias module:Helpers.ObjectSet
 */
module.exports = {
    Simple,
    Base
};
