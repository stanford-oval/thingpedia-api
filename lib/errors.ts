// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
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
 * An error occurred during OAuth.
 */
class OAuthError extends Error {
}

/**
 * The implementation of a device has a programming error (e.g. a missing function).
 */
class ImplementationError extends Error {
    constructor(msg : string) {
        super(`Implementation Error: ${msg}`);
    }
}

/**
 * Some functionality or command is not available in this version of Almond.
 */
class UnsupportedError extends Error {
    code : string;

    constructor() {
        super(`This command is not available in this version of Almond`);
        this.code = 'ENOSYS';
    }
}

export {
    OAuthError,
    ImplementationError,
    UnsupportedError
};
