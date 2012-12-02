// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.File');

goog.require('goog.Disposable');
goog.require('goog.asserts');


/**
 * @constructor
 * @extends {goog.Disposable}
 */
pics3.loader.File = function() {
};
goog.inherits(pics3.loader.File, goog.Disposable);

/**
 * @return {goog.async.Deferred} producing {!pics3.loader.FileResult}
 */
pics3.loader.File.prototype.loadAsync = goog.abstractMethod;
