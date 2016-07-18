// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015-2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Q = require('q');
const xml2js = require('xml2js');

module.exports = {
    parseString: function(string) {
        return Q.nfcall(xml2js.parseString, string);
    }
};
