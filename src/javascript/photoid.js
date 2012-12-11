// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.PhotoId');

goog.require('goog.asserts');


/**
 * @param {string} id
 * @constructor
 */
pics3.PhotoId = function(id) {
  /** @type {string} */
  this.id = id;
};

/**
 * @param {!pics3.PhotoId} other
 * @return {boolean}
 */
pics3.PhotoId.prototype.equals = function(other) {
  return this.id == other.id;
};
