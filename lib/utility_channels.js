// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Shloka Desai <shloka@stanford.edu>
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
        }.bind(this), this._nextTick());
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
        }
    },

    _onTick() {
        throw new Error('Must override onTick for a PollingTrigger');
    },

    _doOpen() {
        if (this._timeout)
            throw new Error('Double _doOpen');

        this.startPolling();
        if (!this.precise)
            return this._onTick();
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

const RSSPollingTrigger = new lang.Class({
    Name: 'RSSPollingTrigger',
    Extends: HttpPollingTrigger,

    _init: function(engine, state, device) {
        this.parent(engine, state, device);
        this.device = device;
        this._state = state;
    },

    _onResponse(response) {
        var state = this._state;

        return Helpers.Xml.parseString(response).then((parsed) => {
            var lastRead = state.get('last-read');
            var newest = undefined;

            var toEmit = [];
            if (parsed.feed) {
                for (var entry of parsed.feed.entry) {
                    var updated = +new Date(entry.updated[0]);
                    if (newest === undefined ||
                        newest < updated)
                        newest = updated;
                    if (updated <= lastRead)
                        continue;
                    toEmit.push([entry.title[0], entry.link[0].$.href, entry, updated]);
                }
            } else {
                for (var entry of parsed.rss.channel[0].item) {
                    console.log('RSS item ' + entry.title[0] + ' updated on ' + entry.pubDate[0]);

                    var updated = +new Date(entry.pubDate[0]);
                    if (newest === undefined ||
                        newest < updated)
                        newest = updated;
                    if (updated <= lastRead)
                        continue;
                    toEmit.push([entry.title[0], entry.link[0], entry, updated]);
                }
            }

            toEmit.sort(function(a, b) {
                return a[3] - b[3];
            });

            state.set('last-read', newest);
            for (var entry of toEmit)
                this._emit(entry);
        });
    },

    _doOpen() {
        if (this._timeout)
            throw new Error('Double _doOpen');

        this.startPolling();
        // wait a couple main-loop iterations before
        // checking the rss feed the first time, so that triggers
        // are settled
        setTimeout(function() {
            Q(this._onTick()).done();
        }.bind(this), 500);
    },

    _doClose() {
        this.stopPolling();
        return Q();
    },
});

module.exports = {
    PollingTrigger: PollingTrigger,
    HttpPollingTrigger: HttpPollingTrigger,
    SimpleAction: SimpleAction,
    RSSPollingTrigger: RSSPollingTrigger
};
