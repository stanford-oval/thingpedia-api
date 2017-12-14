// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2017 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Http = require('./http');
const Xml = require('./xml');

module.exports = {
    get(url, options) {
        return Http.get(url).then((response) => Xml.parseString(response))
        .then((parsed) => {
            const toEmit = [];
            if (parsed.feed) {
                for (let entry of parsed.feed.entry) {
                    let updated = new Date(entry.updated[0]);
                    toEmit.push([entry.title[0], entry.link[0].$.href, updated]);
                }
            } else {
                for (let entry of parsed.rss.channel[0].item) {
                    let updated = new Date(entry.pubDate[0]);
                    toEmit.push([entry.title[0], entry.link[0], updated, entry.description[0]]);
                }
            }

            toEmit.sort((a, b) => (+b[2]) - (+a[2]));
            return toEmit;
        });
    }
};
