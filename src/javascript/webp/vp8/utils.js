// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.Utils');

var WEBP_ABI_IS_INCOMPATIBLE;

goog.scope(function() {

/**
 * @param {number} v
 * @param {number} m
 * @param {number} M
 * @return {number}
 */
CLIP = function(v, m, M) {
  return v < m ? m : v > M ? M : v;
};

/**
 * @param {number} b
 * @return {number}
 */
BIAS = function(b) {
  return (b) << (QFIX - 8);
};

// Fun fact: this is the _only_ line where we're actually being lossy and
// discarding bits.
/**
 * @param {number} n
 * @param {number} iQ
 * @param {number} B
 * @return {number}
 */
QUANTDIV = function(n, iQ, B) {
  return parseInt((n * iQ + B) >> QFIX);
};

/**
 * @param {Uint8Array} arr
 * @param {number} pos
 * @return {Uint8Array}
 */
Uint8Repoint = function(arr, pos) {
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
Uint8GetNeg = function(arr, pos) {
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
Uint32GetNeg = function(arr, pos) {
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
Uint8SetNeg = function(arr, pos, value) {
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
Uint32SetNeg = function(arr, pos, value) {
  var newByteOffset = arr.byteOffset + pos * 4;
  if (newByteOffset < 0) {
    throw Error('Out of bounds: ' + newByteOffset + ' < 0');
  }
  new Uint32Array(arr.buffer, newByteOffset, 1)[0] = value;
};

// Macro to check ABI compatibility (same major revision number)
WEBP_ABI_IS_INCOMPATIBLE = function(a, b) {
  return parseInt(a >> 8) != parseInt(b >> 8);
};

var YUV_FIX = 16;                // fixed-point precision
var YUV_RANGE_MIN = -227;        // min value of r/g/b output
var YUV_RANGE_MAX = 256 + 226;   // max value of r/g/b output

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
VP8ClipUV = function(v) {
  v = (v + (257 << (YUV_FIX + 2 - 1))) >> (YUV_FIX + 2);
  return ((v & ~0xff) == 0) ? v : (v < 0) ? 0 : 255;
};

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @return {number}
 */
VP8RGBToY = function(r, g, b) {
  var kRound = (1 << (YUV_FIX - 1)) + (16 << YUV_FIX);
  var luma = 16839 * r + 33059 * g + 6420 * b;
  return (luma + kRound) >> YUV_FIX;  // no need to clip
};

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @return {number}
 */
VP8RGBToU = function(r, g, b) {
  return VP8ClipUV(-9719 * r - 19081 * g + 28800 * b);
};

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @return {number}
 */
VP8RGBToV = function(r, g, b) {
  return VP8ClipUV(+28800 * r - 24116 * g - 4684 * b);
};


/*
// Colorspaces
// Note: the naming describes the byte-ordering of packed samples in memory.
// For instance, MODE_BGRA relates to samples ordered as B,G,R,A,B,G,R,A,...
// Non-capital names (e.g.:MODE_Argb) relates to pre-multiplied RGB channels.
// RGB-565 and RGBA-4444 are also endian-agnostic and byte-oriented.
typedef enum { MODE_RGB = 0, MODE_RGBA = 1,
               MODE_BGR = 2, MODE_BGRA = 3,
               MODE_ARGB = 4, MODE_RGBA_4444 = 5,
               MODE_RGB_565 = 6,
               // RGB-premultiplied transparent modes (alpha value is preserved)
               MODE_rgbA = 7,
               MODE_bgrA = 8,
               MODE_Argb = 9,
               MODE_rgbA_4444 = 10,
               // YUV modes must come after RGB ones.
               MODE_YUV = 11, MODE_YUVA = 12,  // yuv 4:2:0
               MODE_LAST = 13
             } WEBP_CSP_MODE;


// VP8 related constants.
#define VP8_MAX_PARTITION_SIZE  (1 << 24)   // max size for token partition

// VP8L related constants.
#define VP8L_SIGNATURE_SIZE          1      // VP8L signature size.
#define VP8L_MAGIC_BYTE              0x2f   // VP8L signature byte.
#define VP8L_IMAGE_SIZE_BITS         14     // Number of bits used to store
                                            // width and height.
#define VP8L_VERSION_BITS            3      // 3 bits reserved for version.
#define VP8L_VERSION                 0      // version 0
#define VP8L_FRAME_HEADER_SIZE       5      // Size of the VP8L frame header.

#define MAX_PALETTE_SIZE             256
#define MAX_CACHE_BITS               11
#define HUFFMAN_CODES_PER_META_CODE  5
#define ARGB_BLACK                   0xff000000

#define DEFAULT_CODE_LENGTH          8
#define MAX_ALLOWED_CODE_LENGTH      15

#define NUM_LITERAL_CODES            256
#define NUM_LENGTH_CODES             24
#define NUM_DISTANCE_CODES           40
#define CODE_LENGTH_CODES            19

#define MIN_HUFFMAN_BITS             2  // min number of Huffman bits
#define MAX_HUFFMAN_BITS             9  // max number of Huffman bits

#define TRANSFORM_PRESENT            1  // The bit to be written when next data
                                        // to be read is a transform.
#define NUM_TRANSFORMS               4  // Maximum number of allowed transform
                                        // in a bitstream.
typedef enum {
  PREDICTOR_TRANSFORM      = 0,
  CROSS_COLOR_TRANSFORM    = 1,
  SUBTRACT_GREEN           = 2,
  COLOR_INDEXING_TRANSFORM = 3
} VP8LImageTransformType;

// Alpha related constants.
#define ALPHA_HEADER_LEN            1
#define ALPHA_NO_COMPRESSION        0
#define ALPHA_LOSSLESS_COMPRESSION  1
#define ALPHA_PREPROCESSED_LEVELS   1

// Mux related constants.
#define CHUNK_SIZE_BYTES   4     // Size needed to store chunk's size.
#define FRAME_CHUNK_SIZE   15    // Size of a FRM chunk.
#define LOOP_CHUNK_SIZE    2     // Size of a LOOP chunk.
#define TILE_CHUNK_SIZE    6     // Size of a TILE chunk.
#define VP8X_CHUNK_SIZE    10    // Size of a VP8X chunk.

#define TILING_FLAG_BIT    0x01  // Set if tiles are possibly used.
#define ANIMATION_FLAG_BIT 0x02  // Set if some animation is expected
#define ICC_FLAG_BIT       0x04  // Whether ICC is present or not.
#define METADATA_FLAG_BIT  0x08  // Set if some META chunk is possibly present.
#define ALPHA_FLAG_BIT     0x10  // Should be same as the ALPHA_FLAG in mux.h
#define ROTATION_FLAG_BITS 0xe0  // all 3 bits for rotation + symmetry

#define MAX_CANVAS_SIZE     (1 << 24)    // 24-bit max for VP8X width/height.
#define MAX_IMAGE_AREA      (1ULL << 32) // 32-bit max for width x height.
#define MAX_LOOP_COUNT      (1 << 16)    // maximum value for loop-count
#define MAX_DURATION        (1 << 24)    // maximum duration
#define MAX_POSITION_OFFSET (1 << 24)    // maximum frame/tile x/y offset

// Maximum chunk payload is such that adding the header and padding won't
// overflow a uint32_t.
#define MAX_CHUNK_PAYLOAD (~0U - CHUNK_HEADER_SIZE - 1)
*/

});
