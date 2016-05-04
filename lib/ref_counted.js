// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Q = require('q');
const events = require('events');

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// we cannot use a true class for RefCounted, we need to do a hybrid, because
// one cannot inherit with lang.Class from a true class
// this was generated with babeljs.io

var RefCounted = function (_events$EventEmitter) {
    _inherits(RefCounted, _events$EventEmitter);

    function RefCounted() {
        _classCallCheck(this, RefCounted);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(RefCounted).call(this));

        _this.setMaxListeners(0);

        _this._useCount = 0;
        _this._openPromise = null;
        _this._closePromise = null;
        return _this;
    }

    _createClass(RefCounted, [{
        key: '_doOpen',
        value: function _doOpen() {
            return Q();
        }
    }, {
        key: '_doClose',
        value: function _doClose() {
            return Q();
        }
    }, {
        key: 'open',
        value: function open() {
            // if closing, wait to fully close then reopen
            if (this._closePromise) {
                return this._closePromise.then(function () {
                    return this.open();
                }.bind(this));
            }

            this._useCount++;
            if (this._useCount == 1) {
                // first open
                if (this._openPromise) throw new Error('bookkeeping error');
                return this._openPromise = Q(this._doOpen()).finally(function () {
                    this._openPromise = null;
                }.bind(this));
            } else if (this._openPromise) {
                // opening
                return this._openPromise;
            } else {
                // opened
                return Q();
            }
        }
    }, {
        key: 'close',
        value: function close() {
            // if opening, wait to fully open then close
            if (this._openPromise) {
                return this._openPromise.then(function () {
                    return this.close();
                }.bind(this));
            }

            this._useCount--;
            if (this._useCount < 0) throw new Error('invalid close');
            if (this._useCount == 0) {
                // last close
                if (this._closePromise) throw new Error('bookkeeping error');
                return this._closePromise = Q(this._doClose()).finally(function () {
                    this._closePromise = null;
                }.bind(this));
            } else if (this._closePromise) {
                // closing
                return this._closePromise;
            } else {
                // closed
                return Q();
            }
        }
    }]);

    return RefCounted;
}(events.EventEmitter);

module.exports = RefCounted;
