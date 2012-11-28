// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.PhotoLoader');

goog.require('goog.Disposable');
goog.require('goog.asserts');


/**
 * @constructor
 * @extends {goog.Disposable}
 */
pics3.PhotoLoader = function() {
};
goog.inherits(pics3.PhotoLoader, goog.Disposable);

/** @return {goog.async.Deferred} */
pics3.PhotoLoader.prototype.loadAsync = goog.abstractMethod;
