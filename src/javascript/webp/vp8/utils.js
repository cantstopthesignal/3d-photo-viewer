// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.utils');

goog.require('webp.vp8.constants');


goog.scope(function() {

var constants = webp.vp8.constants;
var vp8 = webp.vp8;

/**
 * @param {number} v
 * @param {number} m
 * @param {number} M
 * @return {number}
 */
vp8.utils.CLIP = function(v, m, M) {
  return v < m ? m : v > M ? M : v;
};

/**
 * @param {number} b
 * @return {number}
 */
vp8.utils.BIAS = function(b) {
  return (b) << (constants.QFIX - 8);
};

// Fun fact: this is the _only_ line where we're actually being lossy and
// discarding bits.
/**
 * @param {number} n
 * @param {number} iQ
 * @param {number} B
 * @return {number}
 */
vp8.utils.QUANTDIV = function(n, iQ, B) {
  return parseInt((n * iQ + B) >> constants.QFIX, 10);
};

/**
 * @param {Uint8Array} arr
 * @param {number} pos
 * @return {Uint8Array}
 */
vp8.utils.Uint8Repoint = function(arr, pos) {
  if (pos == 0) {
    return arr;
  } else if (pos > 0) {
    return arr.subarray(pos);
  } else {
    var newByteOffset = arr.byteOffset + pos;
    if (newByteOffset < 0) {
      throw Error('Out of bounds: ' + newByteOffset + ' < 0');
    }
    return new Uint8Array(arr.buffer, newByteOffset);
  }
};

/**
 * @param {Uint8Array} arr
 * @param {number} pos
 * @return {number}
 */
vp8.utils.Uint8GetNeg = function(arr, pos) {
  var newByteOffset = arr.byteOffset + pos;
  if (newByteOffset < 0) {
    throw Error('Out of bounds: ' + newByteOffset + ' < 0');
  }
  return new Uint8Array(arr.buffer, newByteOffset, 1)[0];
};

/**
 * @param {Uint32Array} arr
 * @param {number} pos
 * @return {number}
 */
vp8.utils.Uint32GetNeg = function(arr, pos) {
  var newByteOffset = arr.byteOffset + pos * 4;
  if (newByteOffset < 0) {
    throw Error('Out of bounds: ' + newByteOffset + ' < 0');
  }
  return new Uint32Array(arr.buffer, newByteOffset, 1)[0];
};

/**
 * @param {Uint8Array} arr
 * @param {number} pos
 * @param {number} value
 */
vp8.utils.Uint8SetNeg = function(arr, pos, value) {
  var newByteOffset = arr.byteOffset + pos;
  if (newByteOffset < 0) {
    throw Error('Out of bounds: ' + newByteOffset + ' < 0');
  }
  new Uint8Array(arr.buffer, newByteOffset, 1)[0] = value;
};

/**
 * @param {Uint32Array} arr
 * @param {number} pos
 * @param {number} value
 */
vp8.utils.Uint32SetNeg = function(arr, pos, value) {
  var newByteOffset = arr.byteOffset + pos * 4;
  if (newByteOffset < 0) {
    throw Error('Out of bounds: ' + newByteOffset + ' < 0');
  }
  new Uint32Array(arr.buffer, newByteOffset, 1)[0] = value;
};

// Macro to check ABI compatibility (same major revision number)
vp8.utils.WEBP_ABI_IS_INCOMPATIBLE = function(a, b) {
  return parseInt(a >> 8, 10) != parseInt(b >> 8, 10);
};

vp8.utils.YUV_FIX = 16;                // fixed-point precision
vp8.utils.YUV_RANGE_MIN = -227;        // min value of r/g/b output
vp8.utils.YUV_RANGE_MAX = 256 + 226;   // max value of r/g/b output

//------------------------------------------------------------------------------
// RGB -> YUV conversion
// The exact naming is Y'CbCr, following the ITU-R BT.601 standard.
// More information at: http://en.wikipedia.org/wiki/YCbCr
// Y = 0.2569 * R + 0.5044 * G + 0.0979 * B + 16
// U = -0.1483 * R - 0.2911 * G + 0.4394 * B + 128
// V = 0.4394 * R - 0.3679 * G - 0.0715 * B + 128
// We use 16bit fixed point operations.
/**
 * @param {number} v
 * @return {number}
 */
vp8.utils.VP8ClipUV = function(v) {
  v = (v + (257 << (vp8.utils.YUV_FIX + 2 - 1))) >> (vp8.utils.YUV_FIX + 2);
  return ((v & ~0xff) == 0) ? v : (v < 0) ? 0 : 255;
};

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @return {number}
 */
vp8.utils.VP8RGBToY = function(r, g, b) {
  var kRound = (1 << (vp8.utils.YUV_FIX - 1)) + (16 << vp8.utils.YUV_FIX);
  var luma = 16839 * r + 33059 * g + 6420 * b;
  return (luma + kRound) >> vp8.utils.YUV_FIX;  // no need to clip
};

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @return {number}
 */
vp8.utils.VP8RGBToU = function(r, g, b) {
  return vp8.utils.VP8ClipUV(-9719 * r - 19081 * g + 28800 * b);
};

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @return {number}
 */
vp8.utils.VP8RGBToV = function(r, g, b) {
  return vp8.utils.VP8ClipUV(+28800 * r - 24116 * g - 4684 * b);
};

});
