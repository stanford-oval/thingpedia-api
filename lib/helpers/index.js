// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015-2016 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

/**
 * A collection of useful helper libraries bundled with the SDK.
 *
 * It is recommended, although not required, to use the following libraries
 * instead of custom bundled libraries.
 *
 * @module Helpers
 */

module.exports = {
    Content: require('./content'),
    Http: require('./http'),
    OAuth2: require('./oauth2'),
    PollingStream: require('./polling'),
    Rss: require('./rss'),
    Xml: require('./xml'),
    RefCounted: require('./ref_counted'),
    ObjectSet: require('./object_set'),
    FilePreferences: require('./file_prefs')
};
