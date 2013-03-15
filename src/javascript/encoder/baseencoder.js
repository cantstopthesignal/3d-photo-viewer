// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.BaseEncoder');

goog.require('goog.array');
goog.require('goog.Disposable');
goog.require('pics3.encoder.encodeError');


/**
 * @param {string} name
 * @extends {goog.Disposable}
 * @constructor
 */
pics3.encoder.BaseEncoder = function(name) {
  goog.base(this);

  /** @type {string} */
  this.name = name;
};
goog.inherits(pics3.encoder.BaseEncoder, goog.Disposable);

/**
 * @param {Array} bytes
 * @param {string=} opt_msg
 */
pics3.encoder.BaseEncoder.dumpBytes = function(bytes, opt_msg) {
  var formattedBytes = [];
  for (var i = 0; i < bytes.length; i++) {
    formattedBytes.push(bytes[i].toString(16));
  }
  var str = pics3.parser.util.codeArrayToStr(bytes);
  window.console.log((opt_msg || 'pics3.encoder.BaseEncoder: '),
      formattedBytes, str);
};

/**
 * @param {Array} bytes
 * @param {string=} opt_msg
 */
pics3.encoder.BaseEncoder.prototype.dumpBytes = function(bytes, opt_msg) {
  var msg = this.name + ': ' + (opt_msg || '');
  return pics3.encoder.BaseEncoder.dumpBytes(bytes, msg);
};

/**
 * @param {!Array} arr1
 * @param {!Array} arr2
 * @param {string} msg
 * @protected
 */
pics3.encoder.BaseEncoder.prototype.assertArraysEqual = function(arr1, arr2,
    msg) {
  this.assert(goog.array.equals(arr1, arr2), msg);
};

/**
 * @param {*} val1
 * @param {*} val2
 * @param {string} msg
 * @protected
 */
pics3.encoder.BaseEncoder.prototype.assertEquals = function(val1, val2,
    msg) {
  this.assert(val1 == val2, msg + ": " + val1 + ' != ' + val2);
};

/**
 * @param {*} cond
 * @param {string} msg
 * @protected
 */
pics3.encoder.BaseEncoder.prototype.assert = function(cond, msg) {
  if (!cond) {
    throw pics3.encoder.encodeError.newError(this.name + ': ' + msg);
  }
};
