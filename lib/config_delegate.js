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

/**
 * The base class of all the operations that a device is allowed
 * to perform to interact with the user during interactive configuration.
 *
 * This class exists mostly for documentation, it's not actually used
 * because JS does not have interfaces or multiple inheritance.
 *
 * @interface
 */
class ConfigDelegate {
    /**
     * @protected
     */
    constructor() {}

    /* istanbul ignore next */
    /**
     * Report that the device was configured successfully.
     *
     * @deprecated returning successfully from {@link BaseDevice#completeDiscovery} or
     *             {@link BaseDevice.loadInteractively} is enough to report success.
     */
    async configDone() {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    /**
     * Inform the user that discovery/configuration failed
     * for some reason.
     *
     * @param {Error} error - the error that occurred
     * @deprecated throwing an exception from {@link BaseDevice#completeDiscovery}
     *             {@link BaseDevice.loadInteractively} is enough to report failure.
     */
    configFailed(error) {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    /**
     * Ask the user a yes/no question.
     *
     * @param {string} question - the question to ask
     * @result {boolean} true if the user says yes, false if the user says no, or an error
     */
    async confirm(question) {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    /**
     * Ask the user for a PIN code/password.
     *
     * @param {string} question - the question to ask
     * @param {boolean} [secret] - true if the question is secret (the answer should be masked)
     * @result {string} the answer from the user
     */
    async requestCode(question, secret = false) {
        throw new Error('Not Implemented');
    }
}
module.exports = ConfigDelegate; 
