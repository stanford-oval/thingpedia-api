// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2017 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Http = require('./http');
const Xml = require('./xml');

function findPicture(pictureList) {
    if (!pictureList)
        return undefined;
    return pictureList[pictureList.length-1].$.url;
}

module.exports = {
    get(url, options) {
        return Http.get(url, options).then((response) => Xml.parseString(response))
        .then((parsed) => {
            const toEmit = [];
            if (parsed.feed) {
                for (let entry of parsed.feed.entry) {
                    let updated_time = new Date(entry.updated[0]);
                    let title = entry.title[0]._ || entry.title[0];
                    let link = entry.link[0].$.href;
                    toEmit.push({ title, link, updated_time });
                }
            } else {
                for (let entry of parsed.rss.channel[0].item) {
                    let updated_time = new Date(entry.pubDate[0]);
                    let title = entry.title[0]._ || entry.title[0];
                    let link = entry.link ? (entry.link[0]._ || entry.link[0]) : null;
                    let description = entry.description[0] ? (entry.description[0]._ || entry.description[0]) : '';
                    let picture_url = undefined;
                    if (entry['media:group'])
                        picture_url = findPicture(entry['media:group'][0]['media:content']);

                    toEmit.push({ title, link, updated_time, description, picture_url });
                }
            }

            toEmit.sort((a, b) => (+b.updated_time) - (+a.updated_time));
            return toEmit;
        });
    }
};
