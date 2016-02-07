// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Q = require('q');
const lang = require('lang');
const http = require('http');
const https = require('https');
const Url = require('url');

const BaseChannel = require('./base_channel');
const Helpers = require('./helpers');

const PollingTrigger = new lang.Class({
    Name: 'PollingTrigger',
    Extends: BaseChannel,

    _init: function() {
        this.parent();
        this._timeout = null;
    },

    stopPolling: function() {
        if (this._timeout === null)
            return;
        clearInterval(this._timeout);
        this._timeout = null;
    },

    _onTick: function() {
        throw new Error('Must override onTick for a PollingTrigger');
    },

    _doOpen: function() {
        if (this._timeout)
            throw new Error('Double _doOpen');
        if (this.interval >= 1) {
            this._timeout = setInterval(function() {
                Q(this._onTick()).done();
            }.bind(this), this.interval);
        }
        return this._onTick();
    },

    _doClose: function() {
        this.stopPolling();
        return Q();
    },
});

const HttpPollingTrigger = new lang.Class({
    Name: 'HttpPollingTrigger',
    Extends: PollingTrigger,

    _init: function() {
        this.parent();
        this.url = null;
        this.auth = null;
    },

    _onResponse: function() {
        throw new Error('Must override onResponse for a HttpPollingTrigger');
    },

    _onTick: function() {
        return Helpers.Http.get(this.url, { auth: this.auth }).then(function(response) {
            return this._onResponse(response);
        }.bind(this)).catch(function(error) {
            console.log('Error reading from upstream server: ' + error.message);
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
