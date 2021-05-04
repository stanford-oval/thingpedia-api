// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
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

import assert from 'assert';
import { Ast, Type } from 'thingtalk';
import BaseClient from './base_client';
import { getCategory } from './compat';

function clean(name : string) : string {
    if (/^[vwgp]_/.test(name))
        name = name.substr(2);
    return name.replace(/_/g, ' ').replace(/([^A-Z ])([A-Z])/g, '$1 $2').toLowerCase();
}

function entityTypeToHTMLType(type : string) : string {
    switch (type) {
    case 'tt:password':
        return 'password';
    case 'tt:url':
        return 'url';
    case 'tt:phone_number':
        return 'tel';
    case 'tt:email_address':
        return 'email';
    default:
        return 'text';
    }
}

function getInputParam(config : Ast.MixinImportStmt, name : string) : unknown {
    for (const inParam of config.in_params) {
        if (inParam.name === name)
            return inParam.value.toJS();
    }
    return undefined;
}

type TypeMap = { [key : string] : Type };

function makeDeviceFactory(classDef : Ast.ClassDef) : BaseClient.DeviceFactory|null {
    if (classDef.is_abstract)
        return null;

    const name = classDef.metadata.thingpedia_name || classDef.metadata.name || '';
    const category = getCategory(classDef);

    const config = classDef.config;
    assert(config);

    function toFields(argMap : TypeMap) : BaseClient.FormField[] {
        if (!argMap)
            return [];
        return Object.keys(argMap).map((k : string) : BaseClient.FormField => {
            const type = argMap[k];
            let htmlType;
            if (type instanceof Type.Entity)
                htmlType = entityTypeToHTMLType(type.type);
            else if (type.isNumber || type.isMeasure)
                htmlType = 'number';
            else if (type.isBoolean)
                htmlType = 'checkbox';
            else
                htmlType = 'text';
            return { name: k, label: clean(k), type: htmlType };
        });
    }

    switch (config.module) {
    case 'org.thingpedia.config.builtin':
        return null;

    case 'org.thingpedia.config.discovery.bluetooth':
        return {
            type: 'discovery',
            category: category,
            kind: classDef.kind,
            text: name,
            discoveryType: 'bluetooth'
        };
    case 'org.thingpedia.config.discovery.upnp':
        return {
            type: 'discovery',
            category: category,
            kind: classDef.kind,
            text: name,
            discoveryType: 'upnp'
        };

    case 'org.thingpedia.config.interactive':
        return {
            type: 'interactive',
            category: category,
            kind: classDef.kind,
            text: name
        };

    case 'org.thingpedia.config.none':
        return {
            type: 'none',
            category: category,
            kind: classDef.kind,
            text: name
        };

    case 'org.thingpedia.config.oauth2':
    case 'org.thingpedia.config.custom_oauth':
        return {
            type: 'oauth2',
            category: category,
            kind: classDef.kind,
            text: name
        };

    case 'org.thingpedia.config.form':
        return {
            type: 'form',
            category: category,
            kind: classDef.kind,
            text: name,
            fields: toFields(getInputParam(config, 'params') as TypeMap)
        };

    case 'org.thingpedia.config.basic_auth':
        return {
            type: 'form',
            category: category,
            kind: classDef.kind,
            text: name,
            fields: [
                { name: 'username', label: 'Username', type: 'text' },
                { name: 'password', label: 'Password', type: 'password' }
            ].concat(toFields(getInputParam(config, 'extra_params') as TypeMap))
        };

    default:
        throw new Error(`Unrecognized config mixin ${config.module}`);
    }
}

export interface DiscoveryService {
    discovery_type : 'bluetooth'|'upnp';
    service : string;
}

function getDiscoveryServices(classDef : Ast.ClassDef) : DiscoveryService[] {
    if (classDef.is_abstract)
        return [];

    const config = classDef.config;
    assert(config);
    switch (config.module) {
    case 'org.thingpedia.config.discovery.bluetooth': {
        const uuids = getInputParam(config, 'uuids') as string[];
        const deviceClass = getInputParam(config, 'device_class') as string;

        const services : DiscoveryService[] = uuids.map((u : string) => {
            return {
                discovery_type: 'bluetooth',
                service: 'uuid-' + u.toLowerCase()
            };
        });
        if (deviceClass) {
            services.push({
                discovery_type: 'bluetooth',
                service: 'class-' + deviceClass
            });
        }
        return services;
    }
    case 'org.thingpedia.config.discovery.upnp':
        return (getInputParam(config, 'search_target') as string[]).map((st) => {
            return {
                discovery_type: 'upnp',
                service: st.toLowerCase().replace(/^urn:/, '').replace(/:/g, '-')
            };
        });
    default:
        return [];
    }
}

export {
    makeDeviceFactory,
    getDiscoveryServices
};
