// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2018 Google LLC
//           2018-2020 The Board of Trustees of the Leland Stanford Junior University
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


import * as Tp from '../lib/index';
import assert from 'assert';

async function main() {
    const packageJson = (await import('../package.json')).default;
    assert.strictEqual(String(Tp.version), packageJson.version);

    assert.strictEqual(Tp.version.major, 2);
    assert.strictEqual(Tp.version.minor, 10);

    assert(Tp.version.compatible(201));
    assert(Tp.version.compatible(202));
    assert(Tp.version.compatible(203));
    assert(Tp.version.compatible(204));
    assert(Tp.version.compatible(205));
    assert(Tp.version.compatible(206));
    assert(Tp.version.compatible(207));
    assert(Tp.version.compatible(208));
    assert(Tp.version.compatible(209));
    assert(Tp.version.compatible(210));
    assert(!Tp.version.compatible(211));
    assert(!Tp.version.compatible(300));
    assert(!Tp.version.compatible(100));
    assert(Tp.version.compatible({ major: 2, minor: 1 }));
    assert(Tp.version.compatible({ major: 2, minor: 2 }));
    assert(Tp.version.compatible({ major: 2, minor: 3 }));
    assert(Tp.version.compatible({ major: 2, minor: 4 }));
    assert(Tp.version.compatible({ major: 2, minor: 5 }));
    assert(Tp.version.compatible({ major: 2, minor: 6 }));
    assert(Tp.version.compatible({ major: 2, minor: 7 }));
    assert(Tp.version.compatible({ major: 2, minor: 8 }));
    assert(Tp.version.compatible({ major: 2, minor: 9 }));
    assert(Tp.version.compatible({ major: 2, minor: 10 }));
    assert(!Tp.version.compatible({ major: 2, minor: 11 }));
    assert(!Tp.version.compatible({ major: 3, minor: 0 }));
    assert(!Tp.version.compatible({ major: 1, minor: 0 }));

    assert(Tp.version.hasFeature('rss'));
    assert(Tp.version.hasFeature('value-types'));
    assert(Tp.version.hasFeature('thingpedia-client'));
    assert(!Tp.version.hasFeature('invalid'));
}
export default main;
if (!module.parent)
    main();
