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

async function pFinally<T>(promise : Promise<T>, finallyClause : () => void) : Promise<T> {
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
 */
export default class RefCounted extends events.EventEmitter {
    private _useCount : number;
    private _openPromise : Promise<void>|null;
    private _closePromise : Promise<void>|null;

    /**
     * Construct a new reference counted object.
     *
     * The object has initial reference count of 0. You must call {@link Helpers.RefCounted.open} before use.
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
     */
    protected async _doOpen() : Promise<void> {
    }

    /**
     * Release the underlying resource.
     *
     * This method is called when the reference count goes from 1 to 0.
     */
    protected async _doClose() : Promise<void> {
    }

    /**
     * Obtain a reference to the underlying resource.
     *
     * This method ensures that the resource is initialized, and increases
     * the reference count.
     *
     */
    open() : Promise<void> {
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
     */
    close() : Promise<void> {
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
