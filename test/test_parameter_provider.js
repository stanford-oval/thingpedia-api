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
import * as seedrandom from 'seedrandom';

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

    assert.deepStrictEqual(await provider.get('string', 'com.example:my_entity'), []);
}

async function testSample() {
    const rng = seedrandom.alea('almond is awesome');

    const sequential = await provider.getSampler('string', 'com.example:my_string', FileParameterProvider.SampleMode.SEQUENTIAL);
    assert.deepStrictEqual(sequential.size, 4);
    assert.deepStrictEqual(await sequential.sample(rng), {
        preprocessed: 'aaaa',
        value: 'Aaaa',
        weight: 1.0
    });
    assert.deepStrictEqual(await sequential.sample(rng), {
        preprocessed: 'bbbb',
        value: 'bbbb',
        weight: 5.0
    });

    const uniform = await provider.getSampler('string', 'com.example:my_string', FileParameterProvider.SampleMode.UNIFORM);
    assert.deepStrictEqual(uniform.size, 4);
    assert.deepStrictEqual(await uniform.sample(rng), {
        preprocessed: 'cccc',
        value: 'CCcc',
        weight: 1.0
    });
    assert.deepStrictEqual(await uniform.sample(rng), {
        preprocessed: 'dddd',
        value: 'DDDD',
        weight: 1.0
    });

    const weighted = await provider.getSampler('string', 'com.example:my_string', FileParameterProvider.SampleMode.WEIGHTED);
    assert.deepStrictEqual(weighted.size, 4);
    for (let i = 0; i < 7; i++) {
        assert.deepStrictEqual(await weighted.sample(rng), {
            preprocessed: 'bbbb',
            value: 'bbbb',
            weight: 5.0
        });
    }
    assert.deepStrictEqual(await weighted.sample(rng), {
        preprocessed: 'aaaa',
        value: 'Aaaa',
        weight: 1.0
    });
}

async function testSampleEntity() {
    const rng = seedrandom.alea('almond is awesome');

    const sequential = await provider.getSampler('entity', 'com.example:my_entity', FileParameterProvider.SampleMode.SEQUENTIAL);
    assert.deepStrictEqual(sequential.size, 2);
    assert.deepStrictEqual(await sequential.sample(rng), {
        preprocessed: 'entity alice',
        value: '1',
        weight: 1.0
    });
    assert.deepStrictEqual(await sequential.sample(rng), {
        preprocessed: 'entity bob',
        value: '2',
        weight: 1.0
    });

    const uniform = await provider.getSampler('entity', 'com.example:my_entity', FileParameterProvider.SampleMode.UNIFORM);
    assert.deepStrictEqual(uniform.size, 2);
    assert.deepStrictEqual(await uniform.sample(rng), {
        preprocessed: 'entity bob',
        value: '2',
        weight: 1.0
    });
    assert.deepStrictEqual(await uniform.sample(rng), {
        preprocessed: 'entity bob',
        value: '2',
        weight: 1.0
    });
    assert.deepStrictEqual(await uniform.sample(rng), {
        preprocessed: 'entity alice',
        value: '1',
        weight: 1.0
    });
}

async function main() {
    await provider.load();

    await testBasic();
    await testSample();
    await testSampleEntity();
}
export default main;
if (!module.parent)
    main();
