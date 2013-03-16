// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.Asserter');

goog.require('goog.array');
goog.require('goog.asserts');


/**
 * @param {string} name
 * @constructor
 */
pics3.encoder.Asserter = function(name) {
  /** @type {string} */
  this.name = name;
};

/**
 * @param {!goog.array.ArrayLike} arr1
 * @param {!goog.array.ArrayLike} arr2
 * @param {string} msg
 */
pics3.encoder.Asserter.prototype.assertArraysEqual = function(arr1, arr2, msg) {
  this.assert(goog.array.equals(arr1, arr2), msg);
};

/**
 * @param {*} val1
 * @param {*} val2
 * @param {string} msg
 */
pics3.encoder.Asserter.prototype.assertEquals = function(val1, val2, msg) {
  this.assert(val1 == val2, msg + ": " + val1 + ' != ' + val2);
};

/**
 * @param {*} cond
 * @param {string} msg
 */
pics3.encoder.Asserter.prototype.assert = function(cond, msg) {
  if (!cond) {
    throw pics3.encoder.encodeError.newError(this.name + ': ' + msg);
  }
};
