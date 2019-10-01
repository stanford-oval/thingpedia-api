// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2017 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const FeedParser = require('feedparser');

const Http = require('./http');

/**
 * RSS entry returned by the helpers.
 *
 * @typedef {Object} module:Helpers.Rss~RSSEntry
 * @property {string} guid - the GUID of the RSS entry
 * @property {string} title - the title of the RSS entry
 * @property {Date} updated_time - the time at which this RSS entry was updated
 * @property {string} link - the link to the underlying article
 * @property {string|null} description - the body of the RSS entry, if present and plain text
 * @property {string|null} author - the author of the RSS entry, if present
 * @property {string|null} picture_url - the image associated with this entry, if one is present
 * @property {string[]} categories - categories associated with this RSS entry
 */

/**
 * RSS helpers.
 *
 * @namespace
 * @alias module:Helpers.Rss
 */
module.exports = {
    /**
     * Retrieve and parse and RSS feed.
     *
     * @param {string} url - the URL of the feed
     * @param {Object} options - options to pass to the HTTP library; see {@link module:Helpers.Http.get} for details
     * @return {Array.<module:Helpers.Rss~RSSEntry>} a list of RSS entries
     * @async
     */
    get(url, options) {
        return Http.getStream(url, options).then((stream) => {
            return new Promise((resolve, reject) => {
                const parser = new FeedParser({ feedurl: url });
                parser.on('error', reject);

                const toEmit = [];
                parser.on('data', (entry) => {
                    toEmit.push({
                        guid: entry.guid,
                        title: entry.title,
                        description: entry.description,
                        link: entry.link,
                        author: entry.author,
                        updated_time: new Date(entry.date),
                        picture_url: entry.image ? (entry.image.url || null) : null,
                        categories: entry.categories
                    });
                });
                parser.on('end', () => resolve(toEmit));
                stream.pipe(parser);
            });
        }).then((toEmit) => {
            toEmit.sort((a, b) => (+b.updated_time) - (+a.updated_time));

            // At some point, we messed up, and mixed "updated" and "updated_time" as
            // parameter names
            // The correct name to use is "updated_time" (parameters as noun - used by
            // com.xkcd), but we cannot change existing
            // devices (com.nytimes, com.washingtonpost, com.wsj) that use "updated"
            // For compatibility, we return both, and hope for the best
            toEmit.forEach((entry) => {
                entry.updated = entry.updated_time;
            });

            return toEmit;
        });
    }
};
