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
"use strict";

const Base = require('./base');
const Helpers = require('../helpers');
const { getMixinArgs } = require('../utils');
const BaseDevice = require('../base_device');

function makeGenericOAuth(kind, mixin, devclass) {
    const info = getMixinArgs(mixin);

    if (devclass.loadFromOAuth2 === BaseDevice.loadFromOAuth2) {
        devclass.loadFromOAuth2 = function loadFromOAuth2(engine, accessToken, refreshToken, extraData) {
            var obj = { kind: kind,
                        accessToken: accessToken,
                        refreshToken: refreshToken };
            for (let name in extraData) {
                if (name === 'access_token' || name === 'refresh_token' || name === 'expires_in')
                    continue;
                obj[name] = extraData[name];
            }

            if (info.get_profile) {
                var auth = 'Bearer ' + accessToken;
                return Helpers.Http.get(String(info.get_profile), { auth: auth,
                                                                    accept: 'application/json' })
                    .then((response) => {
                        var profile = JSON.parse(response);

                        if (info.profile) {
                            info.profile.forEach((p) => {
                                obj[p] = profile[p];
                            });
                        } else {
                            obj.profile = profile;
                        }

                        return new devclass(engine, obj);
                    });
            } else {
                return new devclass(engine, obj);
            }
        };
    }

    var runOAuth2 = Helpers.OAuth2({
        kind: kind,
        client_id: info.client_id,
        client_secret: info.client_secret,
        authorize: String(info.authorize),
        get_access_token: String(info.get_access_token),
        scope: info.scope,
        set_state: !!info.set_state,
        redirect_uri: info.redirect_uri ? String(info.redirect_uri) : info.redirect_uri
    });
    runOAuth2.install(devclass.prototype);
    devclass.runOAuth2 = runOAuth2;
}

module.exports = class OAuth2ConfigMixin extends Base {
    install(deviceClass) {
        // compatibility note:
        //
        // in the past, devices that use OAuth could still override runOAuth2
        // and call Tp.Helpers.OAuth2 manually
        // for this reason, we don't create the OAuth2 helpers if one is
        // already present
        // this also allowed custom behavior (e.g. OAuth 1.0) through
        // runOAuth2 (confusing, I know)
        //
        // nowadays, devices that just use OAuth 2.0 just override
        // loadFromOAuth2 instead of runOAuth2, and pass the OAuth info
        // to the helper
        //
        // if they require custom behavior, they should instead override
        // loadFromCustomOAuth/completeCustomOAuth
        //
        // all OAuth (1, 2, or 2 with custom code) goes through loadFromCustomOAuth/completeCustomOAuth
        // by default the latter call runOAuth2, which will then call the
        // default helper we install here, or the custom helper provided by the class

        if (!deviceClass.runOAuth2)
            makeGenericOAuth(this.kind, this.mixin, deviceClass);
        else if (deviceClass.runOAuth2 && deviceClass.runOAuth2.install)
            deviceClass.runOAuth2.install(deviceClass.prototype);
    }
};
