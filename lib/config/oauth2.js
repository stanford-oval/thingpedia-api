// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Base = require('./base');
const Helpers = require('../helpers');
const { getMixinArgs } = require('../utils');

function makeGenericOAuth(kind, mixin, devclass) {
    const info = getMixinArgs(mixin);

    function OAuthCallback(engine, accessToken, refreshToken, extraData) {
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
            return Helpers.Http.get(info.get_profile, { auth: auth,
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

                    return engine.devices.loadOneDevice(obj, true);
                });
        } else {
            return engine.devices.loadOneDevice(obj, true);
        }
    }

    var runOAuth2 = Helpers.OAuth2({
        kind: kind,
        client_id: info.client_id,
        client_secret: info.client_secret,
        authorize: info.authorize,
        get_access_token: info.get_access_token,
        scope: info.scope,
        set_state: !!info.set_state,
        callback: OAuthCallback
    });
    runOAuth2.install(devclass.prototype);
    devclass.runOAuth2 = runOAuth2;
}

module.exports = class OAuth2ConfigMixin extends Base {
    install(deviceClass) {
        if (!deviceClass.runOAuth2)
            makeGenericOAuth(this.kind, this.mixin, deviceClass);
        else if (deviceClass.runOAuth2 && deviceClass.runOAuth2.install)
            deviceClass.runOAuth2.install(deviceClass.prototype);
    }
};
