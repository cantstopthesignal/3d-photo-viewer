// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.BaseParser');

goog.require('goog.array');
goog.require('goog.Disposable');
goog.require('pics3.parser.parseError');


/**
 * @param {string} name
 * @extends {goog.Disposable}
 * @constructor
 */
pics3.parser.BaseParser = function(name) {
  goog.base(this);

  /** @type {string} */
  this.name = name;
};
goog.inherits(pics3.parser.BaseParser, goog.Disposable);

/**
 * @param {Array} bytes
 * @param {string=} opt_msg
 */
pics3.parser.BaseParser.prototype.dumpBytes = function(bytes, opt_msg) {
  var formattedBytes = [];
  for (var i = 0; i < bytes.length; i++) {
    formattedBytes.push(bytes[i].toString(16));
  }
  window.console.log(this.name + ': ' + (opt_msg || ''), formattedBytes);
};

/** @protected */
pics3.parser.BaseParser.prototype.assertArraysEqual = function(arr1, arr2,
    msg) {
  this.assert(goog.array.equals(arr1, arr2), msg);
};

/** @protected */
pics3.parser.BaseParser.prototype.assertEquals = function(val1, val2,
    msg) {
  this.assert(val1 == val2, msg + ": " + val1 + ' != ' + val2);
};

/** @protected */
pics3.parser.BaseParser.prototype.assert = function(cond, msg) {
  if (!cond) {
    throw pics3.parser.parseError.newError(this.name + ': ' + msg);
  }
};
