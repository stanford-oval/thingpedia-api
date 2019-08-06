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

const RefCounted = require('./helpers/ref_counted');

class MessagingFeed extends RefCounted {
    // events: new-message, incoming-message, outgoing-message, members-changed

    constructor(feedId) {
        super();

        this.feedId = feedId;
    }

    /* istanbul ignore next */
    _doOpen() {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    _doClose() {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    sendText() {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    sendItem() {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    sendRaw() {
        throw new Error('Not Implemented');
    }
}

module.exports = class Messaging extends events.EventEmitter {
    get isAvailable() {
        return false;
    }

    /* istanbul ignore next */
    get account() {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    getIdentities() {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    getFeedList() {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    getFeed(feedId) {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    getFeedWithContact(contactId) {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    searchAccountByName(name) {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    getAccountForIdentity(identity) {
        throw new Error('Not Implemented');
    }
};
module.exports.Feed = MessagingFeed;
