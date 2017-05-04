// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015-2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const vm = require('vm');

function compileCode(code) {
    return vm.runInNewContext(code);
}

module.exports.format = function format(formatted, event, hint, formatter) {
    if (!Array.isArray(formatted))
        formatted = [formatted];

    event = event.map((e) => {
        if (!e)
            return e;
        if (e instanceof Date)
            return formatter.dateToString(e);
        if (e.x && e.y)
            return formatter.locationToString(e);
    });
    return formatted.map((f, i) => {
        if (typeof f === 'function')
            return f(event, hint, formatter);
        if (typeof f === 'string')
            return f.format(...event);
        if (typeof f !== 'object')
            return String(f);
        if (f.type === 'picture') {
            return {
                type: 'picture',
                url: f.url.format(...event)
            }
        }
        if (f.type === 'rdl') {
            return {
                type: 'rdl',
                callback: f.callback ? f.callback.format(...event) : undefined,
                webCallback: f.webCallback ? f.webCallback.format(...event) : undefined,
                displayTitle: f.displayTitle ? f.displayTitle.format(...event) : undefined,
                displayText: f.displayText ? f.displayText.format(...event) : undefined
            };
        }
        if (f.type === 'code') {
            var compiled = compileCode(f.code);
            formatted[i] = compiled;
            return compiled(event, hint, formatter);
        }
        throw new Error('Unrecognized formatter type ' + f.type);
    });
}
