// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const events = require('events');
const Q = require('q');

const RefCounted = require('./ref_counted');

class MessagingFeed extends RefCounted {
    // events: new-message, incoming-message, outgoing-message, members-changed

    constructor(feedId) {
        super();

        this.feedId = feedId;
    }

    // returns the number of members in the feed
    get length() {
        throw new Error('Not Implemented');
    }

    _doOpen() {
        throw new Error('Not Implemented');
    }

    _doClose() {
        throw new Error('Not Implemented');
    }

    // returns an array of MessagingUser
    getMembers() {
        throw new Error('Not Implemented');
    }

    sendText() {
        throw new Error('Not Implemented');
    }

    sendItem() {
        throw new Error('Not Implemented');
    }

    sendRaw() {
        throw new Error('Not Implemented');
    }
}

module.exports = class Messaging extends events.EventEmitter {
    get isAvailable() {
        return false;
    }

    startSync() {
        throw new Error('Not Implemented');
    }

    stopSync() {
        throw new Error('Not Implemented');
    }

    getOwnId() {
        throw new Error('Not Implemented');
    }

    getUserById() {
        throw new Error('Not Implemented');
    }

    getAccountById() {
        throw new Error('Not Implemented');
    }

    getFeedList() {
        throw new Error('Not Implemented');
    }

    getFeedMetas() {
        throw new Error('Not Implemented');
    }

    getFeed(feedId) {
        throw new Error('Not Implemented');
    }

    createFeed() {
        throw new Error('Not Implemented');
    }

    getFeedWithContact(contactId) {
        throw new Error('Not Implemented');
    }
}
module.exports.prototype.$rpcMethods = ['get isAvailable', 'getOwnId', 'getUserById',
                                        'getAccountById', 'getFeedMetas'];
module.exports.Feed = MessagingFeed;
