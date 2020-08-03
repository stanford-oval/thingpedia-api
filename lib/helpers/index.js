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

/**
 * A collection of useful helper libraries bundled with the SDK.
 *
 * It is recommended, although not required, to use the following libraries
 * instead of custom bundled libraries.
 *
 * @namespace
 * @name Helpers
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
