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


import * as util from 'util';
import * as fs from 'fs';

import Preferences from '../prefs';

/**
 * A simple implementation of {@link Preferences} that uses a single file.
 *
 */
export default class FilePreferences extends Preferences {
    private _file : string;
    private _writeTimeout : number;
    private _prefs : { [key : string] : unknown };
    private _dirty : boolean;
    private _writeScheduled : boolean;

    /**
     * Construct a new FilePreferences object.
     *
     * @param {string} file - the file to write to
     * @param {number} [writeTimeout=100] - timeout after which writes will be persisted on disk (in ms)
     */
    constructor(file : string, writeTimeout = 100) {
        super();
        this._file = file;
        this._writeTimeout = writeTimeout;
        this._prefs = {};
        try {
            this._prefs = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch(e) {
            if (e.name === 'SyntaxError')
                console.error('Syntax error loading preference file from disk: ' + e.message);
            else if (e.code !== 'ENOENT')
                throw e;
        }
        if (!this._prefs) {
            this._prefs = {};
            this._scheduleWrite();
        }
        this._dirty = false;
        this._writeScheduled = false;
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
        this._scheduleWrite();
        if (changed)
            this.emit('changed', name);
        return value;
    }

    delete(name : string) : void {
        delete this._prefs[name];
        this.emit('changed', name);
        this._scheduleWrite();
    }

    changed() : void {
        this._scheduleWrite();
        this.emit('changed', null);
    }

    flush() : Promise<void> {
        if (!this._dirty)
            return Promise.resolve();
        return util.promisify(fs.writeFile)(this._file, JSON.stringify(this._prefs, undefined, 2));
    }

    saveCopy(to : string) : Promise<void> {
        return util.promisify(fs.writeFile)(to, JSON.stringify(this._prefs));
    }

    private _scheduleWrite() {
        this._dirty = true;
        if (this._writeScheduled)
            return;

        setTimeout(() => {
            this._writeScheduled = false;
            this.flush();
        }, this._writeTimeout);
    }
}
