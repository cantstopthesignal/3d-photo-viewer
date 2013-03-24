// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.Constants');

var VP8_FRAME_HEADER_SIZE = 10;  // Size of the frame header within VP8 data.
var VP8_MAX_PARTITION0_SIZE = 1 << 19;  // max size of mode partition
var VP8_SIGNATURE = 0x9d012a;    // Signature in VP8 data.

var TAG_SIZE = 4;     // Size of a chunk tag (e.g. "VP8L").
var RIFF_HEADER_SIZE = 12;    // Size of the RIFF header ("RIFFnnnnWEBP").
var CHUNK_HEADER_SIZE = 8;     // Size of a chunk header.

var WEBP_ENCODER_ABI_VERSION = 0x0200;  // MAJOR(8b) + MINOR(8b)
var NUM_TYPES = 4;   // 0: i16-AC,  1: i16-DC,  2:chroma-AC,  3:i4-AC
var NUM_BANDS = 8;
var NUM_CTX = 3;
var NUM_PROBAS = 11;

var WEBP_MAX_DIMENSION = 16383;

var NUM_MB_SEGMENTS = 4;
var MAX_NUM_PARTITIONS = 8;
var MAX_LF_LEVELS = 64;      // Maximum loop filter level
var MAX_VARIABLE_LEVEL = 67;  // last (inclusive) level with variable cost
var MAX_LEVEL = 2048;  // max level (note: max codable is 2047 + 67)

var BPS = 16;   // this is the common stride
var Y_SIZE = BPS * 16;
var UV_SIZE = BPS * 8;
var YUV_SIZE = Y_SIZE + UV_SIZE;
var PRED_SIZE = 6 * 16 * BPS + 12 * BPS;

var Y_OFF = 0;
var U_OFF = Y_SIZE;
var V_OFF = U_OFF + 8;

var QFIX = 17;

var MAX_COST = 0x7fffffffffffff;

// Layout of prediction blocks
// intra 16x16
var I16DC16 = 0 * 16 * BPS;
var I16TM16 = 1 * 16 * BPS;
var I16VE16 = 2 * 16 * BPS;
var I16HE16 = 3 * 16 * BPS;

// intra prediction modes
var B_DC_PRED = 0;   // 4x4 modes
var B_TM_PRED = 1;
var B_VE_PRED = 2;
var B_HE_PRED = 3;
var B_RD_PRED = 4;
var B_VR_PRED = 5;
var B_LD_PRED = 6;
var B_VL_PRED = 7;
var B_HD_PRED = 8;
var B_HU_PRED = 9;
var NUM_BMODES = B_HU_PRED + 1 - B_DC_PRED;  // = 10

// Luma16 or UV modes
var DC_PRED = B_DC_PRED;
var V_PRED = B_VE_PRED;
var H_PRED = B_HE_PRED;
var TM_PRED = B_TM_PRED;

// chroma 8x8, two U/V blocks side by side (hence: 16x8 each)
var C8DC8 = 4 * 16 * BPS;
var C8TM8 = 4 * 16 * BPS + 8 * BPS;
var C8VE8 = 5 * 16 * BPS;
var C8HE8 = 5 * 16 * BPS + 8 * BPS;

// intra 4x4
var I4DC4 = 6 * 16 * BPS +  0;
var I4TM4 = 6 * 16 * BPS +  4;
var I4VE4 = 6 * 16 * BPS +  8;
var I4HE4 = 6 * 16 * BPS + 12;
var I4RD4 = 6 * 16 * BPS + 4 * BPS +  0;
var I4VR4 = 6 * 16 * BPS + 4 * BPS +  4;
var I4LD4 = 6 * 16 * BPS + 4 * BPS +  8;
var I4VL4 = 6 * 16 * BPS + 4 * BPS + 12;
var I4HD4 = 6 * 16 * BPS + 8 * BPS +  0;
var I4HU4 = 6 * 16 * BPS + 8 * BPS +  4;
var I4TMP = 6 * 16 * BPS + 8 * BPS +  8;

// size of histogram used by CollectHistogram.
var MAX_COEFF_THRESH = 64;

var SKIP_PROBA_THRESHOLD = 250;  // value below which using skip_proba is OK.

//------------------------------------------------------------------------------
//Form the predictions in cache

//Must be ordered using {DC_PRED, TM_PRED, V_PRED, H_PRED} as index

/** @type {!Array.<number>} */
var VP8UVModeOffsets = [
  C8DC8, C8TM8, C8VE8, C8HE8
];

//Must be indexed using {B_DC_PRED -> B_HU_PRED} as index
/** @type {!Array.<number>} */
var VP8I4ModeOffsets = [
  I4DC4, I4TM4, I4VE4, I4HE4, I4RD4, I4VR4, I4LD4, I4VL4, I4HD4, I4HU4
];

/** @type {!Array.<number>} */
var VP8I16ModeOffsets = [
  I16DC16, I16TM16, I16VE16, I16HE16
];

//------------------------------------------------------------------------------
//Quantize

//Layout:
//+----+
//|YYYY| 0
//|YYYY| 4
//|YYYY| 8
//|YYYY| 12
//+----+
//|UUVV| 16
//|UUVV| 20
//+----+

/** @type {Int32Array} */
var VP8Scan = new Int32Array([
  // Luma
  0 +  0 * BPS,  4 +  0 * BPS, 8 +  0 * BPS, 12 +  0 * BPS,
  0 +  4 * BPS,  4 +  4 * BPS, 8 +  4 * BPS, 12 +  4 * BPS,
  0 +  8 * BPS,  4 +  8 * BPS, 8 +  8 * BPS, 12 +  8 * BPS,
  0 + 12 * BPS,  4 + 12 * BPS, 8 + 12 * BPS, 12 + 12 * BPS,

  0 + 0 * BPS,   4 + 0 * BPS, 0 + 4 * BPS,  4 + 4 * BPS,    // U
  8 + 0 * BPS,  12 + 0 * BPS, 8 + 4 * BPS, 12 + 4 * BPS     // V
]);
