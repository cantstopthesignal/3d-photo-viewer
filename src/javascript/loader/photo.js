// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.Photo');

goog.require('goog.Disposable');
goog.require('goog.asserts');


/**
 * @constructor
 * @extends {goog.Disposable}
 */
pics3.loader.Photo = function() {
};
goog.inherits(pics3.loader.Photo, goog.Disposable);

/** @return {goog.async.Deferred} */
pics3.loader.Photo.prototype.loadAsync = goog.abstractMethod;
