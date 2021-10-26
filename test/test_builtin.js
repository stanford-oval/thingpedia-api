// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
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
import { Syntax } from 'thingtalk';

import ModuleDownloader from '../lib/downloader';
import BaseDevice from '../lib/base_device';

import { mockClient, mockPlatform, mockEngine } from './mock';

const Builtins = {
    'org.thingpedia.builtin.foo': {
        class: Syntax.parse(`class @org.thingpedia.builtin.foo {
            import loader from @org.thingpedia.builtin();
            import config from @org.thingpedia.config.none();

            query get(out something : String);
        }`).classes[0],

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        module: class FooBuiltin extends BaseDevice {
            constructor(engine, state) {
                super(engine, state);
                this.name = "Foo";
                this.description = "Foo description";
                this.uniqueId = 'org.thingpedia.builtin.foo';
            }

            async get_get() {
                return [{ something: 'lol' }];
            }
        }
    },

    'org.thingpedia.builtin.test.collection': {
        class: Syntax.parse(`class @org.thingpedia.builtin.test.collection
        #[child_types=["org.thingpedia.builtin.test.subdevice"]] {
            import loader from @org.thingpedia.builtin();
            import config from @org.thingpedia.config.none();
        }`).classes[0],

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        module: class CollectionBuiltin extends BaseDevice {
            constructor(engine, state) {
                super(engine, state);
                this.name = "Collection";
                this.description = "Collection description";
                this.uniqueId = 'org.thingpedia.builtin.test.collection';
            }
        }
    },

    'org.thingpedia.builtin.test.subdevice': {
        class: Syntax.parse(`class @org.thingpedia.builtin.test.subdevice {
            import loader from @org.thingpedia.embedded();
            import config from @org.thingpedia.config.none();

            query bla(out something : String);
        }`).classes[0],

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        module: class SubdeviceBuiltin extends BaseDevice {
            constructor(engine, state) {
                super(engine, state);
                this.name = "Subdevice";
                this.description = "Subdevice description";
                this.uniqueId = 'org.thingpedia.builtin.test.subdevice';
            }

            async get_bla() {
                return [{ something: 'lol' }];
            }
        }
    },
};
Builtins['org.thingpedia.builtin.test.collection'].module.subdevices = {
    'org.thingpedia.builtin.test.subdevice': Builtins['org.thingpedia.builtin.test.subdevice'].module
};

async function testBasic() {
    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas, Builtins);
    const module = await downloader.getModule('org.thingpedia.builtin.foo');

    assert.strictEqual(module.id, 'org.thingpedia.builtin.foo');
    assert.strictEqual(module.version, 0); // regardless of what the class code says
    assert.strictEqual(await module.getDeviceClass(), Builtins['org.thingpedia.builtin.foo'].module);
    assert(Builtins['org.thingpedia.builtin.foo'].module.metadata);
    assert.strictEqual(Builtins['org.thingpedia.builtin.foo'].module.metadata.kind, 'org.thingpedia.builtin.foo');
    assert.strictEqual(typeof Builtins['org.thingpedia.builtin.foo'].module.prototype.subscribe_get, 'function');
}

async function testCollection() {
    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas, Builtins);
    const module = await downloader.getModule('org.thingpedia.builtin.test.collection');

    assert.strictEqual(module.id, 'org.thingpedia.builtin.test.collection');
    assert.strictEqual(module.version, 0);
    assert.strictEqual(await module.getDeviceClass(), Builtins['org.thingpedia.builtin.test.collection'].module);

    assert(Builtins['org.thingpedia.builtin.test.collection'].module.metadata);
    assert.strictEqual(Builtins['org.thingpedia.builtin.test.collection'].module.metadata.kind,
        'org.thingpedia.builtin.test.collection');
    assert.strictEqual(typeof Builtins['org.thingpedia.builtin.test.collection'].module.prototype.subscribe_bla, 'undefined');

    assert(Builtins['org.thingpedia.builtin.test.subdevice'].module.metadata);
    assert.strictEqual(Builtins['org.thingpedia.builtin.test.subdevice'].module.metadata.kind,
        'org.thingpedia.builtin.test.subdevice');
    assert.strictEqual(typeof Builtins['org.thingpedia.builtin.test.subdevice'].module.prototype.subscribe_bla, 'function');
}

async function testUnsupported() {
    const downloader = new ModuleDownloader(mockPlatform, mockClient, mockEngine.schemas, Builtins);
    const module = await downloader.getModule('org.thingpedia.builtin.test.invalid');

    assert.strictEqual(module.id, 'org.thingpedia.builtin.test.invalid');
    assert.strictEqual(module.version, 0);

    const _class = await module.getDeviceClass();
    const dev = new _class(mockEngine, { kind: 'org.thingpedia.builtin.test.invalid' });

    assert.strictEqual(dev.name, "Invalid Builtin");
    assert.strictEqual(dev.description, "Invalid Builtin Description");
    assert.strictEqual(typeof dev.get_foo, 'function');
    assert.strictEqual(typeof dev.subscribe_foo, 'function');
    assert.rejects(async () => dev.get_foo(), { code: 'ENOSYS', message: 'This command is not available in this version of Almond' });
}

async function main() {
    await testBasic();
    await testCollection();
    await testUnsupported();
}
export default main;
if (!module.parent)
    main();
