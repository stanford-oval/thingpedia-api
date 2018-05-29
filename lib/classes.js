// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const BaseDevice = require('./base_device');
const BaseChannel = require('./base_channel');

// compatibility meta classes for thingpedia devices that use
// inheritance based on lang.Class

function _parent() {
    if (!this.__caller__)
        throw new TypeError("The method 'parent' cannot be called");

    var caller = this.__caller__;
    var name = caller._name;
    var parent = Object.getPrototypeOf(caller._owner.prototype);
    var previous = parent ? parent[name] : undefined;
    if (!previous)
        throw new TypeError("The method '" + name + "' is not on the superclass");

    return previous.apply(this, arguments);
}

function wrapFunction(name, meth, owner) {
    if (meth._origin) meth = meth._origin;

    function wrapper() {
        var prevCaller = this.__caller__;
        this.__caller__ = wrapper;
        var result = meth.apply(this, arguments);
        this.__caller__ = prevCaller;
        return result;
    }

    wrapper._origin = meth;
    wrapper._name = name;
    wrapper._owner = owner;

    return wrapper;
}

function makePrototype(newClass, proto, params) {
    var propertyObj = {
        'parent': { writable: false,
                    configurable: false,
                    enumerable: false,
                    value: _parent }
    };
    for (var name of Object.getOwnPropertyNames(params)) {
        if (['Name', 'Extends', 'Abstract'].indexOf(name) !== -1)
            continue;

        var descriptor = Object.getOwnPropertyDescriptor(params, name);

        if (typeof descriptor.value === 'function')
            descriptor.value = wrapFunction(name, descriptor.value, newClass);

        // we inherit writable and enumerable from the property
        // descriptor of params (they're both true if created from an
        // object literal)
        descriptor.configurable = false;

        propertyObj[name] = descriptor;
    }

    Object.defineProperties(proto, propertyObj);
}

// a meta class for inheriting from BaseDevice, which avoids exposing
// lang.Class, and also has some utility for adding devices
const DeviceClass = function(params) {
    console.log('Tp.DeviceClass is deprecated, replace it with ES6 classes');

    let ret = class extends (params.Extends || BaseDevice) {
        // use default constructor that chains up
        // the constructor in BaseDevice calls _init() for compatibility
    };

    const useOAuth2 = params.UseOAuth2;
    const useDiscovery = params.UseDiscovery;
    delete params.UseOAuth2;
    delete params.UseDiscovery;

    if (useDiscovery)
        ret.loadFromDiscovery = useDiscovery;
    if (useOAuth2)
        ret.runOAuth2 = useOAuth2;

    makePrototype(ret, ret.prototype, params);
    return ret;
};

// same for BaseChannel, which also hides refcounted
const ChannelClass = function(params) {
    console.log('Tp.ChannelClass is deprecated, replace it with ES6 classes');

    const capabilities = params.RequiredCapabilities || [];
    delete params.RequiredCapabilities;
    let ret = class extends (params.Extends || BaseChannel) {
        // use default constructor that chains up
        // the constructor in BaseChannel calls _init() for compatibility

        static get requiredCapabilities() {
            return capabilities;
        }
    };

    makePrototype(ret, ret.prototype, params);
    return ret;
};

module.exports = {
    DeviceClass: DeviceClass,
    ChannelClass: ChannelClass
};
