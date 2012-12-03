// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.AlbumResult');

goog.require('goog.Disposable');
goog.require('goog.asserts');


/**
 * @param {!Array.<!pics3.Photo>} photos
 * @param {string=} opt_name
 * @constructor
 */
pics3.loader.AlbumResult = function(photos, opt_name) {
  /** @type {!Array.<!pics3.Photo>} */
  this.photos = photos;

  /** @type {?string} */
  this.name = opt_name || null;
};
