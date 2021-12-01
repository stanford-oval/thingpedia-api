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

import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import { promises as pfs } from 'fs';
import byline from 'byline';
import csvparse from 'csv-parse';
import * as path from 'path';
import * as Stream from 'stream';
import JSONStream from 'JSONStream';

import BaseClient from './base_client';

const SQLITE_SCHEMA_VERSION = 1;
const SQLITE_SCHEMA = `
create table entity (
    locale text not null,
    type text not null,
    value text not null,
    name text not null,
    canonical text not null,
    serial integer not null
);
create index entity_type on entity(locale, type, serial);
create index entity_canonical on entity(locale, type, canonical);

create table string (
    locale text not null,
    type text not null,
    value text not null,
    preprocessed text not null,
    serial integer not null,
    weight real not null default 1.0,
    weight_cumsum real not null
);
create index string_type on string(locale, type, serial);
create index string_sample on string(locale, type, weight_cumsum);
`;

async function dbAll(db : sqlite3.Database, query : string, ...args : unknown[]) {
    return new Promise<any[]>((resolve, reject) => {
        db.all(query, ...args, (err : Error|null, rows : any[]) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}

/**
 * Load strings and entities from files.
 *
 * Strings are loaded from the TSV files generated from
 * https://almond.stanford.edu/thingpedia/strings/download/:x
 *
 * Entities are loaded from the JSON files returned from
 * https://almond.stanford.edu/thingpedia/api/v3/entities/list/:x
 */
class FileParameterProvider {
    private _filename : string;
    private _paramLocale : string;
    private _dirname : string;
    private _paths : Map<string, string>;
    private _db ! : sqlite3.Database;

    constructor(filename : string, paramLocale : string) {
        this._filename = filename;
        this._paramLocale = paramLocale || 'en-US';
        this._dirname = path.dirname(filename);
        this._paths = new Map;
    }

    async load() : Promise<void> {
        await this._loadPaths();
        this._db = await this._loadOrCreateSqliteCache();
    }

    private async _loadPaths() {
        const file = fs.createReadStream(this._filename);
        file.setEncoding('utf8');

        const input = byline(file);

        input.on('data', (line) => {
            if (/^\s*(#|$)/.test(line))
                return;

            const [stringOrEntity, locale, type, filepath] = line.trim().split('\t');
            if (stringOrEntity !== 'string' && stringOrEntity !== 'entity')
                throw new Error(`Invalid syntax: ${line}`);
            this._paths.set(stringOrEntity + '+' + locale + '+' + type, path.resolve(this._dirname, filepath));
        });

        await new Promise((resolve, reject) => {
            input.on('end', resolve);
            input.on('error', reject);
        });
    }

    private async _loadOrCreateSqliteCache() {
        const sqlitefilename = this._filename.replace(/\.tsv$/, '') + `.${SQLITE_SCHEMA_VERSION}.sqlite`;

        let mtime = -1, exists = false;
        try {
            const stat = await pfs.stat(sqlitefilename);
            mtime = stat.mtimeMs;
            exists = true;
        } catch(e) {
            if (e.code !== 'ENOENT')
                throw e;
        }

        const db = new sqlite3.Database(sqlitefilename, sqlite3.OPEN_CREATE|sqlite3.OPEN_READWRITE);
        db.serialize();
        if (!exists) {
            db.run(`PRAGMA journal_mode=WAL`);
            db.exec(SQLITE_SCHEMA);
        }

        for (const [typekey, filename] of this._paths) {
            const [stringOrEntity, locale, type] = typekey.split('+', 3);

            const stat = await pfs.stat(filename);
            if (stat.mtimeMs <= mtime)
                continue;

            console.log(`${stringOrEntity} ${type} (${locale}) is newer than sqlite db, updating`);

            db.run(`delete from ${stringOrEntity} where locale = ? and type = ?`, locale, type);
            if (stringOrEntity === 'string')
                await this._loadStrings(type, locale, db);
            else
                await this._loadEntities(type, locale, db);
        }

        db.parallelize();
        return db;
    }

    private async _loadStrings(stringType : string, locale : string, db : sqlite3.Database) {
        const filepath = this._paths.get(`string+${locale}+${stringType}`);
        if (!filepath)
            return;

        let serial = 0;
        let weight_cumsum = 0;
        const stmt = db.prepare(`insert into string(locale, type, value, preprocessed, serial, weight, weight_cumsum) values(?,?,?,?,?,?,?)`);
        const stream = fs.createReadStream(filepath)
            .pipe(csvparse({ delimiter: '\t', relax: true, relaxColumnCount: true }))
            .pipe(new Stream.Writable({
                objectMode: true,

                write(line, encoding, callback) {
                    const value = line[0];
                    let preprocessed : string, weight : number;
                    if (line.length === 1) {
                        preprocessed = line[0];
                        weight = 1.0;
                    } else if (line.length === 2) {
                        if (isFinite(+line[1])) {
                            preprocessed = line[0];
                            weight = parseFloat(line[1]);
                        } else {
                            preprocessed = line[1];
                            weight = 1.0;
                        }
                    } else {
                        preprocessed = line[1];
                        weight = parseFloat(line[2]) || 1.0;
                    }
                    if (!(weight > 0.0))
                        weight = 1.0;

                    weight_cumsum += weight;
                    stmt.run([locale, stringType, value, preprocessed, serial++, weight, weight_cumsum], callback);
                }
            }));

        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    }

    private async _loadEntities(entityType : string, locale : string, db : sqlite3.Database) {
        const filepath = this._paths.get(`entity+${locale}+${entityType}`);
        if (!filepath)
            return;

        let serial = 0;
        const stmt = db.prepare(`insert into entity(locale, type, value, name, canonical, serial) values(?,?,?,?,?,?)`);
        const stream = fs.createReadStream(filepath)
            .pipe(JSONStream.parse('data.*'))
            .pipe(new Stream.Writable({
                objectMode: true,

                write(obj : BaseClient.EntityRecord, encoding, callback) {
                    stmt.run([locale, obj.type || entityType, obj.value, obj.name, obj.canonical, serial++], callback);
                }
            }));

        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    }

    private async _getStrings(stringType : string) : Promise<FileParameterProvider.ParameterRecord[]> {
        return dbAll(this._db, `select value,preprocessed,weight from string where locale = ? and type = ? order by serial asc`, [this._paramLocale, stringType]);
    }

    private async _getEntities(stringType : string) : Promise<FileParameterProvider.ParameterRecord[]> {
        return dbAll(this._db, `select canonical as preprocessed, 1.0 as weight, value
            from entity where locale = ? and type = ? order by serial asc`, [this._paramLocale, stringType]);
    }

    async lookupEntity(stringType : string, term : string) : Promise<BaseClient.EntityRecord[]> {
        return dbAll(this._db, `select type,name,value,canonical from entity where locale = ? and type = ?
            and (value = ? or canonical like ?)`, [this._paramLocale, stringType, term, '%' + (term.toLowerCase()) + '%']);
    }

    async get(valueListType : 'string'|'entity', valueListName : string) : Promise<FileParameterProvider.ParameterRecord[]> {
        switch (valueListType) {
        case 'string':
            return this._getStrings(valueListName);
        case 'entity':
            return this._getEntities(valueListName);
        default:
            throw new TypeError(`Unexpected value list type ${valueListType}`);
        }
    }
}
namespace FileParameterProvider {
    export interface ParameterRecord {
        preprocessed : string;
        value : string;
        weight : number;
    }
}

export default FileParameterProvider;
