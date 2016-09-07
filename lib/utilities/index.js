// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015-2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

module.exports = {
    // deprecated stuff
    OnlineAccount: require('./online_account'),
    SimpleAction: require('./simple_action'),

    // good stuff
    PollingTrigger: require('./polling'),
    HttpPollingTrigger: require('./http_polling'),
    RSSPollingTrigger: require('./rss'),
};
