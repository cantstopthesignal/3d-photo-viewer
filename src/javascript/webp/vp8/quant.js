// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.quant');

goog.require('webp.vp8.constants');
goog.require('webp.vp8.debug');
goog.require('webp.vp8.dsp');


goog.scope(function() {

var constants = webp.vp8.constants;
var debug = webp.vp8.debug;
var vp8 = webp.vp8;

var Y_OFF = constants.Y_OFF;
var U_OFF = constants.U_OFF;
var NUM_MB_SEGMENTS = constants.NUM_MB_SEGMENTS;

/** @param {webp.vp8.iterator.VP8EncIterator} it */
vp8.quant.VP8MakeLuma16Preds = function(it) {
  var enc = it.enc;
  var left = it.x ? enc.yLeft : null;
  var top = it.y ? enc.yTop.subarray(it.x * 16) : null;
  vp8.dsp.VP8EncPredLuma16(it.yuvP, left, top);
};

vp8.quant.MID_ALPHA = 64;      // neutral value for susceptibility
vp8.quant.MIN_ALPHA = 30;      // lowest usable value for susceptibility
vp8.quant.MAX_ALPHA = 100;     // higher meaninful value for susceptibility

vp8.quant.SNS_TO_DQ = 0.9;     // Scaling constant between the sns value and the QP
                         // power-law modulation. Must be strictly less than 1.

vp8.quant.kZigzag = new Uint8Array([
  0, 1, 4, 8, 5, 2, 3, 6, 9, 12, 13, 10, 7, 11, 14, 15
]);

vp8.quant.kDcTable = new Uint8Array([
  4,     5,   6,   7,   8,   9,  10,  10,
  11,   12,  13,  14,  15,  16,  17,  17,
  18,   19,  20,  20,  21,  21,  22,  22,
  23,   23,  24,  25,  25,  26,  27,  28,
  29,   30,  31,  32,  33,  34,  35,  36,
  37,   37,  38,  39,  40,  41,  42,  43,
  44,   45,  46,  46,  47,  48,  49,  50,
  51,   52,  53,  54,  55,  56,  57,  58,
  59,   60,  61,  62,  63,  64,  65,  66,
  67,   68,  69,  70,  71,  72,  73,  74,
  75,   76,  76,  77,  78,  79,  80,  81,
  82,   83,  84,  85,  86,  87,  88,  89,
  91,   93,  95,  96,  98, 100, 101, 102,
  104, 106, 108, 110, 112, 114, 116, 118,
  122, 124, 126, 128, 130, 132, 134, 136,
  138, 140, 143, 145, 148, 151, 154, 157
]);

vp8.quant.kAcTable = new Uint16Array([
  4,     5,   6,   7,   8,   9,  10,  11,
  12,   13,  14,  15,  16,  17,  18,  19,
  20,   21,  22,  23,  24,  25,  26,  27,
  28,   29,  30,  31,  32,  33,  34,  35,
  36,   37,  38,  39,  40,  41,  42,  43,
  44,   45,  46,  47,  48,  49,  50,  51,
  52,   53,  54,  55,  56,  57,  58,  60,
  62,   64,  66,  68,  70,  72,  74,  76,
  78,   80,  82,  84,  86,  88,  90,  92,
  94,   96,  98, 100, 102, 104, 106, 108,
  110, 112, 114, 116, 119, 122, 125, 128,
  131, 134, 137, 140, 143, 146, 149, 152,
  155, 158, 161, 164, 167, 170, 173, 177,
  181, 185, 189, 193, 197, 201, 205, 209,
  213, 217, 221, 225, 229, 234, 239, 245,
  249, 254, 259, 264, 269, 274, 279, 284
]);

vp8.quant.kAcTable2 = new Uint16Array([
  8,     8,   9,  10,  12,  13,  15,  17,
  18,   20,  21,  23,  24,  26,  27,  29,
  31,   32,  34,  35,  37,  38,  40,  41,
  43,   44,  46,  48,  49,  51,  52,  54,
  55,   57,  58,  60,  62,  63,  65,  66,
  68,   69,  71,  72,  74,  75,  77,  79,
  80,   82,  83,  85,  86,  88,  89,  93,
  96,   99, 102, 105, 108, 111, 114, 117,
  120, 124, 127, 130, 133, 136, 139, 142,
  145, 148, 151, 155, 158, 161, 164, 167,
  170, 173, 176, 179, 184, 189, 193, 198,
  203, 207, 212, 217, 221, 226, 230, 235,
  240, 244, 249, 254, 258, 263, 268, 274,
  280, 286, 292, 299, 305, 311, 317, 323,
  330, 336, 342, 348, 354, 362, 370, 379,
  385, 393, 401, 409, 416, 424, 432, 440
]);

// TODO(skal): tune more. Coeff thresholding?
vp8.quant.kBiasMatrices = [  // [3] = [luma-ac,luma-dc,chroma]
  [ 96, 96, 96, 96,
    96, 96, 96, 96,
    96, 96, 96, 96,
    96, 96, 96, 96 ],
  [ 96, 96, 96, 96,
    96, 96, 96, 96,
    96, 96, 96, 96,
    96, 96, 96, 96 ],
  [ 96, 96, 96, 96,
    96, 96, 96, 96,
    96, 96, 96, 96,
    96, 96, 96, 96 ]
];

// Sharpening by (slightly) raising the hi-frequency coeffs (only for trellis).
// Hack-ish but helpful for mid-bitrate range. Use with care.
vp8.quant.kFreqSharpening = new Uint8Array([
  0,  30, 60, 90,
  30, 60, 90, 90,
  60, 90, 90, 90,
  90, 90, 90, 90
]);

//------------------------------------------------------------------------------
// Initialize quantization parameters in VP8Matrix

// Returns the average quantizer
/**
 * @param {webp.vp8.encode.VP8Matrix} m
 * @param {number} type
 * @return {number}
 */
vp8.quant.ExpandMatrix = function(m, type) {
  var sum = 0;
  for (var i = 2; i < 16; ++i) {
    m.q[i] = m.q[1];
  }
  for (var i = 0; i < 16; ++i) {
    var j = vp8.quant.kZigzag[i];
    var bias = vp8.quant.kBiasMatrices[type][j];
    m.iq[j] = (1 << constants.QFIX) / m.q[j];
    m.bias[j] = vp8.utils.BIAS(bias);
    // TODO(skal): tune kCoeffThresh[]
    m.zthresh[j] = ((256 - bias) * m.q[j] + 127) >> 8;
    m.sharpen[j] = (vp8.quant.kFreqSharpening[j] * m.q[j]) >> 11;
    sum += m.q[j];
  }
  return (sum + 8) >> 4;
};

/** @param {webp.vp8.encode.VP8Encoder} enc */
vp8.quant.SetupMatrices = function(enc) {
  var numSegments = enc.segmentHdr.numSegments;
  for (var i = 0; i < numSegments; ++i) {
    var m = enc.dqm[i];
    var q = m.quant;
    m.y1.q[0] = vp8.quant.kDcTable[vp8.utils.CLIP(q + enc.dqY1Dc, 0, 127)];
    m.y1.q[1] = vp8.quant.kAcTable[vp8.utils.CLIP(q,              0, 127)];

    m.y2.q[0] = vp8.quant.kDcTable[ vp8.utils.CLIP(q + enc.dqY2Dc, 0, 127)] * 2;
    m.y2.q[1] = vp8.quant.kAcTable2[vp8.utils.CLIP(q + enc.dqY2Ac, 0, 127)];

    m.uv.q[0] = vp8.quant.kDcTable[vp8.utils.CLIP(q + enc.dqUvDc, 0, 117)];
    m.uv.q[1] = vp8.quant.kAcTable[vp8.utils.CLIP(q + enc.dqUvAc, 0, 127)];

    var q4  = vp8.quant.ExpandMatrix(m.y1, 0);
    var q16 = vp8.quant.ExpandMatrix(m.y2, 1);
    var quv = vp8.quant.ExpandMatrix(m.uv, 2);

    // TODO: Switch to kLambda*[] tables?
    {
      m.lambdaI4  = (3 * q4 * q4) >> 7;
      m.lambdaI16 = (3 * q16 * q16);
      m.lambdaUv  = (3 * quv * quv) >> 6;
      m.lambdaMode    = (1 * q4 * q4) >> 7;
      m.lambdaTrellisI4  = (7 * q4 * q4) >> 3;
      m.lambdaTrellisI16 = (q16 * q16) >> 2;
      m.lambdaTrellisUv  = (quv *quv) << 1;
      m.tlambda            = 0;
    }
  }
};

//------------------------------------------------------------------------------
// Initialize filtering parameters

/** @param {webp.vp8.encode.VP8Encoder} enc */
vp8.quant.SetupFilterStrength = function(enc) {
  for (var i = 0; i < NUM_MB_SEGMENTS; ++i) {
    enc.dqm[i].fstrength = 0;
  }
  // We record the initial strength (mainly for the case of 1-segment only).
  enc.filterHdr.level = 0;
  enc.filterHdr.simple = 1;
  enc.filterHdr.sharpness = 0;
};

//------------------------------------------------------------------------------

// Note: if you change the values below, remember that the max range
// allowed by the syntax for DQ_UV is [-16,16].
vp8.quant.MAX_DQ_UV = 6;
vp8.quant.MIN_DQ_UV = -4;

// We want to emulate jpeg-like behaviour where the expected "good" quality
// is around q=75. Internally, our "good" middle is around c=50. So we
// map accordingly using linear piece-wise function
/**
 * @param {number} q
 * @return {number}
 */
vp8.quant.QualityToCompression = function(q) {
  var c = q / 100.;
  return (c < 0.75) ? c * (2. / 3.) : 2. * c - 1.;
};

/**
 * @param {webp.vp8.encode.VP8Encoder} enc
 * @param {number} quality
 */
vp8.quant.VP8SetSegmentParams = function(enc, quality) {
  var numSegments = enc.config.segments;
  var amp = vp8.quant.SNS_TO_DQ * enc.config.snsStrength / 100. / 128.;
  var cBase = vp8.quant.QualityToCompression(quality);
  for (var i = 0; i < numSegments; ++i) {
    // The file size roughly scales as pow(quantizer, 3.). Actually, the
    // exponent is somewhere between 2.8 and 3.2, but we're mostly interested
    // in the mid-quant range. So we scale the compressibility inversely to
    // this power-law: quant ~= compression ^ 1/3. This law holds well for
    // low quant. Finer modelling for high-quant would make use of kAcTable[]
    // more explicitely.
    // Additionally, we modulate the base exponent 1/3 to accommodate for the
    // quantization susceptibility and allow denser segments to be quantized
    // more.
    var expn = (1. - amp * enc.dqm[i].alpha) / 3.;
    var c = Math.pow(cBase, expn);
    var q = parseInt(127. * (1. - c), 10);
    if (expn <= 0.) {
      throw Error('Invalid condition');
    }
    enc.dqm[i].quant = vp8.utils.CLIP(q, 0, 127);
  }

  // purely indicative in the bitstream (except for the 1-segment case)
  enc.baseQuant = enc.dqm[0].quant;

  // fill-in values for the unused segments (required by the syntax)
  for (var i = numSegments; i < NUM_MB_SEGMENTS; ++i) {
    enc.dqm[i].quant = enc.baseQuant;
  }

  // uv_alpha_ is normally spread around ~60. The useful range is
  // typically ~30 (quite bad) to ~100 (ok to decimate UV more).
  // We map it to the safe maximal range of MAX/MIN_DQ_UV for dq_uv.
  var dqUvAc = parseInt((enc.uvAlpha - vp8.quant.MID_ALPHA) * (vp8.quant.MAX_DQ_UV - vp8.quant.MIN_DQ_UV)
                          / (vp8.quant.MAX_ALPHA - vp8.quant.MIN_ALPHA), 10);
  // we rescale by the user-defined strength of adaptation
  dqUvAc = parseInt(dqUvAc * enc.config.snsStrength / 100, 10);
  // and make it safe.
  dqUvAc = vp8.utils.CLIP(dqUvAc, vp8.quant.MIN_DQ_UV, vp8.quant.MAX_DQ_UV);
  // We also boost the dc-uv-quant a little, based on sns-strength, since
  // U/V channels are quite more reactive to high quants (flat DC-blocks
  // tend to appear, and are displeasant).
  var dqUvDc = parseInt(-4 * enc.config.snsStrength / 100, 10);
  dqUvDc = vp8.utils.CLIP(dqUvDc, -15, 15);   // 4bit-signed max allowed

  enc.dqY1Dc = 0;       // TODO(skal): dq-lum
  enc.dqY2Dc = 0;
  enc.dqY2Ac = 0;
  enc.dqUvDc = dqUvDc;
  enc.dqUvAc = dqUvAc;

  vp8.quant.SetupMatrices(enc);

  vp8.quant.SetupFilterStrength(enc);   // initialize segments' filtering, eventually
};

/** @param {webp.vp8.iterator.VP8EncIterator} it */
vp8.quant.VP8MakeChroma8Preds = function(it) {
  var enc = it.enc;
  var left = it.x ? enc.uLeft : null;
  var top = it.y ? enc.uvTop.subarray(it.x * 16) : null;
  vp8.dsp.VP8EncPredChroma8(it.yuvP, left, top);
};

/** @param {webp.vp8.iterator.VP8EncIterator} it */
vp8.quant.VP8MakeIntra4Preds = function(it) {
  vp8.dsp.VP8EncPredLuma4(it.yuvP, it.i4Top);
};

//------------------------------------------------------------------------------
// Distortion measurement

// Init/Copy the common fields in score.
/** @param {webp.vp8.encode.VP8ModeScore} rd */
vp8.quant.InitScore = function(rd) {
  rd.D  = 0;
  rd.SD = 0;
  rd.R  = 0;
  rd.nz = 0;
  rd.score = constants.MAX_COST;
};

//------------------------------------------------------------------------------
// Performs: difference, transform, quantize, back-transform, add
// all at once. Output is the reconstructed block in *yuv_out, and the
// quantized levels in *levels.

/**
 * @param {webp.vp8.iterator.VP8EncIterator} it
 * @param {webp.vp8.encode.VP8ModeScore} rd
 * @param {Uint8Array} yuvOut
 * @param {number} mode
 */
vp8.quant.ReconstructIntra16 = function(it, rd, yuvOut, mode) {
  var enc = it.enc;
  var refOffset = constants.VP8I16ModeOffsets[mode];
  var dqm = enc.dqm[enc.mbInfo[it.mbIdx].segment];
  var nz = 0;
  var tmp = new Int16Array(16 * 16);
  var dcTmp = new Int16Array(16);

  for (var n = 0; n < 16; ++n) {
    vp8.dsp.VP8FTransform(
      it.yuvIn.subarray(Y_OFF + constants.VP8Scan[n]),
      it.yuvP.subarray(refOffset + constants.VP8Scan[n]),
      tmp.subarray(n * 16));
  }
  vp8.dsp.VP8FTransformWHT(tmp, dcTmp);
  nz |= vp8.dsp.VP8EncQuantizeBlock(dcTmp, rd.yDcLevels, 0, dqm.y2) << 24;

  for (var n = 0; n < 16; ++n) {
    nz |= vp8.dsp.VP8EncQuantizeBlock(tmp.subarray(n * 16), rd.yAcLevels[n], 1, dqm.y1) << n;
  }

  // Transform back
  vp8.dsp.VP8ITransformWHT(dcTmp, tmp);
  for (var n = 0; n < 16; n += 2) {
    vp8.dsp.VP8ITransform(
        it.yuvP.subarray(refOffset + constants.VP8Scan[n]),
        tmp.subarray(n * 16),
        yuvOut.subarray(constants.VP8Scan[n]), true);
  }

  return nz;
};

// static int ReconstructIntra4(VP8EncIterator* const it,
//                              int16_t levels[16],
//                              const uint8_t* const src,
//                              uint8_t* const yuv_out,
//                              int mode) {
/**
 * @param {webp.vp8.iterator.VP8EncIterator} it
 * @param {Int16Array} levels
 * @param {Uint8Array} src
 * @param {Uint8Array} yuvOut
 * @param {number} mode
 * @return {number}
 */
vp8.quant.ReconstructIntra4 = function(it, levels, src, yuvOut, mode) {
  var enc = it.enc;
  var ref = it.yuvP.subarray(constants.VP8I4ModeOffsets[mode]);
  var dqm = enc.dqm[enc.mbInfo[it.mbIdx].segment];
  var tmp = new Int16Array(16);

  vp8.dsp.VP8FTransform(src, ref, tmp);
  var nz = vp8.dsp.VP8EncQuantizeBlock(tmp, levels, 0, dqm.y1);
  vp8.dsp.VP8ITransform(ref, tmp, yuvOut, false);
  return nz;
};

/**
 * @param {webp.vp8.iterator.VP8EncIterator} it
 * @param {webp.vp8.encode.VP8ModeScore} rd
 * @param {Uint8Array} yuvOut
 * @param {number} mode
 * @return {number}
 */
vp8.quant.ReconstructUV = function(it, rd, yuvOut, mode) {
  var enc = it.enc;
  var refOffset = constants.VP8UVModeOffsets[mode];
  var dqm = enc.dqm[enc.mbInfo[it.mbIdx].segment];
  var nz = 0;
  var tmp = new Int16Array(8 * 16);

  for (var n = 0; n < 8; ++n) {
    vp8.dsp.VP8FTransform(
      it.yuvIn.subarray(U_OFF + constants.VP8Scan[16 + n]),
      it.yuvP.subarray(refOffset + constants.VP8Scan[16 + n]),
      tmp.subarray(16 * n));
  }
  for (var n = 0; n < 8; ++n) {
    nz |= vp8.dsp.VP8EncQuantizeBlock(tmp.subarray(16 * n), rd.uvLevels[n], 0, dqm.uv) << n;
  }
  for (var n = 0; n < 8; n += 2) {
    vp8.dsp.VP8ITransform(
      it.yuvP.subarray(refOffset + constants.VP8Scan[16 + n]),
      tmp.subarray(16 * n),
      yuvOut.subarray(constants.VP8Scan[16 + n]), true);
  }
  return (nz << 16);
};

//------------------------------------------------------------------------------
// Final reconstruction and quantization.

/**
 * @param {webp.vp8.iterator.VP8EncIterator} it
 * @param {webp.vp8.encode.VP8ModeScore} rd
 */
vp8.quant.SimpleQuantize = function(it, rd) {
  var enc = it.enc;
  var i16 = (enc.mbInfo[it.mbIdx].type == 1);
  var nz = 0;

  if (i16) {
    nz = vp8.quant.ReconstructIntra16(it, rd, it.yuvOut.subarray(Y_OFF), it.preds[0]);
  } else {
    vp8.iterator.VP8IteratorStartI4(it);
    do {
      var mode = it.preds[(it.i4 & 3) + (it.i4 >> 2) * enc.predsW];
      var src = it.yuvIn.subarray(Y_OFF + constants.VP8Scan[it.i4]);
      var dst = it.yuvOut.subarray(Y_OFF + constants.VP8Scan[it.i4]);
      vp8.quant.VP8MakeIntra4Preds(it);
      nz |= vp8.quant.ReconstructIntra4(it, rd.yAcLevels[it.i4], src, dst, mode) << it.i4;
    } while (vp8.iterator.VP8IteratorRotateI4(it, it.yuvOut.subarray(Y_OFF)));
  }

  nz |= vp8.quant.ReconstructUV(it, rd, it.yuvOut.subarray(U_OFF),
      enc.mbInfo[it.mbIdx].uvMode);
  rd.nz = nz;
};

//------------------------------------------------------------------------------
// Entry point

/**
 * @param {webp.vp8.iterator.VP8EncIterator} it
 * @param {webp.vp8.encode.VP8ModeScore} rd
 * @return {boolean}
 */
vp8.quant.VP8Decimate = function(it, rd) {
  vp8.quant.InitScore(rd);

  // We can perform predictions for Luma16x16 and Chroma8x8 already.
  // Luma4x4 predictions needs to be done as-we-go.
  vp8.quant.VP8MakeLuma16Preds(it);
  vp8.quant.VP8MakeChroma8Preds(it);

  vp8.quant.SimpleQuantize(it, rd);
  var isSkipped = (rd.nz == 0);
  vp8.iterator.VP8SetSkip(it, isSkipped ? 1 : 0);
  return isSkipped;
};

});