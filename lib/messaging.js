// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const events = require('events');

const RefCounted = require('./ref_counted');

class MessagingFeed extends RefCounted {
    // events: new-message, incoming-message, outgoing-message, members-changed

    constructor(feedId) {
        super();

        this.feedId = feedId;
    }

    _doOpen() {
        throw new Error('Not Implemented');
    }

    _doClose() {
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

    get account() {
        throw new Error('Not Implemented');
    }

    getIdentities() {
        throw new Error('Not Implemented');
    }

    getFeedList() {
        throw new Error('Not Implemented');
    }

    getFeed(feedId) {
        throw new Error('Not Implemented');
    }

    getFeedWithContact(contactId) {
        throw new Error('Not Implemented');
    }

    searchAccountByName(name) {
        throw new Error('Not Implemented');
    }

    getAccountForIdentity(identity) {
        throw new Error('Not Implemented');
    }
};
module.exports.Feed = MessagingFeed;
