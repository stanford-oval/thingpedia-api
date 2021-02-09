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


import V2 from './v2';

import GenericRestModule from './generic';
import RSSModule from './rss_factory';
import BuiltinModule from './builtin';
import UnsupportedBuiltinModule from './unsupported_builtin';

const modules = {
    'org.thingpedia.builtin': BuiltinModule,
    'org.thingpedia.builtin.unsupported': UnsupportedBuiltinModule,

    'org.thingpedia.v2': V2,
    'org.thingpedia.rss': RSSModule,
    'org.thingpedia.generic_rest.v1': GenericRestModule
};
export default modules;