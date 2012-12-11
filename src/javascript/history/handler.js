// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.history.Handler');

goog.require('goog.asserts');
goog.require('goog.events.EventTarget');
goog.require('pics3.history.Token');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.history.Handler = function() {
  goog.base(this);
};
goog.inherits(pics3.history.Handler, goog.events.EventTarget);

/**
 * @param {!goog.Uri} uri
 * @return {?pics3.history.Token}
 */
pics3.history.Handler.prototype.processUri = goog.abstractMethod;

/**
 * @param {!pics3.history.Token} token
 */
pics3.history.Handler.prototype.handleToken = goog.abstractMethod;
