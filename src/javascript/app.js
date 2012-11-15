// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.App');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.dom');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.App = function() {
  /** @type {goog.events.EventHandler} */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);
};
goog.inherits(pics3.App, goog.events.EventTarget);

/** @type {goog.debug.Logger} */
pics3.App.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.App');

pics3.App.prototype.start = function() {
  this.appEl_ = goog.dom.getElementByClass('app');
  goog.asserts.assert(this.appEl_);
};

/** @override */
pics3.App.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};
