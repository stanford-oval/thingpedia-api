// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const events = require('events');
const Q = require('q');

const lang = require('./lang');
const RefCounted = require('./ref_counted');
const FormatHelpers = require('./helpers/format');

module.exports = new lang.Class({
    Name: 'BaseChannel',
    Extends: RefCounted,

    _init(engine, device) {
        if (!(this instanceof RefCounted))
            throw new Error('wat');
        RefCounted.call(this);

        this.engine = engine;
        this.device = device;

        this._event = null;

        // you must set this to something other than undefined if you're
        // doing something server-side with the params, and it must
        // be a unique string for all channels of the given type
        this.filterString = undefined;

        // don't set this, it is set automatically by ChannelFactory
        this.uniqueId = undefined;
        this.name = undefined;
        this.channelType = undefined;
    },

    get event() {
        return this._event;
    },

    // format an event for human display
    //
    // for triggers, the event will always be the one produced by this channel,
    // and filters will be null
    // for queries, the event will be the return value of invokeQuery, and
    // filters will be the value that was passed to invokeQuery
    // (this way, the code can retrieve what value was interesting and what value
    // was known by comparing event and filters)
    //
    // return value can be a simple string, an RDL in Omlet format, an object
    // with { type: 'picture', url: 'a URL' } or an array of values, each being
    // a message
    //
    // the default implementation uses the metadata in thingpedia
    formatEvent(event, filters, hint, formatter) {
        var where;
        switch (this.channelType) {
        case 'trigger':
            where = 'triggers';
            formatter = hint;
            hint = filters;
            break;
        case 'query':
            where = 'queries';
            break;
        default:
            throw new TypeError();
        }

        return this.engine.schemas.getMeta(this.device.globalName, where, this.name)
            .then((meta) => {
                return meta.formatted || [];
            }).then((format) => {
                return FormatHelpers.format(format, event, hint, formatter);
            });
    },

    // report a change in current event value
    emitEvent(object) {
        this._event = object;
        this.emit('data', object);
    },

    // public API
    sendEvent(object) {
        throw new Error('sendEvent is not implemented by this channel');
    },

    invokeQuery(filters) {
        throw new Error('invokeQuery is not implemented by this channel');
    },
});
