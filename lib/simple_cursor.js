// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Q = require('q');
const lang = require('lang');
const BaseCursor = require('./cursor');

module.exports = new lang.Class({
    Name: 'SimpleCursor',

    _init: function(array) {
        this._pos = 0;
        this._array = array;
    },

    getNext: function() {
        if (this._pos >= this._array.length)
            return Q(null);
        var cur = this._array[this._pos];
        this._pos ++;
        return Q(cur);
    }
});
