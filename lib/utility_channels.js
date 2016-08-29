// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Q = require('q');
const http = require('http');
const https = require('https');
const Url = require('url');

const lang = require('./lang');
const BaseChannel = require('./base_channel');
const Helpers = require('./helpers');

const PollingTrigger = new lang.Class({
    Name: 'PollingTrigger',
    Extends: BaseChannel,

    _init: function(engine, state, device) {
        if (!state || !device || !state.get || !state.set) {
            device = state;
            state = null;
        }
        this.parent(engine, device);
        this.precise = false;
        this._timeout = null;

        if (state)
            this._state = state;
    },

    stopPolling() {
        if (this._timeout === null)
            return;
        if (this.precise)
            clearTimeout(this._timeout);
        else
            clearInterval(this._timeout);
        this._timeout = null;
    },

    _nextTick() {
        var lastPoll = this._state.get('last-poll');
        var now = Date.now();
        var nextPoll;
        if (lastPoll === undefined)
            nextPoll = now;
        else
            nextPoll = lastPoll + this.interval;
        return Math.max(1, nextPoll - now);
    },

    _nextTimeout() {
        this._timeout = setTimeout(function() {
            this._state.set('last-poll', Date.now());
            Q(this._onTick()).done();
            this._nextTimeout();
        }.bind(this), this._nextTick())
    },

    startPolling() {
        if (this.precise) {
            this._nextTimeout();
        } else {
            if (this.interval >= 1) {
                this._timeout = setInterval(function() {
                    Q(this._onTick()).done();
                }.bind(this), this.interval);
            }
            return this._onTick();
        }
    },

    _onTick() {
        throw new Error('Must override onTick for a PollingTrigger');
    },

    _doOpen() {
        if (this._timeout)
            throw new Error('Double _doOpen');

        return this.startPolling();
    },

    _doClose() {
        this.stopPolling();
        return Q();
    },
});

const HttpPollingTrigger = new lang.Class({
    Name: 'HttpPollingTrigger',
    Extends: PollingTrigger,

    // must set (or have accessors for)
    // this.url, this.userAgent, this.auth or this.useOAuth2

    _onResponse: function() {
        throw new Error('Must override onResponse for a HttpPollingTrigger');
    },

    _onTick: function() {
        return Helpers.Http.get(this.url, { auth: this.auth, useOAuth2: this.useOAuth2, 'user-agent': this.userAgent }).then(function(response) {
            return this._onResponse(response);
        }.bind(this)).catch(function(error) {
            console.error('Error reading from upstream server: ' + error.message);
            console.error(error.stack);
        });
    },
});

const SimpleAction = new lang.Class({
    Name: 'SimpleAction',
    Extends: BaseChannel,

    _doInvoke: function() {
        throw new Error('Must override doInvoke for a SimpleAction');
    },

    sendEvent: function(args) {
        return this._doInvoke.apply(this, args);
    },
});

module.exports = {
    PollingTrigger: PollingTrigger,
    HttpPollingTrigger: HttpPollingTrigger,
    SimpleAction: SimpleAction,
};
