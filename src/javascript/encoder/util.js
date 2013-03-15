// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.util');

goog.require('goog.array');
goog.require('goog.asserts');


/**
 * @param {!Blob} blob
 * @return {string}
 */
pics3.encoder.util.createObjectUrl = function(blob) {
  var URL = window.URL || window.webkitURL;
  return URL.createObjectURL(blob);
};
