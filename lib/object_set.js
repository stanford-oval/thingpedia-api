// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Q = require('q');
var events = require('events');

// The abstract interface that all ObjectSets must conform to
//
// Some ObjectSets are read-only, in which case the mutator methods will fail

// we cannot use a true class for RefCounted, we need to do a hybrid, because
// one cannot inherit with a babel-generated class from a true class,
// and some interfaces in thingpedia-common-devices need ObjectSet (and they
// use babel)
// this was generated with babeljs.io

var ObjectSet = function (_events$EventEmitter) {
    _inherits(ObjectSet, _events$EventEmitter);

    function ObjectSet() {
        _classCallCheck(this, ObjectSet);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ObjectSet).apply(this, arguments));
    }

    _createClass(ObjectSet, [{
        key: 'objectAdded',

        // events: object-added(object), object-removed(object)

        value: function objectAdded(o) {
            this.emit('object-added', o);
        }
    }, {
        key: 'objectRemoved',
        value: function objectRemoved(o) {
            this.emit('object-removed', o);
        }
    }, {
        key: 'values',
        value: function values() {
            throw new Error('Not Implemented');
        }
    }, {
        key: 'start',
        value: function start() {
            throw new Error('Not Implemented');
        }
    }, {
        key: 'stop',
        value: function stop() {
            throw new Error('Not Implemented');
        }
    }]);

    return ObjectSet;
}(events.EventEmitter);

var SimpleObjectSet = function (_ObjectSet) {
    _inherits(SimpleObjectSet, _ObjectSet);

    function SimpleObjectSet() {
        _classCallCheck(this, SimpleObjectSet);

        var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(SimpleObjectSet).call(this));

        _this2._objects = new Map();
        return _this2;
    }

    _createClass(SimpleObjectSet, [{
        key: 'values',
        value: function values() {
            return Array.from(this._objects.values());
        }
    }, {
        key: 'start',
        value: function start() {}
    }, {
        key: 'stop',
        value: function stop() {}
    }, {
        key: 'addOne',
        value: function addOne(o) {
            var _this3 = this;

            var promise = Q(o);
            return promise.then(function (o) {
                if (o === null) return;
                if (_this3._objects.has(o.uniqueId)) return;
                _this3._objects.set(o.uniqueId, o);
                _this3.objectAdded(o);
            });
        }
    }, {
        key: 'addMany',
        value: function addMany(objs) {
            var _this4 = this;

            return Q.all(objs.map(function (o) {
                return _this4.addOne(o);
            }));
        }
    }, {
        key: 'removeOne',
        value: function removeOne(o) {
            if (!this._objects.has(o.uniqueId)) return;
            this._objects.delete(o.uniqueId);
            this.objectRemoved(o);
        }
    }, {
        key: 'getById',
        value: function getById(id) {
            return this._objects.get(id);
        }
    }, {
        key: 'removeById',
        value: function removeById(id) {
            if (!this._objects.has(id)) return;
            var old = this._objects.get(id);
            this._objects.delete(id);
            this.objectRemoved(old);
        }
    }, {
        key: 'removeIf',
        value: function removeIf(predicate) {
            var removed = [];
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this._objects[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var entry = _step.value;

                    var key = entry[0];
                    var value = entry[1];
                    if (predicate(value)) {
                        removed.push(value);
                        this._objects.delete(key);
                        this.objectRemoved(value);
                    }
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            return removed;
        }
    }, {
        key: 'removeAll',
        value: function removeAll() {
            var removed = this.values();
            this._objects.clear();
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = removed[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var o = _step2.value;

                    this.objectRemoved(o);
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }

            return removed;
        }
    }]);

    return SimpleObjectSet;
}(ObjectSet);

module.exports = {
    Simple: SimpleObjectSet,
    Base: ObjectSet
};
