// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
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
import * as path from 'path';

import FileParameterProvider from "../lib/file_parameter_provider";

const provider = new FileParameterProvider(path.resolve(path.dirname(module.filename), './developer-dir/parameter-datasets.tsv'), 'en-US');

async function testBasic() {
    assert.deepStrictEqual(await provider.get('entity', 'com.example:my_entity'), [
        {
            preprocessed: 'entity alice',
            value: '1',
            weight: 1.0
        },
        {
            preprocessed: 'entity bob',
            value: '2',
            weight: 1.0
        }
    ]);

    assert.deepStrictEqual(await provider.get('string', 'com.example:my_string'), [
        {
            preprocessed: 'aaaa',
            value: 'Aaaa',
            weight: 1.0
        },
        {
            preprocessed: 'bbbb',
            value: 'bbbb',
            weight: 5.0
        },
        {
            preprocessed: 'cccc',
            value: 'CCcc',
            weight: 1.0
        },
        {
            preprocessed: 'dddd',
            value: 'DDDD',
            weight: 1.0
        }
    ]);
}

async function main() {
    await provider.load();

    await testBasic();
}
export default main;
if (!module.parent)
    main();
