// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.File');

goog.require('goog.asserts');
goog.require('goog.events.EventTarget');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.loader.File = function() {
  goog.base(this);
};
goog.inherits(pics3.loader.File, goog.events.EventTarget);

/**
 * @return {goog.async.Deferred} producing {!pics3.loader.FileResult}
 */
pics3.loader.File.prototype.loadAsync = goog.abstractMethod;
