// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
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

import Preferences from '../prefs';

/**
 * An implementation of {@link Preferences} that is entirely backed by
 * memory and not persistent anywhere.
 */
export default class MemoryPreferences extends Preferences {
    private _prefs : Record<string, unknown>;

    constructor() {
        super();
        this._prefs = {};
    }

    keys() : string[] {
        return Object.keys(this._prefs);
    }

    get(name : string) : unknown {
        return this._prefs[name];
    }

    set<T>(name : string, value : T) : T {
        const changed = this._prefs[name] !== value;
        this._prefs[name] = value;
        if (changed)
            this.emit('changed', name);
        return value;
    }

    delete(name : string) : void {
        delete this._prefs[name];
        this.emit('changed', name);
    }

    changed(name : string|null = null) : void {
        this.emit('changed', name);
    }
}
