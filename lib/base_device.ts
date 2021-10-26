// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2016-2019 The Board of Trustees of the Leland Stanford Junior University
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

import * as stream from 'stream';
import * as ThingTalk from 'thingtalk';
import * as events from 'events';
import * as Url from 'url';
import interpolate from 'string-interp';

import type * as ObjectSet from './helpers/object_set';

import type Messaging from './messaging';
import type ConfigDelegate from './config_delegate';
import type BaseEngine from './base_engine';
import type BasePlatform from './base_platform';
import DialogueHandler from './dialogue-handler';

/**
 * The coarse grain classification of the currently running Almond platform.
 *
 * Tiers are used to inform how synchronization of device database occurs.
 *
 */
export enum Tier {
    GLOBAL = 'global',
    PHONE = 'phone',
    SERVER = 'server',
    DESKTOP = 'desktop',
    CLOUD = 'cloud'
}

/**
 * Whether a device is available (power on and accessible).
 *
 */
export enum Availability {
    UNAVAILABLE = 0,
    AVAILABLE = 1,
    OWNER_UNAVAILABLE = 2,
    UNKNOWN = -1
}

/**
 * The base class of all Thingpedia device implementations.
 *
 */
abstract class BaseDevice extends events.EventEmitter {
    // no $rpc for queryInterface, extension interfaces are not exported
    $rpcMethods = [
        'get name', 'get uniqueId', 'get description',
        'get ownerTier', 'get kind', 'get isTransient',
        'checkAvailable', 'hasKind'] as const;
    // legacy interface
    static runOAuth2 ?: BaseDevice.LegacyRunOAuth2;

    // access ThingTalk metadata at runtime
    static metadata : BaseDevice.DeviceMetadata;
    static manifest : ThingTalk.Ast.ClassDef;

    static Tier = Tier;
    static Availability = Availability;

    protected _engine : BaseEngine;
    state : BaseDevice.DeviceState;
    /**
     * The unique ID of this device instance.
     *
     * Device implementations should set this the Thingpedia kind (class ID) plus something unique
     * (eg "com.mydevice/aa-bb-cc-dd-ee-ff") so that no other device
     * can possibly have the same ID.
     * If you leave it unset, a unique identifier will be automatically generated.
     */
    uniqueId : string|undefined;
    /**
     * The user-visible name of this device instance.
     *
     * If multiple instances of the same class can reasonably be configured by the same
     * user (e.g. multiple devices of the same brand, or multiple accounts on the same service),
     * they should have different names.
     *
     * This defaults to the `#_[name]` annotation provided in Thingpedia, with placeholders replaced with
     * values taken from the device state.
     *
     */
    name : string;
    /**
     * A longer description of this device instance.
     *
     * This can be used to add additional distinguishing information, such as the URL
     * or address of a local gateway.
     * It defaults to the `#_[description]` annotation provided in Thingpedia.
     *
     */
    description : string;
    /**
     * Discovery protocol descriptors.
     *
     * Device implementations should set these to protocol/discovery specific IDs (such as
     * "bluetooth/aa-bb-cc-dd-ee-ff") so that it is unlikely that
     * another device has the same ID.
     *
     */
    descriptors : string[];
    /**
     * Indicates a transient device.
     *
     * Set to true if this device should not be stored in the device database
     * but only kept in memory (i.e., its lifetime is managed by some
     * device discovery module, or it's a subdevice of some other device).
     *
     */
    isTransient : boolean;

