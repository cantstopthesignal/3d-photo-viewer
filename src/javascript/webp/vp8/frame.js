// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.frame');

goog.require('webp.vp8.constants');
goog.require('webp.vp8.debug');


goog.scope(function() {

var constants = webp.vp8.constants;
var debug = webp.vp8.debug;
var vp8 = webp.vp8;

// On-the-fly info about the current set of residuals. Handy to avoid
// passing zillions of params.
/** @constructor */
vp8.frame.VP8Residual = function() {
  // int first;
  this.first = 0;

  // int last;
  this.last = 0;

  // const int16_t* coeffs;
  /** @type {Int16Array} */
  this.coeffs = null;

  // int coeff_type;
  // ProbaArray* prob;
  /** @type {Array.<Array.<Uint8Array>>} */
  this.prob = null;

  // StatsArray* stats;
  /** @type {Array.<Array.<Uint32Array>>} */
  this.stats = null;

  // CostArray*  cost;
  /** @type {Array.<Array.<Uint16Array>>} */
  this.cost = null;
};

//------------------------------------------------------------------------------
// Tables for level coding

vp8.frame.VP8EncBands = new Uint8Array([
  0, 1, 2, 3, 6, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 7,
  0  // sentinel
]);

vp8.frame.kCat3 = new Uint8Array([173, 148, 140]);
vp8.frame.kCat4 = new Uint8Array([176, 155, 140, 135]);
vp8.frame.kCat5 = new Uint8Array([180, 157, 141, 134, 130]);
vp8.frame.kCat6 = new Uint8Array([254, 254, 243, 230, 196, 177, 153, 140, 133, 130, 129]);

//------------------------------------------------------------------------------
// Reset the statistics about: number of skips, token proba, level cost,...

/** @param {webp.vp8.encode.VP8Encoder} enc */
vp8.frame.ResetStats = function(enc) {
  var proba = enc.proba;
  vp8.cost.VP8CalculateLevelCosts(proba);
  proba.nbSkip = 0;
};

//------------------------------------------------------------------------------
// Skip decision probability

// static int CalcSkipProba(uint64_t nb, uint64_t total) {
/**
 * @param {number} nb
 * @param {number} total
 * @return
 */
vp8.frame.CalcSkipProba = function(nb, total) {
  return parseInt(total ? (total - nb) * 255 / total : 255, 10);
};

// Returns the bit-cost for coding the skip probability.
/**
 * @param {webp.vp8.encode.VP8Encoder} enc
 * @return {number}
 */
vp8.frame.FinalizeSkipProba = function(enc) {
  var proba = enc.proba;
  var nbMbs = enc.mbW * enc.mbH;
  var nbEvents = proba.nbSkip;
  proba.skipProba = vp8.frame.CalcSkipProba(nbEvents, nbMbs);
  proba.useSkipProba = (proba.skipProba < constants.SKIP_PROBA_THRESHOLD);
  var size = 256;   // 'use_skip_proba' bit
  if (proba.useSkipProba_) {
    size +=  nbEvents * vp8.cost.VP8BitCost(1, proba.skipProba)
         + (nbMbs - nbEvents) * vp8.cost.VP8BitCost(0, proba.skipProba);
    size += 8 * 256;   // cost of signaling the skip_proba_ itself.
  }
  return size;
};

//------------------------------------------------------------------------------
// Recording of token probabilities.

/** @param {webp.vp8.encode.VP8Encoder} enc */
vp8.frame.ResetTokenStats = function(enc) {
  var proba = enc.proba;
  proba.clearStats();
};

// Record proba context used
/**
 * @param {number} bit
 * @param {Uint32Array} statsSubArray
 * @param {number} statsSubOffset
 * @return {number}
 */
vp8.frame.Record = function(bit, statsSubArray, statsSubOffset) {
  var p = statsSubArray[statsSubOffset];
  if (p >= 0xffff0000) {               // an overflow is inbound.
    p = ((p + 1) >> 1) & 0x7fff7fff;  // -> divide the stats by 2.
  }
  // record bit count (lower 16 bits) and increment total count (upper 16 bits).
  p += 0x00010000 + bit;
  statsSubArray[statsSubOffset] = p;
  return bit;
};

// Simulate block coding, but only record statistics.
// Note: no need to record the fixed probas.
// static int RecordCoeffs(int ctx, const VP8Residual* const res) {
/**
 * @param {number} ctx
 * @param {vp8.frame.VP8Residual} res
 */
vp8.frame.RecordCoeffs = function(ctx, res) {
  var n = res.first;
  var statsSubArray = res.stats[vp8.frame.VP8EncBands[n]][ctx];
  if (res.last < 0) {
    vp8.frame.Record(0, statsSubArray, 0);
    return 0;
  }
  while (n <= res.last) {
    var v;
    vp8.frame.Record(1, statsSubArray, 0);
    while ((v = res.coeffs[n++]) == 0) {
      vp8.frame.Record(0, statsSubArray, 1);
      statsSubArray = res.stats[vp8.frame.VP8EncBands[n]][0]
    }
    vp8.frame.Record(1, statsSubArray, 1);
    // if (!Record(2u < (unsigned int)(v + 1), s + 2)) {  // v = -1 or 1
    var rr = vp8.frame.Record(v < -1 || v > 1 ? 1 : 0, statsSubArray, 2);
    if (!rr) {
      statsSubArray = res.stats[vp8.frame.VP8EncBands[n]][1];
    } else {
      v = Math.abs(v);
      if (v > constants.MAX_VARIABLE_LEVEL) {
        v = constants.MAX_VARIABLE_LEVEL;
      }
      var bits = vp8.cost.VP8LevelCodes[v - 1][1];
      var pattern = vp8.cost.VP8LevelCodes[v - 1][0];
      for (var i = 0; (pattern >>= 1) != 0; ++i) {
        var mask = 2 << i;
        if (pattern & 1) {
          vp8.frame.Record(bits & mask ? 1 : 0, statsSubArray, 3 + i);
        }
      }
      statsSubArray = res.stats[vp8.frame.VP8EncBands[n]][2];
    }
  }
  if (n < 16) {
    vp8.frame.Record(0, statsSubArray, 0);
  }
  return 1;
};

// Collect statistics and deduce probabilities for next coding pass.
// Return the total bit-cost for coding the probability updates.
// static int CalcTokenProba(int nb, int total) {
/**
 * @param {number} nb
 * @param {number} total
 * @return {number}
 */
vp8.frame.CalcTokenProba = function(nb, total) {
  if (nb > total) {
    throw Error('Unexpected condition');
  }
  return nb ? 255 - parseInt(nb * 255 / total, 10) : 255;
};

// Cost of coding 'nb' 1's and 'total-nb' 0's using 'proba' probability.
// static int BranchCost(int nb, int total, int proba) {
/**
 * @param {number} nb
 * @param {number} total
 * @param {number} proba
 * @return {number}
 */
vp8.frame.BranchCost = function(nb, total, proba) {
  return nb * vp8.cost.VP8BitCost(1, proba) +
      (total - nb) * vp8.cost.VP8BitCost(0, proba);
};

/**
 * @param {webp.vp8.encode.VP8Encoder} enc
 * @return {number}
 */
vp8.frame.FinalizeTokenProbas = function(enc) {
  var proba = enc.proba;
  var hasChanged = 0;
  var size = 0;
  for (var t = 0; t < constants.NUM_TYPES; ++t) {
    for (var b = 0; b < constants.NUM_BANDS; ++b) {
      for (var c = 0; c < constants.NUM_CTX; ++c) {
        for (var p = 0; p < constants.NUM_PROBAS; ++p) {
          var stats = proba.stats[t][b][c][p];
          var nb = (stats >> 0) & 0xffff;
          var total = (stats >> 16) & 0xffff;
          var updateProba = vp8.tree.VP8CoeffsUpdateProba[t][b][c][p];
          var oldP = vp8.tree.VP8CoeffsProba0[t][b][c][p];
          var newP = vp8.frame.CalcTokenProba(nb, total);
          var oldCost = vp8.frame.BranchCost(nb, total, oldP) +
              vp8.cost.VP8BitCost(0, updateProba);
          var newCost = vp8.frame.BranchCost(nb, total, newP) +
              vp8.cost.VP8BitCost(1, updateProba) +
              8 * 256;
          var useNewP = (oldCost > newCost);
          size += vp8.cost.VP8BitCost(useNewP ? 1 : 0, updateProba);
          if (useNewP) {  // only use proba that seem meaningful enough.
            proba.coeffs[t][b][c][p] = newP;
            hasChanged |= (newP != oldP);
            size += 8 * 256;
          } else {
            proba.coeffs[t][b][c][p] = oldP;
          }
        }
      }
    }
  }
  proba.dirty = hasChanged;
  return size;
};

//------------------------------------------------------------------------------
// helper functions for residuals struct VP8Residual.

// static void InitResidual(int first, int coeff_type,
//                          VP8Encoder* const enc, VP8Residual* const res) {
/**
 * @param {number} first
 * @param {number} coeffType
 * @param {webp.vp8.encode.VP8Encoder} enc
 * @param {vp8.frame.VP8Residual} res
 */
vp8.frame.InitResidual = function(first, coeffType, enc, res) {
  res.coeffType = coeffType;
  res.prob  = enc.proba.coeffs[coeffType];
  res.stats = enc.proba.stats[coeffType];
  res.cost  = enc.proba.levelCost[coeffType];
  res.first = first;
};

// static void SetResidualCoeffs(const int16_t* const coeffs,
//                               VP8Residual* const res) {
/**
 * @param {Int16Array} coeffs
 * @param {vp8.frame.VP8Residual} res
 */
vp8.frame.SetResidualCoeffs = function(coeffs, res) {
  res.last = -1;
  for (var n = 15; n >= res.first; --n) {
    if (coeffs[n]) {
      res.last = n;
      break;
    }
  }
  res.coeffs = coeffs;
};

//------------------------------------------------------------------------------
// Coefficient coding

// static int PutCoeffs(VP8BitWriter* const bw, int ctx, const VP8Residual* res) {
/**
 * @param {webp.vp8.bitwriter.VP8BitWriter} bw
 * @param {number} ctx
 * @param {vp8.frame.VP8Residual} res
 * @return {number}
 */
vp8.frame.PutCoeffs = function(bw, ctx, res) {
  var n = res.first;
  var probSubArray = res.prob[vp8.frame.VP8EncBands[n]][ctx];
  if (!vp8.bitwriter.VP8PutBit(bw, res.last >= 0 ? 1 : 0, probSubArray[0])) {
    return 0;
  }

  while (n < 16) {
    var c = res.coeffs[n++];
    var sign = c < 0;
    var v = sign ? -c : c;
    if (!vp8.bitwriter.VP8PutBit(bw, v != 0 ? 1 : 0, probSubArray[1])) {
      probSubArray = res.prob[vp8.frame.VP8EncBands[n]][0];
      continue;
    }
    if (!vp8.bitwriter.VP8PutBit(bw, v > 1 ? 1 : 0, probSubArray[2])) {
      probSubArray = res.prob[vp8.frame.VP8EncBands[n]][1];
    } else {
      if (!vp8.bitwriter.VP8PutBit(bw, v > 4 ? 1 : 0, probSubArray[3])) {
        if (vp8.bitwriter.VP8PutBit(bw, v != 2 ? 1 : 0, probSubArray[4])) {
          vp8.bitwriter.VP8PutBit(bw, v == 4 ? 1 : 0, probSubArray[5]);
        }
      } else if (!vp8.bitwriter.VP8PutBit(bw, v > 10 ? 1 : 0, probSubArray[6])) {
        if (!vp8.bitwriter.VP8PutBit(bw, v > 6 ? 1 : 0, probSubArray[7])) {
          vp8.bitwriter.VP8PutBit(bw, v == 6 ? 1 : 0, 159);
        } else {
          vp8.bitwriter.VP8PutBit(bw, v >= 9 ? 1 : 0, 165);
          vp8.bitwriter.VP8PutBit(bw, !(v & 1) ? 1 : 0, 145);
        }
      } else {
        var mask;
        var tab;
        if (v < 3 + (8 << 1)) {          // kCat3  (3b)
          vp8.bitwriter.VP8PutBit(bw, 0, probSubArray[8]);
          vp8.bitwriter.VP8PutBit(bw, 0, probSubArray[9]);
          v -= 3 + (8 << 0);
          mask = 1 << 2;
          tab = vp8.frame.kCat3;
        } else if (v < 3 + (8 << 2)) {   // kCat4  (4b)
          vp8.bitwriter.VP8PutBit(bw, 0, probSubArray[8]);
          vp8.bitwriter.VP8PutBit(bw, 1, probSubArray[9]);
          v -= 3 + (8 << 1);
          mask = 1 << 3;
          tab = vp8.frame.kCat4;
        } else if (v < 3 + (8 << 3)) {   // kCat5  (5b)
          vp8.bitwriter.VP8PutBit(bw, 1, probSubArray[8]);
          vp8.bitwriter.VP8PutBit(bw, 0, probSubArray[10]);
          v -= 3 + (8 << 2);
          mask = 1 << 4;
          tab = vp8.frame.kCat5;
        } else {                         // kCat6 (11b)
          vp8.bitwriter.VP8PutBit(bw, 1, probSubArray[8]);
          vp8.bitwriter.VP8PutBit(bw, 1, probSubArray[10]);
          v -= 3 + (8 << 3);
          mask = 1 << 10;
          tab = vp8.frame.kCat6;
        }
        var tabIndex = 0;
        while (mask) {
          vp8.bitwriter.VP8PutBit(bw, !!(v & mask) ? 1 : 0, tab[tabIndex++]);
          mask >>= 1;
        }
      }
      probSubArray = res.prob[vp8.frame.VP8EncBands[n]][2];
    }
    vp8.bitwriter.VP8PutBitUniform(bw, sign ? 1 : 0);
    if (n == 16 || !vp8.bitwriter.VP8PutBit(bw, n <= res.last ? 1 : 0, probSubArray[0])) {
      return 1;   // EOB
    }
  }
  return 1;
}

// static void CodeResiduals(VP8BitWriter* const bw,
//                           VP8EncIterator* const it,
//                           const VP8ModeScore* const rd) {
/**
 * @param {webp.vp8.bitwriter.VP8BitWriter} bw
 * @param {webp.vp8.iterator.VP8EncIterator} it
 * @param {webp.vp8.encode.VP8ModeScore} rd
 */
vp8.frame.CodeResiduals = function(bw, it, rd) {
  var res = new vp8.frame.VP8Residual();
  var enc = it.enc;
  var i16 = (enc.mbInfo[it.mbIdx].type == 1);
  var segment = enc.mbInfo[it.mbIdx].segment;

  vp8.iterator.VP8IteratorNzToBytes(it);

  var pos1 = vp8.bitwriter.VP8BitWriterPos(bw);
  if (i16) {
    vp8.frame.InitResidual(0, 1, enc, res);
    vp8.frame.SetResidualCoeffs(rd.yDcLevels, res);
    it.topNz[8] = it.leftNz[8] =
        vp8.frame.PutCoeffs(bw, it.topNz[8] + it.leftNz[8], res);
    vp8.frame.InitResidual(1, 0, enc, res);
  } else {
    vp8.frame.InitResidual(0, 3, enc, res);
  }

  // luma-AC
  for (var y = 0; y < 4; ++y) {
    for (var x = 0; x < 4; ++x) {
      var ctx = it.topNz[x] + it.leftNz[y];
      vp8.frame.SetResidualCoeffs(rd.yAcLevels[x + y * 4], res);
      it.topNz[x] = it.leftNz[y] = vp8.frame.PutCoeffs(bw, ctx, res);
    }
  }
  var pos2 = vp8.bitwriter.VP8BitWriterPos(bw);

  // U/V
  vp8.frame.InitResidual(0, 2, enc, res);
  for (var ch = 0; ch <= 2; ch += 2) {
    for (var y = 0; y < 2; ++y) {
      for (var x = 0; x < 2; ++x) {
        var ctx = it.topNz[4 + ch + x] + it.leftNz[4 + ch + y];
        vp8.frame.SetResidualCoeffs(rd.uvLevels[ch * 2 + x + y * 2], res);
        it.topNz[4 + ch + x] = it.leftNz[4 + ch + y] =
            vp8.frame.PutCoeffs(bw, ctx, res);
      }
    }
  }
  var pos3 = vp8.bitwriter.VP8BitWriterPos(bw);
  it.lumaBits = pos2 - pos1;
  it.uvBits = pos3 - pos2;
  it.bitCount[segment][i16] += it.lumaBits;
  it.bitCount[segment][2] += it.uvBits;
  vp8.iterator.VP8IteratorBytesToNz(it);
};

// Same as CodeResiduals, but doesn't actually write anything.
// Instead, it just records the event distribution.
/**
 * @param {webp.vp8.iterator.VP8EncIterator} it
 * @param {webp.vp8.encode.VP8ModeScore} rd
 */
vp8.frame.RecordResiduals = function(it, rd) {
  var res = new vp8.frame.VP8Residual();
  var enc = it.enc;

  vp8.iterator.VP8IteratorNzToBytes(it);

  if (enc.mbInfo[it.mbIdx].type == 1) {   // i16x16
    vp8.frame.InitResidual(0, 1, enc, res);
    vp8.frame.SetResidualCoeffs(rd.yDcLevels, res);
    it.topNz[8] = it.leftNz[8] =
        vp8.frame.RecordCoeffs(it.topNz[8] + it.leftNz[8], res);
    vp8.frame.InitResidual(1, 0, enc, res);
  } else {
    vp8.frame.InitResidual(0, 3, enc, res);
  }

  // luma-AC
  for (var y = 0; y < 4; ++y) {
    for (var x = 0; x < 4; ++x) {
      var ctx = it.topNz[x] + it.leftNz[y];
      vp8.frame.SetResidualCoeffs(rd.yAcLevels[x + y * 4], res);
      it.topNz[x] = it.leftNz[y] = vp8.frame.RecordCoeffs(ctx, res);
    }
  }

  // U/V
  vp8.frame.InitResidual(0, 2, enc, res);
  for (var ch = 0; ch <= 2; ch += 2) {
    for (var y = 0; y < 2; ++y) {
      for (var x = 0; x < 2; ++x) {
        var ctx = it.topNz[4 + ch + x] + it.leftNz[4 + ch + y];
        vp8.frame.SetResidualCoeffs(rd.uvLevels[ch * 2 + x + y * 2], res);
        it.topNz[4 + ch + x] = it.leftNz[4 + ch + y] =
            vp8.frame.RecordCoeffs(ctx, res);
      }
    }
  }

  vp8.iterator.VP8IteratorBytesToNz(it);
};

//------------------------------------------------------------------------------
// Main loops
//
//  VP8EncLoop(): does the final bitstream coding.

/**
 * @param {webp.vp8.iterator.VP8EncIterator} it
 */
vp8.frame.ResetAfterSkip = function(it) {
  var enc = it.enc;
  if (enc.mbInfo[it.mbIdx].type == 1) {
    it.nz[0] = 0;  // reset all predictors
    it.leftNz[8] = 0;
  } else {
    it.nz[0] &= (1 << 24);  // preserve the dc_nz bit
  }
};

/**
 * @param {webp.vp8.encode.VP8Encoder} enc
 * @return {boolean}
 */
vp8.frame.VP8EncLoop = function(enc) {
  var ok = 1;
  var it = new vp8.iterator.VP8EncIterator();
  var info = new vp8.encode.VP8ModeScore();
  var dontUseSkip = !enc.proba.useSkipProba;
  var kAverageBytesPerMB = 5;     // TODO: have a kTable[quality/10]
  var bytesPerParts = enc.mbW * enc.mbH * kAverageBytesPerMB;

  if (debug.isEnabled()) {
    debug.dumpEncoder("VP8EncLoop.START", enc);
  }

  // Initialize the bit-writers
  vp8.bitwriter.VP8BitWriterInit(enc.part1, bytesPerParts);

  vp8.frame.ResetStats(enc);

  vp8.iterator.VP8IteratorInit(enc, it);
  do {
    vp8.iterator.VP8IteratorImport(it);
    // Warning! order is important: first call VP8Decimate() and
    // *then* decide how to code the skip decision if there's one.
    if (!vp8.quant.VP8Decimate(it, info) || dontUseSkip) {
      vp8.frame.CodeResiduals(it.bw, it, info);
    } else {   // reset predictors after a skip
      vp8.frame.ResetAfterSkip(it);
    }
  } while (ok && vp8.iterator.VP8IteratorNext(it, it.yuvOut));

  if (ok) {      // Finalize the partitions, check for extra errors.
    vp8.bitwriter.VP8BitWriterFinish(enc.part1);
    ok &= !enc.part1.error;
  }

  if (debug.isEnabled()) {
    debug.dumpEncoder("VP8EncLoop.END", enc);
  }
  return !!ok;
};

//------------------------------------------------------------------------------
//  VP8StatLoop(): only collect statistics (number of skips, token usage, ...)
//                 This is used for deciding optimal probabilities. It also
//                 modifies the quantizer value if some target (size, PNSR)
//                 was specified.

vp8.frame.kHeaderSizeEstimate = 15 + 20 + 10;      // TODO: fix better


/**
 * @param {webp.vp8.encode.VP8Encoder} enc
 * @param {number} q
 * @param {number} nbMbs
 * @return {boolean}
 */
vp8.frame.OneStatPass = function(enc, q, nbMbs) {
  var it = new vp8.iterator.VP8EncIterator();
  var size = 0;
  var distortion = 0;
  var pixelCount = nbMbs * 384;

  vp8.quant.VP8SetSegmentParams(enc, q);      // setup segment quantizations and filters

  vp8.frame.ResetStats(enc);
  vp8.frame.ResetTokenStats(enc);

  vp8.iterator.VP8IteratorInit(enc, it);
  do {
    var info = new vp8.encode.VP8ModeScore();
    vp8.iterator.VP8IteratorImport(it);
    if (vp8.quant.VP8Decimate(it, info)) {
      // Just record the number of skips and act like skip_proba is not used.
      enc.proba.nbSkip++;
    }
    vp8.frame.RecordResiduals(it, info);
    size += info.R;
    distortion += info.D;
  } while (vp8.iterator.VP8IteratorNext(it, it.yuvOut) && --nbMbs > 0);
  size += vp8.frame.FinalizeSkipProba(enc);
  size += vp8.frame.FinalizeTokenProbas(enc);
  size += enc.segmentHdr.size;
  size = ((size + 1024) >> 11) + vp8.frame.kHeaderSizeEstimate;

  return size > 0;
};

/**
 * @param {webp.vp8.encode.VP8Encoder} enc
 * @return {boolean}
 */
vp8.frame.VP8StatLoop = function(enc) {
  var q = enc.config.quality;
  var taskPercent = 20;

  if (debug.isEnabled()) {
    debug.dumpEncoder("VP8StatLoop.START", enc);
  }

  // Fast mode: quick analysis pass over few mbs. Better than nothing.
  var nbMbs = enc.mbW * enc.mbH;
  if (nbMbs > 100) {
    nbMbs = 100;
  }

  var result = vp8.frame.OneStatPass(enc, q, nbMbs);

  if (debug.isEnabled()) {
    debug.dumpEncoder("VP8StatLoop.END", enc);
  }

  return result;
}

});
