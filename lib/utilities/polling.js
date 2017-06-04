// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015-2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Q = require('q');

const BaseChannel = require('../base_channel');

module.exports = class PollingTrigger extends BaseChannel {
    _init(engine, state, device) {
        if (!state || !device || !state.get || !state.set) {
            device = state;
            state = null;
        }
        super._init(engine, device);
        this.precise = false;
        this._timeout = null;

        if (state)
            this._state = state;
    }

    stopPolling() {
        if (this._timeout === null)
            return;
        if (this.precise)
            clearTimeout(this._timeout);
        else
            clearInterval(this._timeout);
        this._timeout = null;
    }

    _nextTick() {
        var lastPoll = this._state.get('last-poll');
        var now = Date.now();
        var nextPoll;
        if (lastPoll === undefined)
            nextPoll = now;
        else
            nextPoll = lastPoll + this.interval;
        return Math.max(1, nextPoll - now);
    }

    _nextTimeout() {
        this._timeout = setTimeout(function() {
            this._state.set('last-poll', Date.now());
            Q(this._onTick()).done();
            this._nextTimeout();
        }.bind(this), this._nextTick());
    }

    startPolling() {
        if (this.precise) {
            this._nextTimeout();
        } else {
            if (this.interval >= 1) {
                this._timeout = setInterval(function() {
                    Q(this._onTick()).done();
                }.bind(this), this.interval);
            }
        }
    }

    _onTick() {
        throw new Error('Must override onTick for a PollingTrigger');
    }

    _doOpen() {
        if (this._timeout)
            throw new Error('Double _doOpen');

        this.startPolling();
        if (!this.precise)
            return this._onTick();
    }

    _doClose() {
        this.stopPolling();
        return Q();
    }
}
