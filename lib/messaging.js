// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2016-2019 The Board of Trustees of the Leland Stanford Junior University
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
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
