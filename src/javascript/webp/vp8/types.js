// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.types');

goog.require('webp.vp8.constants');


goog.scope(function() {

var constants = webp.vp8.constants;
var vp8 = webp.vp8;

/** @enum {number} */
vp8.types.WebPEncCSP = {
  // chroma sampling
  WEBP_YUV420: 0,   // 4:2:0
  WEBP_YUV422: 1,   // 4:2:2
  WEBP_YUV444: 2,   // 4:4:4
  WEBP_YUV400: 3,   // grayscale
  WEBP_CSP_UV_MASK: 3,   // bit-mask to get the UV sampling factors
  // alpha channel variants
  WEBP_YUV420A: 4,
  WEBP_YUV422A: 5,
  WEBP_YUV444A: 6,
  WEBP_YUV400A: 7,   // grayscale + alpha
  WEBP_CSP_ALPHA_BIT: 4   // bit that is set if alpha is present
};

// Encoding error conditions.
/** @enum {number} */
vp8.types.WebPEncodingError = {
  VP8_ENC_OK: 0,
  VP8_ENC_ERROR_OUT_OF_MEMORY: 1,            // memory error allocating objects
  VP8_ENC_ERROR_BITSTREAM_OUT_OF_MEMORY: 2,  // memory error while flushing bits
  VP8_ENC_ERROR_NULL_PARAMETER: 3,           // a pointer parameter is NULL
  VP8_ENC_ERROR_INVALID_CONFIGURATION: 4,    // configuration is invalid
  VP8_ENC_ERROR_BAD_DIMENSION: 5,            // picture has invalid width/height
  VP8_ENC_ERROR_PARTITION0_OVERFLOW: 6,      // partition is bigger than 512k
  VP8_ENC_ERROR_PARTITION_OVERFLOW: 7,       // partition is bigger than 16M
  VP8_ENC_ERROR_BAD_WRITE: 8,                // error while flushing bytes
  VP8_ENC_ERROR_FILE_TOO_BIG: 9,             // file is bigger than 4G
  VP8_ENC_ERROR_USER_ABORT: 10,              // abort request by user
  VP8_ENC_ERROR_LAST: 11                     // list terminator. always last.
};

});
