// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2018-2020 The Board of Trustees of the Leland Stanford Junior University
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


// load everything in process so we have a global view of code coverage
import '../lib/index';

process.on('unhandledRejection', (up) => {
    throw up;
});
process.env.TEST_MODE = '1';

async function seq(array) {
    for (let el of array) {
        console.log(`Running tests for ${el}`);
        await (await import(el)).default();
    }
}

seq([
    ('./test_version'),
    ('./test_unit'),
    ('./test_device_factories'),
    ('./test_discovery_services'),
    ('./test_string_format'),
    ('./test_class'),
    ('./test_object_set'),
    ('./test_prefs'),
    ('./test_http'),
    ('./test_rss'),
    ('./test_polling'),
    ('./test_refcounted'),
    ('./test_content'),
    ('./test_factory_api'),
    ('./test_parameter_provider'),
    ('./test_http_client'),
    ('./test_file_client'),
    ('./test_builtin'),
    ('./test_v2_device'),
    ('./test_generic_rest'),
    ('./test_rss_device'),
    ('./test_i18n'),
]);
