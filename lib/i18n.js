// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const fs = require('fs');
const util = require('util');
const gettextParser = require('gettext-parser');

async function loadTextdomainDirectory(gt, locale, domain, modir) {
    let split = locale.split(/[-_.@]/);
    let mo = modir + '/' + split.join('_') + '.mo';

    while (!await util.promisify(fs.exists)(mo) && split.length) {
        split.pop();
        mo = modir + '/' + split.join('_') + '.mo';
    }
    if (split.length === 0) {
        console.error(`No translations found in ${domain} for locale ${locale}`);
        return;
    }
    try {
        let loaded = gettextParser.mo.parse(await util.promisify(fs.readFile)(mo), 'utf-8');
        gt.addTranslations(locale, domain, loaded);
    } catch(e) {
        console.log(`Failed to load translations for ${locale}/${domain}: ${e.message}`);
    }
}

module.exports = {
    loadTextdomainDirectory
};