    /**
     * Construct a new Thingpedia device.
     *
     * You should never construct a BaseDevice directly. Only subclasses should
     * call the constructor.
     *
     * @param {BaseEngine} engine - the shared Almond engine initializing this device
     * @param {Object} state - arbitrary JSON data associated with this device
     */
    constructor(engine : BaseEngine, state : BaseDevice.DeviceState) {
        super();
        this._engine = engine;

        /**
         * The current device state.
         */
        this.state = state;

        // provide default uniqueId for config.none() devices
        const ast = this.metadata;
        const params = Object.keys(ast.params);
        const isNoneFactory = ast.auth.type === 'none' && params.length === 0;
        const isNoneAuth = ast.auth.type === 'none';

        if (isNoneFactory)
            this.uniqueId = this.kind;
        else if (isNoneAuth)
            this.uniqueId = this.kind + '-' + params.map((k) => (k + ':' + state[k])).join('-');
        else
            this.uniqueId = undefined; // let DeviceDatabase pick something

        // provide default name and description
        // NOTE: these are not getters, because the subclass can override
        // them and mutate them as it wishes

        this.name = ast.name;
        if (ast.name) {
            this.name = interpolate(ast.name, this.state, {
                locale: this.platform.locale,
                timezone: this.platform.timezone
            })||'';
        }

        this.description = ast.description;
        if (ast.description) {
            this.description = interpolate(ast.description, this.state, {
                locale: this.platform.locale,
                timezone: this.platform.timezone
            })||'';
        }

        this.descriptors = [];

        this.isTransient = false;
    }

    // configuration interfaces

    /**
     * Begin configuring this device using a custom OAuth-like flow.
     *
     * This includes OAuth 1.0 and OAuth 2.0 with custom code.
     * Standard uses of OAuth 2.0 should not override this method. Instead, they
     * should use the `@org.thingpedia.config.oauth2()` mixin, and override {@link BaseDevice.loadFromOAuth2}.
     *
     * The method should return a tuple of:
     * - redirect uri (a String)
     * - session object (a plain JS object mapping String to String)
     *
     * The data in the session object will be passed to `completeCustomOAuth`.
     *
     * @param {BaseEngine} engine - the shared Almond engine initializing this device
     * @return {Array} tuple of redirect URI and session data
    */
    static async loadFromCustomOAuth(engine : BaseEngine) : Promise<[string, BaseDevice.SessionMap]> {
        // if not overridden, call the compatibility method using the legacy interface
        // (req === null to mean phase1, req !== null for phase2)
        // NOTE: we're in a static method, so "this" refers to the class, not the instance!
        return this.runOAuth2!(engine, null);
    }

    /**
     * Complete configuring this device using custom OAuth-like flows.
     *
     * This method will be called after the user redirects back to Almond,
     * and will be passed the redirect URL, and the session information that was returned
     * by {@link BaseDevice.loadFromCustomOAuth}.
     *
     * @param {BaseEngine} engine - the shared Almond engine initializing this device
     * @param {string} url - the redirect URL called after completing OAuth
     * @param {Object.<string,string>} session - session data that was returned from {@link BaseDevice.loadFromCustomOAuth}
     * @return {BaseDevice} the fully configured device instance
    */
    static async completeCustomOAuth(engine : BaseEngine, url : string, session : BaseDevice.SessionMap) : Promise<BaseDevice|null> {
        // if not overridden, call the compatibility method with a made-up `req` object
        const req : BaseDevice.HTTPRequest = {
            httpVersion: '1.0',
            headers: [],
            rawHeaders: [],
            method: 'GET',
            url: url,
            query: Url.parse(url, true).query,
            session: session
        };
        return this.runOAuth2!(engine, req);
    }

    /* istanbul ignore next */
    /**
     * Configure this device using OAuth 2.0
     *
     * This method is called by the OAuth 2.0 helpers (`@org.thingpedia.config.oauth2()`)
     * and should return a new device instance.
     *
     * @param {BaseEngine} engine - the shared Almond engine initializing this device
     * @param {string} accessToken - the OAuth access token
     * @param {string} refreshToken - the OAuth refresh token, if one is provided
     * @param {Object} extraData - the whole response to the OAuth token request
    */
    static async loadFromOAuth2(engine : BaseEngine,
                                accessToken : string,
                                refreshToken : string|undefined,
                                extraData : { [key : string] : unknown }) : Promise<BaseDevice> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Configure this device using local discovery.
     *
     * The method should return a new device instance. The instance might be partially
     * initialized (e.g. for Bluetooth, the device might not be paired). If the user
     * chooses to continue configuring the device, {@link BaseDevice.completeDiscovery} will be called.
     *
     * @param {BaseEngine} engine - the shared Almond engine initializing this device
     * @param {Object} publicData - protocol specific data that is public (e.g. Bluetooth UUIDs)
     * @param {Object} privateData - protocol specific data that is specific to the device and
     *                               private to the user (e.g. Bluetooth HW address)
     * @return {BaseDevice} the new, partially initialized device instance
    */
    static async loadFromDiscovery(engine : BaseEngine,
                                   publicData : { [key : string] : unknown },
                                   privateData : { [key : string] : unknown }) : Promise<BaseDevice> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Complete configuring this device from local discovery.
     *
     * The implementation should use the passed delegate to interact with the user, for
     * example to have the user enter or confirm a PIN code shown on the device, or have
     * the user press a physical button on the device.
     *
     * Note this is an instance method, not a static method. It will be called
     * on the partially initialized instance returned by {@link BaseDevice.loadFromDiscovery}.
     *
     *
     * @param {ConfigDelegate} delegate - a delegate object to interact with the user and complete configuration
     * @return {BaseDevice} the device instance itself (`this`)
    */
    async completeDiscovery(delegate : ConfigDelegate) : Promise<this> {
        throw new Error('not implemented');
    }

