// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.BaseEncoder');

goog.require('goog.array');
goog.require('goog.Disposable');
goog.require('pics3.encoder.Asserter');
goog.require('pics3.encoder.encodeError');
goog.require('pics3.encoder.util');


/**
 * @param {string} name
 * @extends {goog.Disposable}
 * @constructor
 */
pics3.encoder.BaseEncoder = function(name) {
  goog.base(this);

  /** @type {string} */
  this.name = name;

  /** @type {!pics3.encoder.Asserter} */
  this.asserter_ = new pics3.encoder.Asserter(this.name);
};
goog.inherits(pics3.encoder.BaseEncoder, goog.Disposable);

/**
 * @param {Array} bytes
 * @param {string=} opt_msg
 */
pics3.encoder.BaseEncoder.prototype.dumpBytes = function(bytes, opt_msg) {
  var msg = this.name + ': ' + (opt_msg || '');
  return pics3.encoder.util.dumpBytes(bytes, msg);
};

/**
 * @param {!goog.array.ArrayLike} arr1
 * @param {!goog.array.ArrayLike} arr2
 * @param {string} msg
 * @protected
 */
pics3.encoder.BaseEncoder.prototype.assertArraysEqual = function(arr1, arr2,
    msg) {
  this.asserter_.assertArraysEqual(arr1, arr2, msg);
};

/**
 * @param {*} val1
 * @param {*} val2
 * @param {string} msg
 * @protected
 */
pics3.encoder.BaseEncoder.prototype.assertEquals = function(val1, val2, msg) {
  this.asserter_.assertEquals(val1, val2, msg)
};

/**
 * @param {*} cond
 * @param {string} msg
 * @protected
 */
pics3.encoder.BaseEncoder.prototype.assert = function(cond, msg) {
  this.asserter_.assert(cond, msg);
};
