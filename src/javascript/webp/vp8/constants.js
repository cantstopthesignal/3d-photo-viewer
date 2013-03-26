// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.constants');


goog.scope(function() {

var constants = webp.vp8.constants;

constants.BPS = 16;   // this is the common stride
var BPS = constants.BPS;

constants.VP8_FRAME_HEADER_SIZE = 10;  // Size of the frame header within VP8 data.
constants.VP8_MAX_PARTITION0_SIZE = 1 << 19;  // max size of mode partition
constants.VP8_SIGNATURE = 0x9d012a;    // Signature in VP8 data.

constants.TAG_SIZE = 4;     // Size of a chunk tag (e.g. "VP8L").
constants.RIFF_HEADER_SIZE = 12;    // Size of the RIFF header ("RIFFnnnnWEBP").
constants.CHUNK_HEADER_SIZE = 8;     // Size of a chunk header.

constants.WEBP_ENCODER_ABI_VERSION = 0x0200;  // MAJOR(8b) + MINOR(8b)
constants.NUM_TYPES = 4;   // 0: i16-AC,  1: i16-DC,  2:chroma-AC,  3:i4-AC
constants.NUM_BANDS = 8;
constants.NUM_CTX = 3;
constants.NUM_PROBAS = 11;

constants.WEBP_MAX_DIMENSION = 16383;

constants.NUM_MB_SEGMENTS = 4;
constants.MAX_NUM_PARTITIONS = 8;
constants.MAX_LF_LEVELS = 64;      // Maximum loop filter level
constants.MAX_VARIABLE_LEVEL = 67;  // last (inclusive) level with variable cost
constants.MAX_LEVEL = 2048;  // max level (note: max codable is 2047 + 67)

constants.Y_SIZE = BPS * 16;
constants.UV_SIZE = BPS * 8;
constants.YUV_SIZE = constants.Y_SIZE + constants.UV_SIZE;
constants.PRED_SIZE = 6 * 16 * BPS + 12 * BPS;

constants.Y_OFF = 0;
constants.U_OFF = constants.Y_SIZE;
constants.V_OFF = constants.U_OFF + 8;

constants.QFIX = 17;

constants.MAX_COST = 0x7fffffffffffff;

// Layout of prediction blocks
// intra 16x16
constants.I16DC16 = 0 * 16 * BPS;
constants.I16TM16 = 1 * 16 * BPS;
constants.I16VE16 = 2 * 16 * BPS;
constants.I16HE16 = 3 * 16 * BPS;

// intra prediction modes
constants.B_DC_PRED = 0;   // 4x4 modes
constants.B_TM_PRED = 1;
constants.B_VE_PRED = 2;
constants.B_HE_PRED = 3;
constants.B_RD_PRED = 4;
constants.B_VR_PRED = 5;
constants.B_LD_PRED = 6;
constants.B_VL_PRED = 7;
constants.B_HD_PRED = 8;
constants.B_HU_PRED = 9;
constants.NUM_BMODES = constants.B_HU_PRED + 1 - constants.B_DC_PRED;  // = 10

// Luma16 or UV modes
constants.DC_PRED = constants.B_DC_PRED;
constants.V_PRED = constants.B_VE_PRED;
constants.H_PRED = constants.B_HE_PRED;
constants.TM_PRED = constants.B_TM_PRED;

// chroma 8x8, two U/V blocks side by side (hence: 16x8 each)
constants.C8DC8 = 4 * 16 * BPS;
constants.C8TM8 = 4 * 16 * BPS + 8 * BPS;
constants.C8VE8 = 5 * 16 * BPS;
constants.C8HE8 = 5 * 16 * BPS + 8 * BPS;

// intra 4x4
constants.I4DC4 = 6 * 16 * BPS +  0;
constants.I4TM4 = 6 * 16 * BPS +  4;
constants.I4VE4 = 6 * 16 * BPS +  8;
constants.I4HE4 = 6 * 16 * BPS + 12;
constants.I4RD4 = 6 * 16 * BPS + 4 * BPS +  0;
constants.I4VR4 = 6 * 16 * BPS + 4 * BPS +  4;
constants.I4LD4 = 6 * 16 * BPS + 4 * BPS +  8;
constants.I4VL4 = 6 * 16 * BPS + 4 * BPS + 12;
constants.I4HD4 = 6 * 16 * BPS + 8 * BPS +  0;
constants.I4HU4 = 6 * 16 * BPS + 8 * BPS +  4;
constants.I4TMP = 6 * 16 * BPS + 8 * BPS +  8;

// size of histogram used by CollectHistogram.
constants.MAX_COEFF_THRESH = 64;

constants.SKIP_PROBA_THRESHOLD = 250;  // value below which using skip_proba is OK.

//------------------------------------------------------------------------------
//Form the predictions in cache

//Must be ordered using {DC_PRED, TM_PRED, V_PRED, H_PRED} as index

/** @type {!Array.<number>} */
constants.VP8UVModeOffsets = [
  constants.C8DC8, constants.C8TM8, constants.C8VE8, constants.C8HE8
];

//Must be indexed using {B_DC_PRED -> B_HU_PRED} as index
/** @type {!Array.<number>} */
constants.VP8I4ModeOffsets = [
  constants.I4DC4, constants.I4TM4, constants.I4VE4, constants.I4HE4,
  constants.I4RD4, constants.I4VR4, constants.I4LD4, constants.I4VL4,
  constants.I4HD4, constants.I4HU4
];

/** @type {!Array.<number>} */
constants.VP8I16ModeOffsets = [
  constants.I16DC16, constants.I16TM16, constants.I16VE16,
  constants.I16HE16
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
constants.VP8Scan = new Int32Array([
  // Luma
  0 +  0 * BPS,  4 +  0 * BPS, 8 +  0 * BPS, 12 +  0 * BPS,
  0 +  4 * BPS,  4 +  4 * BPS, 8 +  4 * BPS, 12 +  4 * BPS,
  0 +  8 * BPS,  4 +  8 * BPS, 8 +  8 * BPS, 12 +  8 * BPS,
  0 + 12 * BPS,  4 + 12 * BPS, 8 + 12 * BPS, 12 + 12 * BPS,

  0 + 0 * BPS,   4 + 0 * BPS, 0 + 4 * BPS,  4 + 4 * BPS,    // U
  8 + 0 * BPS,  12 + 0 * BPS, 8 + 4 * BPS, 12 + 4 * BPS     // V
]);

});
