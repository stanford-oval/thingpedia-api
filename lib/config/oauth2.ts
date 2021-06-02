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

import { Ast } from 'thingtalk';

import Base from './base';
import * as Helpers from '../helpers';
import { getMixinArgs } from '../utils';

import BaseDevice from '../base_device';

function makeGenericOAuth(kind : string, mixin : Ast.MixinImportStmt, devclass : BaseDevice.DeviceClass<BaseDevice>) {
    const info = getMixinArgs(mixin);

    if (devclass.loadFromOAuth2 === BaseDevice.loadFromOAuth2) {
        devclass.loadFromOAuth2 = async function loadFromOAuth2(engine, accessToken, refreshToken, extraData) {
            const obj : {
                kind : string,
                accessToken : string,
                refreshToken : string|undefined,
                [key : string] : unknown
            } = {
                kind: kind,
                accessToken: accessToken,
                refreshToken: refreshToken
            };
            for (const name in extraData) {
                if (name === 'access_token' || name === 'refresh_token' || name === 'expires_in')
                    continue;
                obj[name] = extraData[name];
            }

            if (info.get_profile) {
                const auth = 'Bearer ' + accessToken;
                const response = await Helpers.Http.get(String(info.get_profile), {
                    auth: auth,
                    accept: 'application/json'
                });
                const profile = JSON.parse(response);

                if (info.profile) {
                    (info.profile as string[]).forEach((p) => {
                        obj[p] = profile[p];
                    });
                } else {
                    obj.profile = profile;
                }

                return new devclass(engine, obj);
            } else {
                return new devclass(engine, obj);
            }
        };
    }

    const runOAuth2 = Helpers.OAuth2({
        authorize: String(info.authorize),
        get_access_token: String(info.get_access_token),
        scope: info.scope as string[],
        set_state: !!info.set_state,
        use_pkce: !!info.use_pkce,
        redirect_uri: info.redirect_uri ? String(info.redirect_uri) : undefined
    });
    runOAuth2.install(devclass.prototype);

    // FIXME: there is some trickery going on here with abstract/non-abstract constructors
    // which means this doesn't typecheck correctly...
    devclass.runOAuth2 = runOAuth2 as any;
}

export default class OAuth2ConfigMixin extends Base {
    // Override this method so a missing client_secret doesn't cause us to go through
    // a proxy for the whole device
    // Instead, we will proxy only the authentication calls, store the access token
    // locally, and run the skill normally as if we had all the keys
    hasMissingKeys() {
        return false;
    }

    install(deviceClass : BaseDevice.DeviceClass<BaseDevice>) {
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

        const runOAuth2 : any = deviceClass.runOAuth2;
        if (!runOAuth2)
            makeGenericOAuth(this.kind, this.mixin, deviceClass);
        else if (runOAuth2 && runOAuth2.install)
            runOAuth2.install(deviceClass.prototype);
    }
}
