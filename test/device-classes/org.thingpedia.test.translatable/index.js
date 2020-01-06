// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = class TranslatableDevice extends Tp.BaseDevice {
    get_elements() {
        const _ = TranslatableDevice.gettext.gettext;

        return [{
            something: _("stuff"),
            author: _("someone")
        }];
    }
};
