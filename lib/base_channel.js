// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const RefCounted = require('./ref_counted');

// THIS ENTIRE CLASS IS DEPRECATED, IT EXISTS ONLY FOR TRANSITIONAL PURPOSES
// WHILE WE UPDATE THE THINGPEDIA INTERFACES
//
// The rest follows here:
//
// Notes on compatibility:
//
// For compat reasons, this class is shared between Actions, old-style Queries,
// old-style Triggers and new-style Trigger/Query hybrids
//
// The public API for channels is:
// - setState(): associate a channel with a channel state after construction
//   (to bypass constructors that don't chain-up properly)
// - open()/close(): resource mgmt
// - subscribeEvent(): start polling for notification (or subscribe to webhooks/etc)
// - unsubscribeEvent(): stop polling
// - on('data'), on('error'), on('end'): receive polling results
// - invokeQuery(): one-shot poll for data
// - sendEvent(): invoke action (write data)
//
// An action will implement sendEvent without chaining up
//
// A new style custom trigger/query will implement invokeQuery(), _doSubscribeEvent(),
// _doUnsubscribeEvent(); it will take care of emitting 'data', 'error' and
// 'end' as appropriate
// subscribeEvent()/unsubscribeEvent() do minimal bookkeeping to count subscriptions
// and then call _doSubscribeEvent() and _doUnsubscribeEvent()
//
// A new style custom polling trigger/query will implement invokeQuery() and _onTick()
// (eg using HttpPollingTrigger, but also overriding invokeQuery()). BaseChannel
// provides the rest of the functionality. The need to implement both is so that
// proper filtering can be applied to the result of _onTick(). If no filtering is
// desired, it can be treated as an old-style query.
//
// An old style query implements invokeQuery(). It does not implement _onTick().
// subscribeEvent() is implemented by BaseChannel, using a default polling implementation.
//
// An old style PollingTrigger implements _onTick() and not invokeQuery(). It
// calls to emitEvent() with the result of polling.
// invokeQuery() is implemented by BaseChannel by calling into _onTick() and capturing
// the last event that was emitted
//
// An old style custom trigger sets up its own polling/push inside _doOpen(). It implements
// neither _onTick nor invokeQuery. It calls emitEvent() with the result of the first
// polling *before* returning _doOpen().
// invokeQuery() is implemented by BaseChannel by capturing the last event that was emitted
// (which normally would be fresh from a call to _doOpen())
// subscribeEvent() and unsubscribeEvent() do nothing, because the trigger emits events
// as long as it is open

module.exports = class BaseChannel extends RefCounted {
    constructor() {
        super();
        this._init.apply(this, arguments);

        console.log('BaseChannel is deprecated. Switch to V2 modules instead.');
    }

    _init(engine, state, device, params) {
        if (typeof state !== 'object' || state === null ||
            typeof state.get !== 'function' ||
            typeof state.set !== 'function') {
            params = device;
            device = state;
            state = null;
        }
        this.engine = engine;
        this.device = device;
        this.state = state;
        this._params = params;
        this._subscriptions = 0;
        this._event = null;

        // PollingTrigger implementation
        // precise defaults to false for old-style triggers, and true for everything
        // else
        this.precise = this.invokeQuery !== BaseChannel.prototype.invokeQuery;
        this.interval = 1800000; // 30 minutes
        this._timeout = null;

        // you must set this to something other than undefined if you're
        // doing something server-side with the params, and it must
        // be a unique string for all channels of the given type
        this.filterString = undefined;

        // don't set this, it is set automatically by ChannelFactory
        this.uniqueId = undefined;
        this.name = undefined;
        this.channelType = undefined;
    }


    sendEvent(object) {
        throw new Error('sendEvent is not implemented by this channel');
    }

    setState(state) {
        this.state = state;
    }

    invokeQuery(params) {
        if (this._onTick !== BaseChannel.prototype._onTick) {
            // this is a PollingTrigger implementation (eg HttpPollingTrigger)
            return this._onTick().then(() => {
                return this._event ? [this._event] : [];
            });
        } else {
            // for compatibility with old code that implemented triggers with emitEvent,
            // invokeQuery just returns the last value that was passed to emitEvent()
            // (which triggers are expected to call before returning from open())
            return this._event ? [this._event] : [];
        }
    }

    subscribeEvent() {
        this._subscriptions++;
        if (this._subscriptions === 1)
            this._doSubscribeEvent();
    }
    _doSubscribeEvent() {
        if (this._onTick !== BaseChannel.prototype._onTick ||
            this.invokeQuery !== BaseChannel.prototype.invokeQuery) {
            // old-style polling trigger, new-style polling trigger/query, or
            // old-style query
            this.startPolling();
            if (!this.precise)
                Promise.resolve(this._onTick()).catch((e) => this.emit('error', e));
        } else if (this._event) {
            // for compatibility with the "initial sampling" behavior
            // that some old-style triggers expect
            this.emit('data', this._event);
        }
    }
    unsubscribeEvent() {
        this._subscriptions--;
        if (this._subscriptions === 0)
            return this._doUnsubscribeEvent();
    }
    _doUnsubscribeEvent() {
        if (this._onTick !== BaseChannel.prototype._onTick ||
            this.invokeQuery !== BaseChannel.prototype.invokeQuery)
            this.stopPolling();
    }

    // PollingTrigger implementation
    _onTick() {
        if (this.invokeQuery !== BaseChannel.prototype.invokeQuery) {
            return Promise.resolve(this.invokeQuery(this._params || [])).then((rows) => {
                rows.forEach((row) => {
                    this.emit('data', row);
                });
            });
        } else {
            throw new TypeError('Must override _onTick for a polling trigger/query');
        }
    }
    stopPolling() {
        if (this._timeout === null)
            return;
        if (this.precise)
            clearTimeout(this._timeout);
        else
            clearInterval(this._timeout);
        this._timeout = null;
    }
    startPolling() {
        if (this.precise) {
            this._nextTimeout();
        } else {
            if (this.interval >= 1) {
                this._timeout = setInterval(function() {
                    Promise.resolve(this._onTick()).catch((e) => this.emit('error', e));
                }.bind(this), this.interval);
            }
        }
    }
    _nextTick() {
        var lastPoll = this.state.get('last-poll');
        var now = Date.now();
        var nextPoll;
        if (lastPoll === undefined)
            nextPoll = now;
        else
            nextPoll = lastPoll + this.interval;
        return Math.max(1, nextPoll - now);
    }
    _nextTimeout() {
        this._timeout = setTimeout(function() {
            this.state.set('last-poll', Date.now());
            Promise.resolve(this._onTick()).catch((e) => this.emit('error', e));
            this._nextTimeout();
        }.bind(this), this._nextTick());
    }

    // old API, exists for compatibility only
    get event() {
        return this._event;
    }
    emitEvent(object) {
        this._event = object;
        if (this._subscriptions > 0)
            this.emit('data', object);
    }
};
