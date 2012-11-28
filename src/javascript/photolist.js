// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.PhotoList');

goog.require('goog.Disposable');
goog.require('goog.asserts');


/**
 * @extends {goog.Disposable}
 * @constructor
 */
pics3.PhotoList = function() {
  goog.base(this);

  /** @type {!Array.<!pics3.Photo>} */
  this.photos = [];
};
goog.inherits(pics3.PhotoList, goog.Disposable);

/** @param {!pics3.Photo} photo */
pics3.PhotoList.prototype.add = function(photo) {
  this.photos.push(photo);
};

/** @return {number} */
pics3.PhotoList.prototype.getLength = function() {
  return this.photos.length;
};

/**
 * @param {number} index
 * @return {!pics3.Photo}
 */
pics3.PhotoList.prototype.get = function(index) {
  goog.asserts.assert(index < this.photos.length && index >= 0);
  return this.photos[index];
};

/** @override */
pics3.PhotoList.prototype.disposeInternal = function() {
  goog.disposeAll(this.photos);
  this.photos = [];
  goog.base(this, 'disposeInternal');
};
