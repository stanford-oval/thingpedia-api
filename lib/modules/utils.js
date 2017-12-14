// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2017 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

module.exports = {
    formatString(url, deviceParams, functionParams) {
        return url.replace(/\$(?:\$|([a-zA-Z0-9_]+(?![a-zA-Z0-9_]))|{([a-zA-Z0-9_]+)})/g, (match, param1, param2) => {
            if (match === '$$')
                return '$';
            const param = param1 || param2;
            let value;
            if (functionParams)
                value = functionParams[param] || deviceParams[param] || '';
            else
                value = deviceParams[param] || '';
            return value;
        });
    },

    makeAuth(ast) {
        if (ast.auth.type === 'none') {
            return () => undefined;
        } else if (ast.auth.type === 'oauth2') {
            return () => undefined;
        } else if (ast.auth.type === 'basic') {
            return (device) => ('Basic ' + (new Buffer(device.username + ':' +
                                              device.password)).toString('base64'));
        } else {
            return () => undefined;
        }
    }
};


