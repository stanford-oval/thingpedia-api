// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2018-2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const ThingTalk = require('thingtalk');
const Ast = ThingTalk.Ast;
const fs = require('fs');
const util = require('util');
const BaseClient = require('./base_client');

module.exports = class FileThingpediaClient extends BaseClient {
    constructor(args) {
        super();
        this._locale = args.locale;
        this._devices = null;
        this._entities = null;

        this._examples = null;
        this._datasets = null;

        this._thingpediafilename = args.thingpedia;
        this._entityfilename = args.entities;
        this._datasetfilename = args.dataset;
        this._loaded = null;
    }

    get locale() {
        return this._locale;
    }

    async _load() {
        this._devices = (await util.promisify(fs.readFile)(this._thingpediafilename)).toString();

        if (this._entityfilename)
            this._entities = JSON.parse(await util.promisify(fs.readFile)(this._entityfilename)).data;
        else
            this._entities = null;

        this._examples = await util.promisify(fs.readFile)(this._datasetfilename, { encoding: 'utf8' });
        this._datasets = await ThingTalk.Grammar.parse(this._examples).datasets;
    }

    _ensureLoaded() {
        if (this._loaded)
            return this._loaded;
        else
            return this._loaded = this._load();
    }

    async getSchemas(kinds, useMeta) {
        await this._ensureLoaded();

        // ignore kinds, just return the full file, SchemaRetriever will take care of the rest
        return this._devices;
    }
    async getDeviceCode(kind) {
        // we don't have the full class, so we just return the meta info
        await this._ensureLoaded();

        const parsed = ThingTalk.Grammar.parse(this._devices);
        for (let classDef of parsed.classes) {
            if (classDef.kind === kind)
                return classDef.prettyprint();
        }
        throw new Error('Not Found');
    }

    async getAllExamples() {
        await this._ensureLoaded();
        return this._examples;
    }

    async getExamplesByKinds(kinds) {
        if (kinds.length > 1)
            throw new Error(`Cannot get examples for multiple devices using FileThingpediaClient`);
        await this._ensureLoaded();
        const dataset = this._datasets.find((d) => d.name === kinds[0] || d.name === '@' + kinds[0]);
        return new Ast.Input.Library([], [dataset]).prettyprint();
    }

    async getAllDeviceNames() {
        await this._ensureLoaded();

        const parsed = ThingTalk.Grammar.parse(this._devices);
        let names = [];
        for (let classDef of parsed.classes) {
            names.push({
                kind: classDef.kind,
                kind_canonical: classDef.metadata.canonical
            });
        }
        return names;
    }

    async getAllEntityTypes() {
        await this._ensureLoaded();
        return this._entities;
    }
};
