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


import * as xml2js from 'xml2js';
import * as util from 'util';

/**
 * XML parsing helpers.
 *
 * This module exists to expose the bundled  [xml2js](https://www.npmjs.com/package/xml2js)
 * dependency to Thingpedia interfaces, so that they don't need to bundle it themselves.
 *
 * @namespace
 */

/**
 * Parse the given XML document using xml2js.
 *
 * @param {string} xml - the XML to parse
 * @return {Object} the parsed document
 */
export const parseString = util.promisify(xml2js.parseString);
