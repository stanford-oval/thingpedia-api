// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const events = require('events');
const Q = require('q');
const ip = require('ip');

// the base class of all the operations that a device is allowed
// to perform to interact with the user during interactive configuration

// this class exists mostly for documentation, it's not actually used
// because JS does not have interfaces or multiple inheritance

module.exports = class ConfigDelegate {
    // report that the device was configured successfully
    configDone(device) {
        throw new Error('Not Implemented');
    }

    // inform the user that discovery/configuration failed
    // for some reason
    configFailed(error) {
        throw new Error('Not Implemented');
    }

    // ask the user to click an oauth link
    // returns undefined
    askOAuth() {
        throw new Error('Not Implemented');
    }

    // ask the user a yes/no question
    // returns a promise with boolean value
    confirm(question) {
        throw new Error('Not Implemented');
    }

    // ask the user for a PIN code/password
    // returns a promise of a string
    requestCode(question) {
        throw new Error('Not Implemented');
    }
}
