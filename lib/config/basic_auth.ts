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

import BaseDevice from '../base_device';

import Base from './base';

export default class BasicAuthConfigMixin extends Base {
    install(deviceClass : BaseDevice.DeviceClass<BaseDevice>) {
        // add an "auth" getter to the device class (through the prototype)
        // that returns the HTTP Authorization header to use

        Object.defineProperty(deviceClass.prototype, 'auth', {
            configurable: true,
            enumerable: true,
            get() {
                const base64 = Buffer.from(this.state.username + ':' +
                                           this.state.password).toString('base64');
                return 'Basic ' + base64;
            }
        });
    }
}
