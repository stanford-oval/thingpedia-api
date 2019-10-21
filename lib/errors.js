//
// This file is part of ThingEngine
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

/**
 * An error occurred during OAuth.
 */
class OAuthError extends Error {
}

/**
 * The implementation of a device has a programming error (e.g. a missing function).
 */
class ImplementationError extends Error {
    constructor(msg) {
        super(`Implementation Error: ${msg}`);
    }
}

/**
 * Some functionality or command is not available in this version of Almond.
 */
class UnsupportedError extends Error {
    constructor() {
        super(`This command is not available in this version of Almond`);
        this.code = 'ENOSYS';
    }
}

module.exports = {
    OAuthError,
    ImplementationError,
    UnsupportedError
};
