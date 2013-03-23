// Copyright cantstopthesignals@gmail.com

goog.provide('webp.util');


/**
 * @param {!Blob} blob
 * @return {string}
 */
webp.util.createObjectUrl = function(blob) {
  var URL = window.URL || window.webkitURL;
  return URL.createObjectURL(blob);
};

/**
 * @param {ArrayBuffer} buffer
 * @return {string}
 */
webp.util.arrayBufferToBase64 = function(buffer) {
  return btoa(String.fromCharCode.apply(null, new Uint16Array(buffer)));
};

/**
 * @param {string} str
 * @return {ArrayBuffer}
 */
webp.util.base64ToArrayBuffer = function(str) {
  var buf = new Uint16Array(new ArrayBuffer(str.length * 2));
  for (var i = 0, len = str.length; i < len; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return buf.buffer;
};
