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


/**
 * The base class of all the operations that a device is allowed
 * to perform to interact with the user during interactive configuration.
 *
 * This class exists mostly for documentation, it's not actually used
 * because JS does not have interfaces or multiple inheritance.
 */
export default abstract class ConfigDelegate {
    constructor() {}

    /* istanbul ignore next */
    /**
     * Report that the device was configured successfully.
     *
     * @deprecated returning successfully from {@link BaseDevice.completeDiscovery} or
     *             {@link BaseDevice.loadInteractively} is enough to report success.
     */
    async configDone() : Promise<void> {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    /**
     * Inform the user that discovery/configuration failed
     * for some reason.
     *
     * @param {Error} error - the error that occurred
     * @deprecated throwing an exception from {@link BaseDevice.completeDiscovery}
     *             {@link BaseDevice.loadInteractively} is enough to report failure.
     */
    configFailed(error : Error) : Promise<void> {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    /**
     * Ask the user a yes/no question.
     *
     * @param {string} question - the question to ask
     * @return {boolean} true if the user says yes, false if the user says no, or an error
     */
    async confirm(question : string) : Promise<boolean> {
        throw new Error('Not Implemented');
    }

    /* istanbul ignore next */
    /**
     * Ask the user for a PIN code/password.
     *
     * @param {string} question - the question to ask
     * @param {boolean} [secret] - true if the question is secret (the answer should be masked)
     * @return {string} the answer from the user
     */
    async requestCode(question : string, secret = false) : Promise<string> {
        throw new Error('Not Implemented');
    }
}
