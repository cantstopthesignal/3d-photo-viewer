// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.util');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('pics3.parser.util');


/**
 * @param {!Blob} blob
 * @return {string}
 */
pics3.encoder.util.createObjectUrl = function(blob) {
  var URL = window.URL || window.webkitURL;
  return URL.createObjectURL(blob);
};

/**
 * @param {Array} bytes
 * @param {string=} opt_msg
 */
pics3.encoder.util.dumpBytes = function(bytes, opt_msg) {
  var formattedBytes = [];
  for (var i = 0; i < bytes.length; i++) {
    formattedBytes.push(bytes[i].toString(16));
  }
  var str = pics3.parser.util.codeArrayToStr(bytes);
  window.console.log((opt_msg || 'pics3.encoder.BaseEncoder: '),
      formattedBytes, str);
};
