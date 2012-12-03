// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.Album');

goog.require('goog.Disposable');
goog.require('goog.asserts');


/**
 * @constructor
 * @extends {goog.Disposable}
 */
pics3.loader.Album = function() {
};
goog.inherits(pics3.loader.Album, goog.Disposable);

/**
 * @return {goog.async.Deferred} producing {!pics3.loader.AlbumResult}
 */
pics3.loader.Album.prototype.loadAsync = goog.abstractMethod;
