// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const lang = require('lang');

module.exports = new lang.Class({
    Name: 'BaseCursor',

    _init: function() {
    },

    getNext: function() {
        throw new Error('Not Implemented');
    }
});
