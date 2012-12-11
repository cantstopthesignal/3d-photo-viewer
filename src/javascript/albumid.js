// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.AlbumId');

goog.require('goog.asserts');


/**
 * @constructor
 */
pics3.AlbumId = function() {
};

/**
 * @param {!pics3.AlbumId} other
 * @return {boolean}
 */
pics3.AlbumId.prototype.equals = function(other) {
  return this === other;
};
