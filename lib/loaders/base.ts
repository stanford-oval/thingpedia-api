// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
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

import * as ThingTalk from 'thingtalk';

import BaseDevice from '../base_device';

/**
 * Base class for all Thingpedia loaders.
 *
 * Thingpedia loaders are responsible for constructing device classes given
 * the manifest and other information.
 */
export default abstract class BaseLoader {
    protected _id : string;
    protected _manifest : ThingTalk.Ast.ClassDef;
    protected _parents : Record<string, ThingTalk.Ast.ClassDef>;

    constructor(kind : string, manifest : ThingTalk.Ast.ClassDef, parents : Record<string, ThingTalk.Ast.ClassDef>) {
        this._id = kind;
        this._manifest = manifest;
        this._parents = parents;
    }

    /**
     * The ID of the device class.
     *
     * This is the same as the Thingpedia device kind.
     */
    get id() : string {
        return this._id;
    }

    /**
     * The version of the device class.
     */
    get version() {
        return this._manifest.getImplementationAnnotation<number>('version')!;
    }

    /**
     * The manifest associated with this device class.
     */
    get manifest() : ThingTalk.Ast.ClassDef {
        return this._manifest;
    }

    /**
     * Clear any node.js caches associated with this device class.
     */
    abstract clearCache() : void;

    /**
     * Retrieve the fully initialized device class.
     */
    abstract getDeviceClass() : Promise<BaseDevice.DeviceClass<BaseDevice>>;

    protected *_iterateFunctions(classDef : ThingTalk.Ast.ClassDef,
                                 ftype : 'actions' | 'queries',
                                 visited : Set<string> = new Set) : IterableIterator<readonly [string, ThingTalk.Ast.FunctionDef]> {
        for (const fname in classDef[ftype]) {
            if (visited.has(fname))
                continue;
            visited.add(fname);
            yield [fname, classDef[ftype][fname]] as const;
        }

        for (const parent of classDef.extends) {
            const parentClass = this._parents[parent];
            if (!parentClass) {
                console.error(`WARNING: parent class ${parent} of ${classDef.kind} was not loaded correctly`);
                continue;
            }
            yield* this._iterateFunctions(parentClass, ftype, visited);
        }
    }
}
