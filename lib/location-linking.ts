// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Genie (testing)
//
// Copyright 2023 The Board of Trustees of the Leland Stanford Junior University
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
//         Shicheng Liu <shicheng@cs.stanford.edu>

import * as Helpers from './helpers';
import * as qs from 'qs';
import * as addressFormatter from '@fragaria/address-formatter';
// import * as Config from '../config';

const FREE_URL = 'http://nominatim.openstreetmap.org/search/?'; //?format=jsonv2&accept-language=%s&limit=5&q=%s

interface NominatimQueryArgs {
    format : 'jsonv2';
    'accept-language' : string;
    limit : number;
    q : string;
    addressdetails : '1'|'0';
    viewbox ?: string;
}

interface NominatimRecord {
    address : Record<string, string>;
    place_rank : number;
    lat : string;
    lon : string;
    display_name : string;
    importance : number;
}

// NOTE: This is a temporary solution in dev. This will be moved to a cloud server soon.
export default async function resolveLocation(locale = 'en-US', searchKey : string, around ?: {
    latitude : number,
    longitude : number
}) {
    const url = FREE_URL;

    // remove the word "in"
    searchKey = searchKey.replace(/\b(in|at)\b/ig, '');

    const data : NominatimQueryArgs = {
        format: 'jsonv2',
        'accept-language': locale,
        limit: 5,
        q: searchKey,
        addressdetails: '1',
    };
    if (around) {
        // round to 1 decimal digit
        const lat = Math.round(around.latitude * 10) / 10;
        const lon = Math.round(around.longitude * 10) / 10;

        data.viewbox = [lon-0.1, lat-0.1, lon+0.1, lat+0.1].join(',');
    }

    const parsed = JSON.parse(await Helpers.Http.get(url + qs.stringify(data))) as NominatimRecord[];

    return parsed.map((result) => {
        delete result.address.postcode;
        const addressKeys = Object.keys(result.address);
        const firstKey = addressKeys[0];

        // format the address, then pick only the first line or first two lines
        const formatted = addressFormatter.format(result.address, {
            abbreviate: false,
            output: 'array'
        });
        // let display = formatted.slice(0, result.place_rank > 20 /* neighborhood */ ? 2 : 1).join(', ');
        let display = formatted[1];
        // prepend the neighborhood if that's what the user is looking for, because addressFormatter
        // doesn't include it
        if (firstKey === 'neighbourhood' || firstKey === 'city_district')
            display = (result.address.neighbourhood || result.address.city_district) + ', ' + display;

        return {
            latitude: Number(result.lat),
            longitude: Number(result.lon),
            display: display,
            canonical: display,
            full_name: result.display_name,
            rank: Number(result.place_rank),
            importance: result.importance,
            address: result.address
        };
    });
}