    /* istanbul ignore next */
    /**
     * Update the device state based on local discovery data.
     *
     * @param {Object} privateData - protocol specific data that is specific to the device and
     *                               private to the user (e.g. Bluetooth HW address)
     */
    async updateFromDiscovery(privateData : { [key : string] : unknown }) : Promise<void> {
        // nothing to do here, subclasses can override if they support discovery
    }

    /**
     * Update the device state when the OAuth 2.0 token is refreshed.
     *
     * The default implementation will store the new access token and refresh token,
     * and ignore other fields.
     *
     * @param {string} accessToken - the new access token
     * @param {string} refreshToken - the new refresh token, if one is provided
     * @param {Object} extraData - the whole response to the OAuth token request
     */
    async updateOAuth2Token(accessToken : string, refreshToken : string|undefined, extraData : { [key : string] : unknown }) : Promise<void> {
        this.state.accessToken = accessToken;
        // if the refresh token is single use, we will get a new one when we use it
        if (refreshToken)
            this.state.refreshToken = refreshToken;

        this.stateChanged();
    }

    /* istanbul ignore next */
    /**
     * Configure this device using interactive (voice-based) configuration.
     *
     * The implementation should use the passed delegate to interact with the user, for
     * example to have the user enter a password or answer a question.
     *
     * @param {BaseEngine} engine - the shared Almond engine initializing this device
     * @param {ConfigDelegate} delegate - a delegate object to interact with the user and complete configuration
     * @return {BaseDevice} the fully configured device instance
     */
    static async loadInteractively(engine : BaseEngine, delegate : ConfigDelegate) : Promise<BaseDevice> {
        // if not overridden, call the compatibility method
        // NOTE: we're in a static method, so "this" refers to the class, not the instance!
        return this.configureFromAlmond(engine, delegate);
    }

    /**
     * @deprecated
     */
    static async configureFromAlmond(engine : BaseEngine, delegate : ConfigDelegate) : Promise<BaseDevice> {
        throw new Error('not implemented');
    }

    /**
     * The Thingpedia "kind" (unique class ID) of this device.
     *
     */
    get kind() : string {
        return this.state.kind;
    }

    // obsolete, do not use
    get metadata() : BaseDevice.DeviceMetadata {
        const constructor = this.constructor as typeof BaseDevice;
        return constructor.metadata;
    }

    /**
     * Access the current platform for this device instance.
     *
     */
    get platform() : BasePlatform {
        return this._engine.platform;
    }

    /**
     * Access the current engine for this device instance.
     */
    get engine() : BaseEngine {
        return this._engine;
    }

    /**
     * Notify that the device's serialized state changed.
     *
     * This should be called after any change to {@link BaseDevice.state} meant to be
     * persisted on disk.
     *
     * @fires BaseDevice.state-changed
     */
    protected stateChanged() : void {
        /**
         * Reports a change in device state.
         *
         * @event BaseDevice.state-changed
         */
        this.emit('state-changed');
    }

    /**
     * Replace the current serialized state of the device.
     *
     * This method is called by Almond as part of the device synchronization logic.
     * It can also be called by device implementations if the state changes outside of the class.
     *
     * @param {Object} state - the new state
     */
    updateState(state : BaseDevice.DeviceState) : void {
        // nothing to do here by default, except for updating the state
        // pointer
        // subclasses can override if they need to do anything about it
        this.state = state;
    }

