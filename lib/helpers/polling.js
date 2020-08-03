// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2017-2019 The Board of Trustees of the Leland Stanford Junior University
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
"use strict";

const stream = require('stream');

/**
 * Callback called when polling.
 *
 * The callback should poll the underlying API and return the current results.
 *
 * @callback Helpers~PollCallback
 * @return {Object[]} the current list of results
 */

/**
 * A stream.Readable implementation that emits new values at specific interval.
 *
 * @extends stream.Readable
 * @alias Helpers.PollingStream
 */
class PollingStream extends stream.Readable {
    /**
     * Construct a new polling stream.
     *
     * @param {TriggerStateBinder} state - a state binder object
     * @param {number} interval - polling interval, in milliseconds
     * @param {Helpers~PollCallback} callback - function to call every poll interval
     */
    constructor(state, interval, callback) {
        super({ objectMode: true });

        this._timeout = null;
        this.state = state;
        this.interval = interval;
        this._callback = callback;
        this._destroyed = false;
    }

    /**
     * Destroy the current stream (stop polling).
     */
    destroy() {
        if (this._timeout === null)
            return;
        clearTimeout(this._timeout);
        this._timeout = null;
        this._destroyed = true;
    }

    _nextTick() {
        var lastPoll = this.state.get('last-poll');
        var now = Date.now();
        var nextPoll;
        if (lastPoll === undefined)
            nextPoll = now;
        else
            nextPoll = lastPoll + this.interval;
        return Math.max(1, nextPoll - now);
    }

    _nextTimeout() {
        if (this._destroyed)
            return;
        this._timeout = setTimeout(() => {
            let now = Date.now();
            this.state.set('last-poll', now);
            Promise.resolve(this._onTick(now)).catch((e) => this.emit('error', e));
            this._nextTimeout();
        }, this._nextTick());
    }

    _onTick(now) {
        return Promise.resolve().then(() => this._callback()).then((results) => {
            for (let item of results) {
                item.__timestamp = now;
                this.push(item);
            }
        });
    }

    _read() {
        if (this._timeout === null)
            this._nextTimeout();
    }
}
module.exports = PollingStream;
