// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
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

// Declarations of the platform capabilities

import * as stream from 'stream';
import * as events from 'events';
import Gettext from 'node-gettext';
import * as smt from 'smtlib';

import BaseClient from './base_client';

export interface ContentApi {
    getStream(url : string) : Promise<stream.Readable>;
}

export interface UnzipApi {
    unzip(zipPath : string, dir : string) : Promise<void>;
}

export interface Image {
    getSize() : Promise<{ width : number; height : number }>;
    resizeFit(width : number, height : number) : void;
    stream(format : string) : Promise<stream.Readable>;
    toBuffer() : Promise<Buffer>;
}

export interface GraphicsApi {
    createImageFromPath(path : string) : Image;
    createImageFromBuffer(buffer : Buffer) : Image;
}

type URLQuery = { [key : string] : string|string[]|undefined };
export type WebhookCallback = (id : string,
                               method : 'GET'|'POST',
                               query : URLQuery,
                               headers : URLQuery,
                               payload : unknown) => Promise<void>;

export interface WebhookApi {
    handleCallback(id : string,
                   method : 'GET'|'POST',
                   query : URLQuery,
                   headers : URLQuery,
                   payload : unknown) : Promise<void>;

    getWebhookBase() : string;
    registerWebhook(id : string, callback : WebhookCallback) : void;
    unregisterWebhook(id : string) : void;
}

interface BTDevice {
    uuids : string[];
    alias : string;
    address : string;
    paired : boolean;
    trusted : boolean;
    class : number;
}

interface BTDeviceCallback {
    (error : null, device : BTDevice) : void;
    (error : Error, device : null) : void;
}

export interface BluetoothApi {
    start() : Promise<void>;
    stop() : Promise<void>;
    startDiscovery() : Promise<void>;
    stopDiscovery() : Promise<void>;
    readUUIDs(address : string) : Promise<string[]|undefined>;

    ondeviceadded : BTDeviceCallback|null;
    ondevicechanged : BTDeviceCallback|null;
    ondiscoveryfinished : (() => void)|null;
}

interface SoundStreamOptions {
    stream ?: string;
    device ?: string;
    format ?: string;
    rate ?: number;
    channels ?: number;
    latency ?: number;
    flags ?: string;
    properties ?: Record<string, string>;
}

export interface SoundApi extends events.EventEmitter {
    createRecordStream(options : SoundStreamOptions) : stream.Readable;
    createPlaybackStream(options : SoundStreamOptions) : stream.Writable;
}

export type WakeWordApi = stream.Writable;

interface Location {
    latitude : number;
    longitude : number;
    altitude ?: number;
    bearing ?: number;
    speed ?: number;
    display ?: string;
}

export interface GpsApi {
    start() : Promise<void>;
    stop() : Promise<void>;

    getCurrentLocation() : Promise<Location>;

    onlocationchanged : ((loc : Location) => void)|null;
}

export interface StatisticsApi {
    hit(key : string) : void;
}

interface WebSocket extends events.EventEmitter {
    ping() : void;
    pong() : void;
    terminate() : void;
    send(data : string) : void;
}

export interface WebSocketApi extends events.EventEmitter {
    on(event : 'connection', cb : (ws : WebSocket) => void) : this;
    on(event : string, cb : (...args : any[]) => void) : this;
}

interface Contact {
    value : string;
    displayName : string;
    alternativeDisplayName : string;
    isPrimary : boolean;
    starred : boolean;
    timesContacted : number;
}

export interface ContactsApi {
    lookup(what : 'email_address' | 'phone_number' | 'contact',
           name : string) : Promise<Contact[]>;
    lookupPrincipal(principal : string) : Promise<Contact>;
}

export interface AppLauncherApi {
    listApps() : Promise<Array<{ value : string; name : string; canonical : string }>>;
    hasApp(appId : string) : Promise<boolean>;
    launchApp(appId : string, ...files : string[]) : Promise<void>;
    launchURL(url : string) : Promise<void>;
}

export interface SystemLockApi {
    readonly isActive : boolean;
    lock() : Promise<void>;
}

interface Player {
    stop() : Promise<void>;
}

export interface AudioPlayerApi {
    play(urls : string[]) : Promise<Player>;
}

export interface SoundEffectsApi {
    play(name : string) : Promise<void>;
}

export interface CapabilityMap {
    'thingpedia-client' : BaseClient;
    'content-api' : ContentApi;
    'code-download' : UnzipApi;
    'gettext' : Gettext;
    'smt-solver' : smt.BaseSolver;
    'graphics-api' : GraphicsApi;
    'webhook-api' : WebhookApi;
    'websocket-api' : WebSocketApi;
    'bluetooth' : BluetoothApi;
    'sound' : SoundApi;
    'wakeword-detector' : WakeWordApi;
    'gps' : GpsApi;
    'statistics' : StatisticsApi;
    'contacts' : ContactsApi;
    'app-launcher' : AppLauncherApi;
    'system-lock' : SystemLockApi;
    'audio-player' : AudioPlayerApi;
    'sound-effects' : SoundEffectsApi;

    [key : string] : unknown;
}