    /**
     * Serialize the device to disk
     *
     * @return {Object} the serialized device representation
     */
    serialize() : BaseDevice.DeviceState {
        if (!this.state)
            throw new Error('Device lost state, cannot serialize');
        return this.state;
    }

    /**
     * Start a device.
     *
     * This method will be called when the device is loaded (after configuration
     * or when the engine is restarted).
     */
    async start() : Promise<void> {
        // nothing to do here, subclasses can override if they need to
    }

    /**
     * Stop a device.
     *
     * This method will be called when the device is unloaded, either because the
     * user removed it or because the engine is terminating.
     */
    async stop() : Promise<void> {
        // nothing to do here, subclasses can override if they need to
    }

    /**
     * The identity of the engine that owns this device.
     *
     * This property is relevant when a device can only be accessed through
     * local connection. In that case, the device should store the {@link BaseEngine.ownTier}
     * property of the engine that configured the device. To ensure that,
     * the tier must be stored to the persistent state.
     * This ensures that the device will not be initialized if its configuration
     * is copied to a different engine, e.g. through a synchronization mechanism.
     *
     * If this property is not equal to {@link BaseEngine.ownTier} for the current
     * engine, the {@link start} and {@link stop} methods will not be called.
     *
     * This property defaults to {@link Tier.GLOBAL} which means the device will
     * be initialized in all engines.
     */
    get ownerTier() : string {
        return Tier.GLOBAL;
    }

    /**
     * Perform an async check to verify if the device is available
     * (i.e., on, working, reachable on the local network, etc.)
     *
     * @return {BaseDevice.Availability} whether the device is available or not.
     */
    async checkAvailable() : Promise<Availability> {
        return Availability.UNKNOWN;
    }

    /**
     * Check if this device implements the given Thingpedia kind.
     *
     * A device can have multiple kinds at the same time.
     *
     * You should not override this function. Instead, you should mark your
     * ThingTalk class as extending another ThingTalk class.
     * If you do override it, you must chain up to handle the default kinds.
     *
     * @param {string} kind - the Thingpedia kind to check
     * @return {boolean} whether the device implements this interface or not
     */
    hasKind(kind : string) : boolean {
        const constructor = this.constructor as typeof BaseDevice;
        if (kind === 'data-source')
            return constructor.metadata.category === 'data';
        if (kind === 'online-account')
            return constructor.metadata.category === 'online';
        if (kind === 'thingengine-system')
            return constructor.metadata.category === 'system';

        return kind === this.kind ||
            (constructor.metadata.types.indexOf(kind) >= 0);
    }

    /* istanbul ignore next */
    /**
     * Request an extension interface for this device.
     *
     * Extension interfaces allow to provide additional device and
     * vendor specific capabilities that do not map to ThingTalk functions.
     * If the interface is not recognized this method returns null
     * (up to the caller to check it or just use it blindly and explode).
     *
     * Note that all method calls on the interface might fail if
     * the device is not available (but are not required to).
     * Also note that this method might return null if the device
     * exists but not locally (e.g., it's a bluetooth device but we're
     * running on a cloud platform).
     *
     * Well-known extension interfaces are "subdevices" (for device
     * collections) and "messaging" (for the messaging system)
     *
     * @param {string} name - the interface name
     * @return {any} the extension implementation
     */
    queryInterface<T extends keyof BaseDevice.QueryInterfaceMap>(name : T) : BaseDevice.QueryInterfaceMap[T]|null {
        // no extension interfaces for this device class
        return null;
    }
}

namespace BaseDevice {

/**
 * An interface to read/write a state associated with each subscription
 * to events.
 */
export interface TriggerState {
    get(k : 'last-poll') : number|undefined;
    get(k : string) : unknown|undefined;

