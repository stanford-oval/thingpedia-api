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
        return Http.get(url, options).then((response) => Xml.parseString(response))
        .then((parsed) => {
            const toEmit = [];
            if (parsed.feed) {
                for (let entry of parsed.feed.entry) {
                    let updated = new Date(entry.updated[0]);
                    let title = entry.title[0]._ || entry.title[0];
                    toEmit.push({ title, link: entry.link[0].$.href, updated_time: updated });
                }
            } else {
                for (let entry of parsed.rss.channel[0].item) {
                    let updated = new Date(entry.pubDate[0]);
                    let title = entry.title[0]._ || entry.title[0];
                    let link = entry.link[0]._ || entry.link[0];
                    let description = entry.description[0] ? (entry.description[0]._ || entry.description[0]) : '';
                    toEmit.push({ title, link, updated_time: updated, description });
                }
            }

            toEmit.sort((a, b) => (+b.updated_time) - (+a.updated_time));
            return toEmit;
        });
    }
};
