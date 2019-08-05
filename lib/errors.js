//
// This file is part of ThingEngine
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

class OAuthError extends Error {
}

class ImplementationError extends Error {
    constructor(msg) {
        super(`Implementation Error: ${msg}`);
    }
}

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