    set(k : 'last-poll', v : number) : void;
    set(k : string, v : unknown) : void;
}

// This unfortunately doesn't document well until Typescript 4.4 where
// we'll be able to write "[query : `get_${string}`]" directly inside
// the BaseDevice class
/**
 * The type of a device defined in Thingpedia.
 *
 * @deprecated Do not use this type. It exists for documentation only.
 *   It will be removed when TypeScript 4.4 is available for TypeDoc.
 */
export type Device = BaseDevice & {
    /**
     * Query methods.
     *
     * Each device class defines a method for each query declared in
     * the manifest. The name of the JS method is `get_` followed by
     * the query name.
     */
    [query in `get_${string}`] : (params : Record<string, any>, hints : ThingTalk.Runtime.CompiledQueryHints, env : ThingTalk.ExecEnvironment) => AsyncIterator<Record<string, any>>|Promise<Iterator<Record<string, any>>>|Iterator<Record<string, any>>;
} & {
    /**
    * Subscribe methods.
    *
    * Each device class optionally defines a subscribe method for each
    * query declared in the manifest. The name of the JS method is
    * `subscribe_` followed by the query name.
    *
    *
    */
    [query in `subscribe_${string}`] : (params : Record<string, any>, state : TriggerState, hints : ThingTalk.Runtime.CompiledQueryHints, env : ThingTalk.ExecEnvironment) => stream.Readable;
} & {
    /**
     * Action methods.
     *
     * Each device class defines a method for each action declared in
     * the manifest. The name of the JS method is `do_` followed by
     * the query name.
     */
    [action in `do_${string}`] : (params : Record<string, any>, hints : ThingTalk.Runtime.CompiledQueryHints, env : ThingTalk.ExecEnvironment) => Promise<Record<string, any>>|Record<string, any>|void;
};

/**
 * The type of a class object (constructor function) defined for a Thingpedia device.
 *
 * This is the type of the constructor of any concrete subclass of {@link BaseDevice},
 * and the type of the object that should be default exported from the entrypoint of
 * a Thingpedia device package.
 */
export type DeviceClass<T extends BaseDevice> = Omit<typeof BaseDevice, "new"> & {
    new(engine : BaseEngine, state : any) : T;

    subdevices ?: Record<string, DeviceClass<BaseDevice>>;
};

export interface DeviceState {
    kind : string;
    accessToken ?: string;
    refreshToken ?: string;
    [key : string] : unknown;
}

export interface DeviceMetadata {
    kind : string;
    name : string;
    description : string;
    version : number;
    category : 'online'|'physical'|'data'|'system';
    types : string[];
    params : { [key : string] : unknown };
    auth : {
        type : string;
        client_id ?: string;
        client_secret ?: string;
    };
}


/**
 * Extension interface exposed by devices that support OAuth.
 *
 * The HTTP helpers can use this interface to authenticate
 * and refresh the credentials automatically.
 */
export interface OAuth2Interface {
    accessToken : string;
    refreshToken ?: string;
    refreshCredentials() : Promise<void>;
}

export interface NotificationInterface {
    notify(data : {
        appId : string;
        icon : string|null;
        raw : Record<string, unknown>;
        type : string;
        formatted : any[]
    }) : Promise<void>;

    notifyError(data : {
        appId : string;
        icon : string|null;
        error : Error
    }) : Promise<void>;
}

export interface QueryInterfaceMap {
    'subdevices' : ObjectSet.Base<BaseDevice>;
    'messaging' : Messaging;
    'oauth2' : OAuth2Interface;
    'notifications' : NotificationInterface;
    'dialogue-handler' : DialogueHandler<any, any>;
    [key : string] : unknown;
}

export type URLQuery = { [key : string] : string|string[]|undefined };
export type SessionMap = { [key : string] : string };

/**
 * Deprecated interface for legacy OAuth configuration paths.
 *
 * @deprecated
 */
export interface HTTPRequest {
    query : URLQuery;
    session : SessionMap;
    httpVersion : string;
    headers : string[],
    rawHeaders : string[],
    method : 'GET';
    url : string;
}

/**
 * Legacy OAuth configuration path.
 *
 * @deprecated
 */
export interface LegacyRunOAuth2 {
    (this : typeof BaseDevice, engine : BaseEngine, req : null) : [string, SessionMap];
    (this : typeof BaseDevice, engine : BaseEngine, req : HTTPRequest) : Promise<BaseDevice|null>;
}

}
export default BaseDevice;
