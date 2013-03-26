// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.encode');

goog.require('webp.vp8.analysis');
goog.require('webp.vp8.bitwriter');
goog.require('webp.vp8.constants');
goog.require('webp.vp8.debug');
goog.require('webp.vp8.frame');
goog.require('webp.vp8.syntax');
goog.require('webp.vp8.tree');


goog.scope(function() {

var constants = webp.vp8.constants;
var debug = webp.vp8.debug;
var vp8 = webp.vp8;

/** @constructor */
vp8.encode.VP8Encoder = function() {
  // const WebPConfig* config_;    // user configuration and parameters
  this.config = null;

  // WebPPicture* pic_;            // input / output picture
  this.pic = null;

  // headers
  // VP8FilterHeader   filter_hdr_;     // filtering information
  this.filterHdr = new vp8.encode.VP8FilterHeader();

  // VP8SegmentHeader  segment_hdr_;    // segment information
  this.segmentHdr = new vp8.encode.VP8SegmentHeader();

  // dimension, in macroblock units.
  // int mb_w_, mb_h_;
  this.mbW = 0;
  this.mbH = 0;

  // int preds_w_;   // stride of the *preds_ prediction plane (=4*mb_w + 1)
  this.predsW = 0;

  // per-partition boolean decoders.
  // VP8BitWriter bw_;                         // part0
  this.bw = new vp8.bitwriter.VP8BitWriter();

  // VP8BitWriter part1_;                      // token partitions
  this.part1 = new vp8.bitwriter.VP8BitWriter();

  // int percent_;                             // for progress
  this.percent = 0;

  // quantization info (one set of DC/AC dequant factor per segment)
  // VP8SegmentInfo dqm_[NUM_MB_SEGMENTS];
  this.dqm = [];
  for (var i = 0; i < constants.NUM_MB_SEGMENTS; i++) {
    this.dqm.push(new vp8.encode.VP8SegmentInfo());
  }

  // int base_quant_;              // nominal quantizer value. Only used
                                   // for relative coding of segments' quant.
  this.baseQuant = 0;

  // int uv_alpha_;                   // U/V quantization susceptibility
  this.uvAlpha = 0;

  // global offset of quantizers, shared by all segments
  // int dq_y1_dc_;
  this.dqY1Dc = 0;

  // int dq_y2_dc_, dq_y2_ac_;
  this.dqY2Dc = 0;
  this.dqY2Ac = 0;

  // int dq_uv_dc_, dq_uv_ac_;
  this.dqUvDc = 0;
  this.dqUvAc = 0;

  // probabilities and statistics
  // VP8Proba proba_;
  this.proba = new vp8.encode.VP8Proba();

  // Memory
  // VP8MBInfo* mb_info_;   // contextual macroblock infos (mb_w_ + 1)
  this.mbInfo = null;

  // uint8_t*   preds_;     // predictions modes: (4*mb_w+1) * (4*mb_h+1)
  this.preds = null;

  // uint32_t*  nz_;        // non-zero bit context: mb_w+1
  this.nz = null;

  // uint8_t*   yuv_in_;    // input samples
  this.yuvIn = null;

  // uint8_t*   yuv_out_;   // output samples
  this.yuvOut = null;

  // uint8_t*   yuv_out2_;  // secondary scratch out-buffer. swapped with yuv_out_.
  this.yuvOut2 = null;

  // uint8_t*   yuv_p_;     // scratch buffer for prediction
  this.yuvP = null;

  // uint8_t   *y_top_;     // top luma samples.
  this.yTop = null;

  // uint8_t   *uv_top_;    // top u/v samples.
                            // U and V are packed into 16 pixels (8 U + 8 V)
  this.uvTop = null;

  // uint8_t   *y_left_;    // left luma samples (adressable from index -1 to 15).
  this.yLeft = null;

  // uint8_t   *u_left_;    // left u samples (adressable from index -1 to 7)
  this.uLeft = null;

  // uint8_t   *v_left_;    // left v samples (adressable from index -1 to 7)
  this.vLeft = null;
};

// Filter parameters. Not actually used in the code (we don't perform
// the in-loop filtering), but filled from user's config
/** @constructor */
vp8.encode.VP8FilterHeader = function() {
  // int simple_;             // filtering type: 0=complex, 1=simple
  this.simple = 0;

  // int level_;              // base filter level [0..63]
  this.level = 0;

  // int sharpness_;          // [0..7]
  this.sharpness = 0;

  // int i4x4_lf_delta_;      // delta filter level for i4x4 relative to i16x16
  this.i4x4LfDelta = 0;
};

// segment features
/** @constructor */
vp8.encode.VP8SegmentHeader = function() {
  // int num_segments_;      // Actual number of segments. 1 segment only = unused.
  this.numSegments = 0;

  // int update_map_;        // whether to update the segment map or not.
                             // must be 0 if there's only 1 segment.
  this.updateMap = 0;

  // int size_;              // bit-cost for transmitting the segment map
  this.size = 0;
};

/** @constructor */
vp8.encode.VP8Matrix = function() {
  // uint16_t q_[16];        // quantizer steps
  this.q = new Uint16Array(16);

  // uint16_t iq_[16];       // reciprocals, fixed point.
  this.iq = new Uint16Array(16);

  // uint16_t bias_[16];     // rounding bias
  this.bias = new Uint16Array(16);

  // uint16_t zthresh_[16];  // value under which a coefficient is zeroed
  this.zthresh = new Uint16Array(16);

  // uint16_t sharpen_[16];  // frequency boosters for slight sharpening
  this.sharpen = new Uint16Array(16);
};

/** @constructor */
vp8.encode.VP8SegmentInfo = function() {
  // VP8Matrix y1_, y2_, uv_;  // quantization matrices
  this.y1 = new vp8.encode.VP8Matrix();
  this.y2 = new vp8.encode.VP8Matrix();
  this.uv = new vp8.encode.VP8Matrix();

  // int alpha_;      // quant-susceptibility, range [-127,127]. Zero is neutral.
                      // Lower values indicate a lower risk of blurriness.
  this.alpha = 0;

  // int beta_;       // filter-susceptibility, range [0,255].
  this.beta = 0;

  // int quant_;      // final segment quantizer.
  this.quant = 0;

  // int fstrength_;  // final in-loop filtering strength
  this.fstrength = 0;

  // reactivities
  // int lambda_i16_, lambda_i4_, lambda_uv_;
  this.lambdaI16 = 0;
  this.lambdaI4 = 0;
  this.lambdaUv = 0;
  
  // int lambda_mode_, lambda_trellis_, tlambda_;
  this.lambdaMode = 0;
  this.lambdaTrellis = 0;
  this.tlambda = 0;

  // int lambda_trellis_i16_, lambda_trellis_i4_, lambda_trellis_uv_;
  this.lambdaTrellisI16 = 0;
  this.lambdaTrellisI4 = 0;
  this.lambdaTrellisUv = 0;
};

// Struct collecting all frame-persistent probabilities.
/** @constructor */
vp8.encode.VP8Proba = function() {
  this.clear();
};

vp8.encode.VP8Proba.prototype.clear = function() {
  // uint8_t segments_[3];     // probabilities for segment tree
  this.segments = new Uint8Array(3);

  // uint8_t skip_proba_;      // final probability of being skipped.
  this.skipProba = 0;

  // typedef uint32_t proba_t;   // 16b + 16b
  // typedef uint8_t ProbaArray[NUM_CTX][NUM_PROBAS];
  // typedef uint16_t CostArray[NUM_CTX][MAX_VARIABLE_LEVEL + 1];
  // ProbaArray coeffs_[NUM_TYPES][NUM_BANDS];      // 924 bytes
  // CostArray level_cost_[NUM_TYPES][NUM_BANDS];   // 11.4k
  this.coeffs = [];
  this.levelCost = [];
  for (var t = 0; t < constants.NUM_TYPES; t++) {
    var coeffTypes = []; this.coeffs.push(coeffTypes);
    var levelTypes = []; this.levelCost.push(levelTypes);
    for (var b = 0; b < constants.NUM_BANDS; b++) {
      var coeffBands = []; coeffTypes.push(coeffBands);
      var levelBands = []; levelTypes.push(levelBands);
      for (var c = 0; c < constants.NUM_CTX; c++) {
        coeffBands.push(new Uint8Array(constants.NUM_PROBAS));
        levelBands.push(new Uint16Array(constants.MAX_VARIABLE_LEVEL + 1));
      }
    }
  }
  this.clearStats();

  // int dirty_;               // if true, need to call VP8CalculateLevelCosts()
  this.dirty = 0;

  // int use_skip_proba_;      // Note: we always use skip_proba for now.
  this.useSkipProba = 0;

  // int nb_skip_;             // number of skipped blocks
  this.nbSkip = 0;
};

vp8.encode.VP8Proba.prototype.clearStats = function() {
  // typedef proba_t StatsArray[NUM_CTX][NUM_PROBAS];
  // StatsArray stats_[NUM_TYPES][NUM_BANDS];       // 4224 bytes
  this.stats = [];
  for (var t = 0; t < constants.NUM_TYPES; t++) {
    var statTypes = [];  this.stats.push(statTypes);
    for (var b = 0; b < constants.NUM_BANDS; b++) {
      var statBands = []; statTypes.push(statBands);
      for (var c = 0; c < constants.NUM_CTX; c++) {
        statBands.push(new Uint32Array(constants.NUM_PROBAS));
      }
    }
  }
};

/** @constructor */
vp8.encode.VP8MBInfo = function() {
  // block type
  // unsigned int type_:2;     // 0=i4x4, 1=i16x16
  this.type = 0;

  // unsigned int uv_mode_:2;
  this.uvMode = 0;

  // unsigned int skip_:1;
  this.skip = 0;

  // unsigned int segment_:2;
  this.segment = 0;

  // uint8_t alpha_;      // quantization-susceptibility
  this.alpha = 0;
};

/**
 * @param {webp.config.WebPConfig} config
 * @param {webp.picture.WebPPicture} picture
 * @return {webp.vp8.encode.VP8Encoder}
 */
vp8.encode.InitVP8Encoder = function(config, picture) {
  var debugTimer = debug.startTimer('vp8.encode.InitVP8Encoder');
  var mbW = (picture.width + 15) >> 4;
  var mbH = (picture.height + 15) >> 4;
  var predsW = 4 * mbW + 1;
  var predsH = 4 * mbH + 1;
  var topStride = mbW * 16;

  var enc = new vp8.encode.VP8Encoder();
  enc.mbW = mbW;
  enc.mbH = mbH;
  enc.predsW = predsW;
  enc.yuvIn = new Uint8Array(constants.YUV_SIZE);
  enc.yuvOut = new Uint8Array(constants.YUV_SIZE);
  enc.yuvOut2 = new Uint8Array(constants.YUV_SIZE);
  enc.yuvP = new Uint8Array(constants.PRED_SIZE);

  enc.mbInfo = [];
  for (var i = 0; i <  mbW * mbH; i++) {
    enc.mbInfo.push(new vp8.encode.VP8MBInfo());
  }

  enc.preds = new Uint8Array(predsW * predsH).subarray(predsW + 1);
  enc.nz = new Uint32Array(mbW + 1).subarray(1);

  // top samples (all 16-aligned)
  enc.yTop = new Uint8Array(topStride);
  enc.uvTop = new Uint8Array(topStride);

  enc.yLeft = new Uint8Array(16 + 16 + 16 + 8 + 1).subarray(1);
  enc.uLeft = enc.yLeft.subarray(16 + 16)
  enc.vLeft = enc.uLeft.subarray(16)

  enc.config = config;
  enc.pic = picture;
  enc.percent = 0;

  if (debug.isEnabled()) {
    debug.dumpEncoder('InitVP8Encoder.AAA', enc);
  }

  vp8.tree.VP8DefaultProbas(enc);
  vp8.encode.ResetSegmentHeader(enc);
  vp8.encode.ResetFilterHeader(enc);
  vp8.encode.ResetBoundaryPredictions(enc);

  if (debug.isEnabled()) {
    debug.dumpEncoder('InitVP8Encoder.BBB', enc);
  }

  debugTimer.report();
  return enc;
};

/** @param {webp.vp8.encode.VP8Encoder} enc */
vp8.encode.ResetSegmentHeader = function(enc) {
  var hdr = enc.segmentHdr;
  hdr.numSegments = enc.config.segments;
  hdr.updateMap = hdr.numSegments > 1;
  hdr.size = 0;
};

/** @param {webp.vp8.encode.VP8Encoder} enc */
vp8.encode.ResetFilterHeader = function(enc) {
  var hdr = enc.filterHdr;
  hdr.simple = 1;
  hdr.level = 0;
  hdr.sharpness = 0;
  hdr.i4x4LfDelta = 0;
};

/** @param {webp.vp8.encode.VP8Encoder} enc */
vp8.encode.ResetBoundaryPredictions = function(enc) {
  // init boundary values once for all
  // Note: actually, initializing the preds_[] is only needed for intra4.
  var topSubArray = vp8.utils.Uint8Repoint(enc.preds, -enc.predsW - 1);
  var leftSubArray = vp8.utils.Uint8Repoint(enc.preds, -1);
  for (var i = 0; i <= 4 * enc.mbW; ++i) {
    topSubArray[i] = constants.B_DC_PRED;
  }
  for (var i = 0; i < 4 * enc.mbH; ++i) {
    leftSubArray[i * enc.predsW] = constants.B_DC_PRED;
  }
  vp8.utils.Uint32SetNeg(enc.nz, -1, 0);  // constant
};


//------------------------------------------------------------------------------
// Informations about the macroblocks.

// Handy transcient struct to accumulate score and info during RD-optimization
// and mode evaluation.
/** @constructor */
vp8.encode.VP8ModeScore = function() {
  // score_t D, SD, R, score;    // Distortion, spectral distortion, rate, score.
  this.D = 0;
  this.SD = 0;
  this.R = 0;
  this.score = 0;

  // int16_t y_dc_levels[16];    // Quantized levels for luma-DC, luma-AC, chroma.
  this.yDcLevels = new Int16Array(16);

  // int16_t y_ac_levels[16][16];
  this.yAcLevels = [];
  for (var i = 0; i < 16; i++) {
    this.yAcLevels.push(new Int16Array(16));
  }

  // int16_t uv_levels[4 + 4][16];
  this.uvLevels = [];
  for (var i = 0; i < 8; i++) {
    this.uvLevels.push(new Int16Array(16));
  }

  // int mode_i16;               // mode number for intra16 prediction
  this.modeI16 = 0;

  // uint8_t modes_i4[16];       // mode numbers for intra4 predictions
  this.modesI4 = new Uint8Array(16);

  // int mode_uv;                // mode number of chroma prediction
  this.modeUv = 0;

  // uint32_t nz;                // non-zero blocks
  this.nz = 0;
};

});
