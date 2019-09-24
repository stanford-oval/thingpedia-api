// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

module.exports = {
    'org.thingpedia.config.oauth2': require('./oauth2'),
    'org.thingpedia.config.basic_auth': require('./basic_auth'),

    // everything else...
    'org.thingpedia.config.*': require('./base'),

    get(classdef) {
        if (classdef.is_abstract)
            return null;

        const config = classdef.config;
        const mixinclass = this[config.module] || this['org.thingpedia.config.*'];
        return new mixinclass(classdef);
    }
};
