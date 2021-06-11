// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
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


import * as events from 'events';

import RefCounted from './helpers/ref_counted';

abstract class Messaging extends events.EventEmitter {
    constructor() {
        super();
    }

    get isAvailable() {
        return false;
    }

    /* istanbul ignore next */
    get account() {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    getIdentities() : string[] {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    getFeedList() : Promise<Messaging.Feed[]> {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    getFeed(feedId : string) : Promise<Messaging.Feed> {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    getFeedWithContact(contactId : string) : Promise<Messaging.Feed> {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    searchAccountByName(name : string) : Promise<any> {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    getAccountForIdentity(identity : string) : Promise<string> {
        throw new Error('Not Implemented');
    }
}
namespace Messaging {
    export class Feed extends RefCounted {
        // events: new-message, incoming-message, outgoing-message, members-changed
        readonly feedId : string;

        constructor(feedId : string) {
            super();

            this.feedId = feedId;
        }

        /* istanbul ignore next */
        async _doOpen() {
            throw new Error('Not Implemented');
        }

        /* istanbul ignore next */
        async _doClose() {
            throw new Error('Not Implemented');
        }

        /* istanbul ignore next */
        async sendText() {
            throw new Error('Not Implemented');
        }

        /* istanbul ignore next */
        async sendItem() {
            throw new Error('Not Implemented');
        }

        /* istanbul ignore next */
        async sendRaw() {
            throw new Error('Not Implemented');
        }
    }
}
export default Messaging;
