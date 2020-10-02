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


// Copied from gjs
//
// Copyright 2013 Florian Müllner <fmuellner@gnome.org>
//           2016 Philip Chimento <philip.chimento@gmail.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import assert from 'assert';

import '../lib/string_format';

export default async function test() {
    assert.strictEqual('%d%%'.format(10), '10%');
    assert.strictEqual('%s'.format('Foo'), 'Foo');
    assert.strictEqual('%s %s'.format('Foo', 'Bar'), 'Foo Bar');
    assert.strictEqual('%2$s %1$s'.format('Foo', 'Bar'), 'Bar Foo');
    assert.strictEqual('%d'.format(42), '42');
    assert.strictEqual('%x'.format(42), '2a');
    assert.strictEqual('%f'.format(0.125), '0.125');
    assert.strictEqual('%.2f'.format(0.125), '0.13');

    let zeroFormat = '%04d';
    assert.strictEqual(zeroFormat.format(1), '0001');
    assert.strictEqual(zeroFormat.format(10), '0010');
    assert.strictEqual(zeroFormat.format(100), '0100');

    let spaceFormat = '%4d';
    assert.strictEqual(spaceFormat.format(1), '   1');
    assert.strictEqual(spaceFormat.format(10), '  10');
    assert.strictEqual(spaceFormat.format(100), ' 100');

    assert.throws(() => '%z'.format(42));
    assert.throws(() => '%.2d'.format(42));
    assert.throws(() => '%Ix'.format(42));

    assert.throws(() => '%2$d %d %1$d'.format(1, 2, 3));
}
if (!module.parent)
    test();
