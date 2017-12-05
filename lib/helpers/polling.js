// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2017 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const stream = require('stream');

module.exports = class PollingStream extends stream.Readable {
    constructor(state, interval, callback) {
        super({ objectMode: true });

        this._timeout = null;
        this.state = state;
        this.interval = interval;
        this._callback = callback;
    }

    destroy() {
        if (this._timeout === null)
            return;
        clearTimeout(this._timeout);
        this._timeout = null;
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
        this._timeout = setTimeout(() => {
            this.state.set('last-poll', Date.now());
            Promise.resolve(this._onTick()).catch((e) => this.emit('error', e));
            this._nextTimeout();
        }, this._nextTick());
    }

    _onTick() {
        return Promise.resolve().then(() => this._callback()).then((results) => {
            for (let item of results)
                this.push(item);
        });
    }

    _read() {
        if (this._timeout === null)
            this._nextTimeout();
    }
};

