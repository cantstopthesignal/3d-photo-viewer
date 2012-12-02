// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.FileResult');

goog.require('goog.Disposable');
goog.require('goog.asserts');


/**
 * @param {!ArrayBuffer} buffer
 * @param {string=} opt_mimeType
 * @param {string=} opt_name
 * @constructor
 */
pics3.loader.FileResult = function(buffer, opt_mimeType, opt_name) {
  /** @type {!ArrayBuffer} */
  this.buffer = buffer;

  /** @type {?string} */
  this.mimeType = opt_mimeType || null;

  /** @type {?string} */
  this.name = opt_name || null;
};