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

const events = require('events');

// The abstract interface that all ObjectSets must conform to
//
// Some ObjectSets are read-only, in which case the mutator methods will fail
class ObjectSet extends events.EventEmitter {
    // events: object-added(object), object-removed(object)

    constructor() {
        super();
        this.setMaxListeners(Infinity);
    }

    objectAdded(o) {
        this.emit('object-added', o);
    }

    objectRemoved(o) {
        this.emit('object-removed', o);
    }

    values() {
        throw new Error('Not Implemented');
    }

    start() {
        throw new Error('Not Implemented');
    }

    stop() {
        throw new Error('Not Implemented');
    }
}

class SimpleObjectSet extends ObjectSet {
    constructor() {
        super();

        this._objects = new Map();
    }

    values() {
        return Array.from(this._objects.values());
    }

    start() {
    }

    stop() {
    }

    addOne(o) {
        if (o === null)
            return;
        if (typeof o.then !== 'function') {
            if (this._objects.has(o.uniqueId))
                return;
            this._objects.set(o.uniqueId, o);
            this.objectAdded(o);
            return;
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

module.exports = {
    Simple: SimpleObjectSet,
    Base: ObjectSet
};
