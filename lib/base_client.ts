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

import Mixins from './mixins.json';

export type DeviceCategory = 'data'|'online'|'physical';

export interface DeviceListRecord {
    name : string;
    description : string;
    primary_kind : string;
    website : string;
    repository : string;
    issue_tracker : string;
    license : string;
    category : DeviceCategory;
    subcategory : string;
}

interface NoneDeviceFactory {
    type : 'none';
    category : DeviceCategory;
    kind : string;
    text : string;
}

interface OAuthDeviceFactory {
    type : 'oauth2';
    category : DeviceCategory;
    kind : string;
    text : string;
}

interface InteractiveDeviceFactory {
    type : 'interactive';
    category : DeviceCategory;
    kind : string;
    text : string;
}

interface DiscoveryDeviceFactory {
    type : 'discovery';
    category : DeviceCategory;
    kind : string;
    text : string;
    discoveryType : string;
}

export interface FormField {
    name : string;
    label : string;
    type : string;
}

interface FormDeviceFactory {
    type : 'form';
    category : DeviceCategory;
    kind : string;
    text : string;
    fields : FormField[];
}

export type DeviceFactory =
    NoneDeviceFactory |
    OAuthDeviceFactory |
    InteractiveDeviceFactory |
    DiscoveryDeviceFactory |
    FormDeviceFactory;

export interface EntityRecord {
    type : string;
    value : string;
    canonical : string;
    name : string;
}

export interface EntityLookupResult {
    meta : {
        name : string;
        is_well_known : boolean|number;
        has_ner_support : boolean|number;
    };
    data : EntityRecord[];
}

export interface EntityTypeRecord {
    type : string;
    name : string;
    is_well_known : boolean|number;
    has_ner_support : boolean|number;
}

export interface LocationInput {
    latitude : number;
    longitude : number;
}

export interface LocationRecord {
    latitude : number;
    longitude : number;
    display : string;
    canonical : string;
    full_name : string;
    rank : number;
    importance : number;
    address : any;
}

export interface DeviceNameRecord {
    kind : string;
    kind_canonical : string;
}

export interface MixinDeclaration {
    kind : string;
    types : string[];
    args : string[];
    required : boolean[];
    is_input : boolean[];
    facets : string[];
}

/**
 * The base class of all clients to access the Thingpedia API.
 *
 * Accessing the Thingpedia API from Almond occurs in a platform-specific manner,
 * through clients that extend this class.
 *
 * @interface
 */
export default abstract class BaseClient {
    /**
     * @protected
     */
    constructor() {
    }

    /**
     * The locale to use when querying Thingpedia, as BCP 47 tag.
     *
     * @type {string}
     */
    get locale() : string {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getModuleLocation(id : string) : Promise<string> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getDeviceCode(id : string) : Promise<string> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getSchemas(kinds : string[], withMetadata ?: boolean) : Promise<string> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getDeviceList(klass ?: string, page ?: number, page_size ?: number) : Promise<DeviceListRecord[]> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getDeviceFactories(klass : string) : Promise<DeviceFactory[]> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getDeviceSetup(kinds : string[]) : Promise<{ [key : string] : DeviceFactory|null }> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getKindByDiscovery(publicData : any) : Promise<string> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getExamplesByKey(key : string) : Promise<string> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getExamplesByKinds(kinds : string[]) : Promise<string> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    clickExample(exampleId : number) : Promise<void> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    lookupEntity(entityType : string, searchTerm : string) : Promise<EntityLookupResult> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    lookupLocation(searchTerm : string, around ?: LocationInput) : Promise<LocationRecord[]> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getAllExamples() : Promise<string> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getAllDeviceNames() : Promise<DeviceNameRecord[]> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    getAllEntityTypes() : Promise<EntityTypeRecord[]> {
        throw new Error('not implemented');
    }

    getMixins() : Promise<{ [key : string] : MixinDeclaration }> {
        const mixins : { [key : string] : MixinDeclaration } = {};
        for (const mixin of Mixins.data)
            mixins[mixin.kind] = mixin;
        return Promise.resolve(mixins);
    }
}
