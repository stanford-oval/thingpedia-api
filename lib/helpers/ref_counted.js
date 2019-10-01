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

async function pFinally(promise, finallyClause) {
    try {
        return await promise;
    } finally {
        finallyClause();
    }
}

/**
 * Base class for an object that has reference-counting.
 *
 * This class can be used to manage the lifetime of some resource (like
 * a file or a socket) in a deterministic manner among multiple users.
 *
 * @extends events.EventEmitter
 * @alias module:Helpers.RefCounted
 */
class RefCounted extends events.EventEmitter {
    /**
     * Construct a new reference counted object.
     *
     * The object has initial reference count of 0. You must call {@link module:Helpers.RefCounted#open} before use.
     *
     * @protected
     */
    constructor() {
        super();
        this.setMaxListeners(0);

        this._useCount = 0;
        this._openPromise = null;
        this._closePromise = null;
    }

    /**
     * Open a reference to the underlying resource.
     *
     * This method is called when the reference count goes from 0 to 1.
     *
     * @abstract
     * @protected
     */
    async _doOpen() {
    }

    /**
     * Release the underlying resource.
     *
     * This method is called when the reference count goes from 1 to 0.
     *
     * @abstract
     * @protected
     */
    async _doClose() {
    }

    /**
     * Obtain a reference to the underlying resource.
     *
     * This method ensures that the resource is initialized, and increases
     * the reference count.
     *
     * @async
     */
    open() {
        // if closing, wait to fully close then reopen
        if (this._closePromise) {
            return this._closePromise.then(() => {
                return this.open();
            });
        }

        this._useCount++;
        if (this._useCount === 1) {
            // first open
            if (this._openPromise) throw new Error('bookkeeping error');
            return this._openPromise = pFinally(Promise.resolve(this._doOpen()), () => {
                this._openPromise = null;
            });
        } else if (this._openPromise) {
            // opening
            return this._openPromise;
        } else {
            // opened
            return Promise.resolve();
        }
    }

    /**
     * Release a reference to the underlying resource.
     *
     * This method decreases the reference count, and releases the resource
     * if there are no other users.
     *
     * @async
     */
    close() {
        // if opening, wait to fully open then close
        if (this._openPromise) {
            return this._openPromise.then(() => {
                return this.close();
            });
        }

        if (this._useCount <= 0) throw new Error('invalid close');
        this._useCount--;
        if (this._useCount === 0) {
            // last close
            if (this._closePromise) throw new Error('bookkeeping error');
            return this._closePromise = pFinally(Promise.resolve(this._doClose()), () => {
                this._closePromise = null;
            });
        } else if (this._closePromise) {
            // closing
            return this._closePromise;
        } else {
            // closed
            return Promise.resolve();
        }
    }
}
module.exports = RefCounted;
