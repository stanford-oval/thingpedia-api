// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
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


import * as stream from 'stream';

import type BaseDevice from '../base_device';

/**
 * Maximum number of items that can be returned by a single polling call.
 *
 * This is used to avoid iterating infinite results if a query is implemented
 * using lazy async iterables.
 */
const MAX_ITEMS = 50;

/**
 * A stream.Readable implementation that emits new values at specific interval.
 *
 */
class PollingStream<EventType extends PollingStream.EventResult> extends stream.Readable {
    private _timeout : NodeJS.Timeout|null;
    readonly state : BaseDevice.TriggerState;
    readonly interval : number;
    private _callback : PollingStream.PollCallback<EventType>;
    private _destroyed : boolean;

    /**
     * Construct a new polling stream.
     *
     * @param state - a state binder object
     * @param interval - polling interval, in milliseconds
     * @param callback - function to call every poll interval
     */
    constructor(state : BaseDevice.TriggerState,
                interval : number,
                callback : PollingStream.PollCallback<EventType>) {
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
    destroy() : void {
        if (this._timeout === null)
            return;
        clearTimeout(this._timeout);
        this._timeout = null;
        this._destroyed = true;
    }

    private _nextTick() {
        const lastPoll = this.state.get('last-poll');
        const now = Date.now();
        let nextPoll;
        if (lastPoll === undefined)
            nextPoll = now;
        else
            nextPoll = lastPoll + this.interval;
        return Math.max(1, nextPoll - now);
    }

    private _nextTimeout() {
        if (this._destroyed)
            return;
        this._timeout = setTimeout(() => {
            const now = Date.now();
            this.state.set('last-poll', now);
            Promise.resolve(this._onTick(now)).catch((e) => this.emit('error', e));
            this._nextTimeout();
        }, this._nextTick());
    }

    private async _onTick(now : number) {
        let maxItems = MAX_ITEMS;
        for await (const item of await this._callback()) {
            item.__timestamp = now;
            this.push(item);
            maxItems--;
            if (maxItems <= 0)
                break;
        }
    }

    _read() : void {
        if (this._timeout === null)
            this._nextTimeout();
    }
}

namespace PollingStream {

/**
 * Callback called when polling.
 *
 * The callback should poll the underlying API and return the current results.
 *
 * @return the current list of results
 */
export type PollCallback<T> = () => Iterable<T>|Promise<Iterable<T>>|AsyncIterable<T>;

export interface EventResult {
    __timestamp ?: number;
    [key : string] : unknown;
}

}

export default PollingStream;
