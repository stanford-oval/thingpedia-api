// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Shloka Desai <shloka@stanford.edu>
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Helpers = require('../helpers');
const HttpPollingTrigger = require('./http_polling');

module.exports = class RSSPollingTrigger extends HttpPollingTrigger {
    _init(engine, state, device) {
        super._init(engine, state, device);
        this.device = device;
        this._state = state;
    }

    _onResponse(response) {
        const state = this._state;

        return Helpers.Xml.parseString(response).then((parsed) => {
            let lastRead = state.get('last-read');
            let newest = undefined;

            let toEmit = [];
            if (parsed.feed) {
                for (let entry of parsed.feed.entry) {
                    let updated = new Date(entry.updated[0]);
                    if (newest === undefined ||
                        newest < +updated)
                        newest = +updated;
                    if (updated <= lastRead)
                        continue;
                    toEmit.push([entry.title[0], entry.link[0].$.href, entry, updated]);
                }
            } else {
                for (let entry of parsed.rss.channel[0].item) {
                    //console.log('RSS item ' + entry.title[0] + ' updated on ' + entry.pubDate[0]);

                    let updated = new Date(entry.pubDate[0]);
                    if (newest === undefined ||
                        newest < +updated)
                        newest = +updated;
                    if (updated <= lastRead)
                        continue;
                    toEmit.push([entry.title[0], entry.link[0], entry, updated]);
                }
            }

            toEmit.sort((a, b) => {
                return (+a[3]) - (+b[3]);
            });

            state.set('last-read', newest);
            for (let entry of toEmit)
                this._emit(entry);
        });
    }

    _doOpen() {
        if (this._timeout)
            throw new Error('Double _doOpen');

        this.startPolling();
        // wait a couple main-loop iterations before
        // checking the rss feed the first time, so that triggers
        // are settled
        setTimeout(() => {
            Promise.resolve(this._onTick());
        }, 500);
    }

    _doClose() {
        this.stopPolling();
        return Promise.resolve();
    }
};
