// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2018-2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//         Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

function getParams(classDef) {
    let params = {};
    const config = classDef.config;
    switch (config.module) {
    case 'org.thingpedia.config.form':
    case 'org.thingpedia.config.basic_auth':
        if (config.in_params.length === 1) {
            let argMap = config.in_params[0].value;
            Object.entries(argMap.value).forEach(([name, type]) => {
                // the value does not matter, only the fact that the parameter is present matters
                params[name] = null;
            });
        }
    }
    return params;
}

function getAuth(classDef) {
    let auth = {};
    let extraTypes = [];

    const config = classDef.config;
    config.in_params.forEach((param) => {
        if (param.value.isArgMap)
            return;
        switch (param.name) {
        case 'device_class':
            extraTypes.push('bluetooth-class-' + param.value.toJS());
            break;
        case 'uuids':
            for (let uuid of param.value.toJS())
                extraTypes.push('bluetooth-uuid-' + uuid.toLowerCase());
            break;
        case 'search_target':
            for (let st of param.value.toJS())
                extraTypes.push('upnp-' + st.toLowerCase().replace(/^urn:/, '').replace(/:/g, '-'));
            break;

        default:
            auth[param.name] = param.value.toJS();
        }
    });
    switch (config.module) {
    case 'org.thingpedia.config.oauth2':
        auth.type = 'oauth2';
        break;
    case 'org.thingpedia.config.custom_oauth':
        auth.type = 'custom_oauth';
        break;
    case 'org.thingpedia.config.basic_auth':
        auth.type = 'basic';
        break;
    case 'org.thingpedia.config.discovery.bluetooth':
        auth.type = 'discovery';
        auth.discoveryType = 'bluetooth';
        break;
    case 'org.thingpedia.config.discovery.upnp':
        auth.type = 'discovery';
        auth.discoveryType = 'upnp';
        break;
    case 'org.thingpedia.config.interactive':
        auth.type = 'interactive';
        break;
    case 'org.thingpedia.config.builtin':
        auth.type = 'builtin';
        break;
    default:
        auth.type = 'none';
    }
    return [auth, extraTypes];
}

function getCategory(classDef) {
    if (classDef.annotations.system && classDef.annotations.system.toJS())
        return 'system';
    const config = classDef.config;
    if (!config)
        return 'data';

    switch (config.module) {
    case 'org.thingpedia.config.builtin':
    case 'org.thingpedia.config.none':
        return 'data';
    case 'org.thingpedia.config.discovery.bluetooth':
    case 'org.thingpedia.config.discovery.upnp':
        return 'physical';
    default:
        return 'online';
    }
}

function makeBaseDeviceMetadata(classDef) {
    const [auth, extraTypes] = getAuth(classDef);
    return {
        kind: classDef.kind,
        name: classDef.metadata.name,
        description: classDef.metadata.description,
        types: (classDef.extends || []).concat(extraTypes),
        category: getCategory(classDef),
        auth: auth,
        params: getParams(classDef)
    };
}

module.exports = {
    makeBaseDeviceMetadata
};
