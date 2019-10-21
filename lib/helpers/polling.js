// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2017 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
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
