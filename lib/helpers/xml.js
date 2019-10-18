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

const xml2js = require('xml2js');
const util = require('util');

/**
 * XML parsing helpers.
 *
 * This module exists to expose the bundled  [xml2js](https://www.npmjs.com/package/xml2js)
 * dependency to Thingpedia interfaces, so that they don't need to bundle it themselves.
 *
 * @namespace
 * @alias Helpers.Xml
 */
module.exports = {
    /**
     * Parse the given XML document using xml2js.
     *
     * @param {string} xml - the XML to parse
     * @return {Object} the parsed document
     * @async
     */
    parseString: util.promisify(xml2js.parseString)
};
