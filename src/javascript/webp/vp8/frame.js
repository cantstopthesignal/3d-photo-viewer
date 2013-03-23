// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.Frame');

goog.require('webp.vp8.debug');

goog.scope(function() {

var debug = webp.vp8.debug;

// On-the-fly info about the current set of residuals. Handy to avoid
// passing zillions of params.
/** @constructor */
VP8Residual = function() {
  // int first;
  this.first = 0;

  // int last;
  this.last = 0;

  // const int16_t* coeffs;
  this.coeffs = null;

  // int coeff_type;
  // ProbaArray* prob;
  this.prob = null;

  // StatsArray* stats;
  this.stats = null;

  // CostArray*  cost;
  this.cost = null;
};

//------------------------------------------------------------------------------
// Tables for level coding

VP8EncBands = new Uint8Array([
  0, 1, 2, 3, 6, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 7,
  0  // sentinel
]);

kCat3 = new Uint8Array([173, 148, 140]);
kCat4 = new Uint8Array([176, 155, 140, 135]);
kCat5 = new Uint8Array([180, 157, 141, 134, 130]);
kCat6 = new Uint8Array([254, 254, 243, 230, 196, 177, 153, 140, 133, 130, 129]);

//------------------------------------------------------------------------------
// Reset the statistics about: number of skips, token proba, level cost,...

/** @param {VP8Encoder} enc */
ResetStats = function(enc) {
  var proba = enc.proba;
  VP8CalculateLevelCosts(proba);
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
CalcSkipProba = function(nb, total) {
  return parseInt(total ? (total - nb) * 255 / total : 255);
};

// Returns the bit-cost for coding the skip probability.
/**
 * @param {VP8Encoder} enc
 * @return {number}
 */
FinalizeSkipProba = function(enc) {
  var proba = enc.proba;
  var nbMbs = enc.mbW * enc.mbH;
  var nbEvents = proba.nbSkip;
  proba.skipProba = CalcSkipProba(nbEvents, nbMbs);
  proba.useSkipProba = (proba.skipProba < SKIP_PROBA_THRESHOLD);
  var size = 256;   // 'use_skip_proba' bit
  if (proba.useSkipProba_) {
    size +=  nbEvents * VP8BitCost(1, proba.skipProba)
         + (nbMbs - nbEvents) * VP8BitCost(0, proba.skipProba);
    size += 8 * 256;   // cost of signaling the skip_proba_ itself.
  }
  return size;
};

//------------------------------------------------------------------------------
// Recording of token probabilities.

/** @param {VP8Encoder} enc */
ResetTokenStats = function(enc) {
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
Record = function(bit, statsSubArray, statsSubOffset) {
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
 * @param {VP8Residual} res
 */
RecordCoeffs = function(ctx, res) {
  var n = res.first;
  var statsSubArray = res.stats[VP8EncBands[n]][ctx];
  if (res.last < 0) {
    Record(0, statsSubArray, 0);
    return 0;
  }
  while (n <= res.last) {
    var v;
    Record(1, statsSubArray, 0);
    while ((v = res.coeffs[n++]) == 0) {
      Record(0, statsSubArray, 1);
      statsSubArray = res.stats[VP8EncBands[n]][0]
    }
    Record(1, statsSubArray, 1);
    // if (!Record(2u < (unsigned int)(v + 1), s + 2)) {  // v = -1 or 1
    var rr = Record(v < -1 || v > 1 ? 1 : 0, statsSubArray, 2);
    if (!rr) {
      statsSubArray = res.stats[VP8EncBands[n]][1];
    } else {
      v = Math.abs(v);
      if (v > MAX_VARIABLE_LEVEL) {
        v = MAX_VARIABLE_LEVEL;
      }
      var bits = VP8LevelCodes[v - 1][1];
      var pattern = VP8LevelCodes[v - 1][0];
      for (var i = 0; (pattern >>= 1) != 0; ++i) {
        var mask = 2 << i;
        if (pattern & 1) {
          Record(bits & mask ? 1 : 0, statsSubArray, 3 + i);
        }
      }
      statsSubArray = res.stats[VP8EncBands[n]][2];
    }
  }
  if (n < 16) {
    Record(0, statsSubArray, 0);
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
CalcTokenProba = function(nb, total) {
  if (nb > total) {
    throw Error('Unexpected condition');
  }
  return nb ? 255 - parseInt(nb * 255 / total) : 255;
};

// Cost of coding 'nb' 1's and 'total-nb' 0's using 'proba' probability.
// static int BranchCost(int nb, int total, int proba) {
/**
 * @param {number} nb
 * @param {number} total
 * @param {number} proba
 * @return {number}
 */
BranchCost = function(nb, total, proba) {
  return nb * VP8BitCost(1, proba) + (total - nb) * VP8BitCost(0, proba);
};

/**
 * @param {VP8Encoder} enc
 * @return {number}
 */
FinalizeTokenProbas = function(enc) {
  var proba = enc.proba;
  var hasChanged = 0;
  var size = 0;
  for (var t = 0; t < NUM_TYPES; ++t) {
    for (var b = 0; b < NUM_BANDS; ++b) {
      for (var c = 0; c < NUM_CTX; ++c) {
        for (var p = 0; p < NUM_PROBAS; ++p) {
          var stats = proba.stats[t][b][c][p];
          var nb = (stats >> 0) & 0xffff;
          var total = (stats >> 16) & 0xffff;
          var updateProba = VP8CoeffsUpdateProba[t][b][c][p];
          var oldP = VP8CoeffsProba0[t][b][c][p];
          var newP = CalcTokenProba(nb, total);
          var oldCost = BranchCost(nb, total, oldP) +
              VP8BitCost(0, updateProba);
          var newCost = BranchCost(nb, total, newP) +
              VP8BitCost(1, updateProba) +
              8 * 256;
          var useNewP = (oldCost > newCost);
          size += VP8BitCost(useNewP, updateProba);
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
 * @param {VP8Encoder} enc
 * @param {VP8Residual} res
 */
InitResidual = function(first, coeffType, enc, res) {
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
 * @param {VP8Residual} res
 */
SetResidualCoeffs = function(coeffs, res) {
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
 * @param {VP8BitWriter} bw
 * @param {number} ctx
 * @param {VP8Residual} res
 * @return {number}
 */
PutCoeffs = function(bw, ctx, res) {
  var n = res.first;
  var probSubArray = res.prob[VP8EncBands[n]][ctx];
  if (!VP8PutBit(bw, res.last >= 0, probSubArray[0])) {
    return 0;
  }

  while (n < 16) {
    var c = res.coeffs[n++];
    var sign = c < 0;
    var v = sign ? -c : c;
    if (!VP8PutBit(bw, v != 0, probSubArray[1])) {
      probSubArray = res.prob[VP8EncBands[n]][0];
      continue;
    }
    if (!VP8PutBit(bw, v > 1, probSubArray[2])) {
      probSubArray = res.prob[VP8EncBands[n]][1];
    } else {
      if (!VP8PutBit(bw, v > 4, probSubArray[3])) {
        if (VP8PutBit(bw, v != 2, probSubArray[4])) {
          VP8PutBit(bw, v == 4, probSubArray[5]);
        }
      } else if (!VP8PutBit(bw, v > 10, probSubArray[6])) {
        if (!VP8PutBit(bw, v > 6, probSubArray[7])) {
          VP8PutBit(bw, v == 6, 159);
        } else {
          VP8PutBit(bw, v >= 9, 165);
          VP8PutBit(bw, !(v & 1), 145);
        }
      } else {
        var mask;
        var tab;
        if (v < 3 + (8 << 1)) {          // kCat3  (3b)
          VP8PutBit(bw, 0, probSubArray[8]);
          VP8PutBit(bw, 0, probSubArray[9]);
          v -= 3 + (8 << 0);
          mask = 1 << 2;
          tab = kCat3;
        } else if (v < 3 + (8 << 2)) {   // kCat4  (4b)
          VP8PutBit(bw, 0, probSubArray[8]);
          VP8PutBit(bw, 1, probSubArray[9]);
          v -= 3 + (8 << 1);
          mask = 1 << 3;
          tab = kCat4;
        } else if (v < 3 + (8 << 3)) {   // kCat5  (5b)
          VP8PutBit(bw, 1, probSubArray[8]);
          VP8PutBit(bw, 0, probSubArray[10]);
          v -= 3 + (8 << 2);
          mask = 1 << 4;
          tab = kCat5;
        } else {                         // kCat6 (11b)
          VP8PutBit(bw, 1, probSubArray[8]);
          VP8PutBit(bw, 1, probSubArray[10]);
          v -= 3 + (8 << 3);
          mask = 1 << 10;
          tab = kCat6;
        }
        var tabIndex = 0;
        while (mask) {
          VP8PutBit(bw, !!(v & mask), tab[tabIndex++]);
          mask >>= 1;
        }
      }
      probSubArray = res.prob[VP8EncBands[n]][2];
    }
    VP8PutBitUniform(bw, sign);
    if (n == 16 || !VP8PutBit(bw, n <= res.last, probSubArray[0])) {
      return 1;   // EOB
    }
  }
  return 1;
}

// static void CodeResiduals(VP8BitWriter* const bw,
//                           VP8EncIterator* const it,
//                           const VP8ModeScore* const rd) {
/**
 * @param {VP8BitWriter} bw
 * @param {VP8EncIterator} it
 * @param {VP8ModeScore} rd
 */
CodeResiduals = function(bw, it, rd) {
  var res = new VP8Residual();
  var enc = it.enc;
  var i16 = (enc.mbInfo[it.mbIdx].type == 1);
  var segment = enc.mbInfo[it.mbIdx].segment;

  VP8IteratorNzToBytes(it);

  var pos1 = VP8BitWriterPos(bw);
  if (i16) {
    InitResidual(0, 1, enc, res);
    SetResidualCoeffs(rd.yDcLevels, res);
    it.topNz[8] = it.leftNz[8] =
        PutCoeffs(bw, it.topNz[8] + it.leftNz[8], res);
    InitResidual(1, 0, enc, res);
  } else {
    InitResidual(0, 3, enc, res);
  }

  // luma-AC
  for (var y = 0; y < 4; ++y) {
    for (var x = 0; x < 4; ++x) {
      var ctx = it.topNz[x] + it.leftNz[y];
      SetResidualCoeffs(rd.yAcLevels[x + y * 4], res);
      it.topNz[x] = it.leftNz[y] = PutCoeffs(bw, ctx, res);
    }
  }
  var pos2 = VP8BitWriterPos(bw);

  // U/V
  InitResidual(0, 2, enc, res);
  for (var ch = 0; ch <= 2; ch += 2) {
    for (var y = 0; y < 2; ++y) {
      for (var x = 0; x < 2; ++x) {
        var ctx = it.topNz[4 + ch + x] + it.leftNz[4 + ch + y];
        SetResidualCoeffs(rd.uvLevels[ch * 2 + x + y * 2], res);
        it.topNz[4 + ch + x] = it.leftNz[4 + ch + y] =
            PutCoeffs(bw, ctx, res);
      }
    }
  }
  var pos3 = VP8BitWriterPos(bw);
  it.lumaBits = pos2 - pos1;
  it.uvBits = pos3 - pos2;
  it.bitCount[segment][i16] += it.lumaBits;
  it.bitCount[segment][2] += it.uvBits;
  VP8IteratorBytesToNz(it);
};

// Same as CodeResiduals, but doesn't actually write anything.
// Instead, it just records the event distribution.
/**
 * @param {VP8EncIterator} it
 * @param {VP8ModeScore} rd
 */
RecordResiduals = function(it, rd) {
  var res = new VP8Residual();
  var enc = it.enc;

  VP8IteratorNzToBytes(it);

  if (enc.mbInfo[it.mbIdx].type == 1) {   // i16x16
    InitResidual(0, 1, enc, res);
    SetResidualCoeffs(rd.yDcLevels, res);
    it.topNz[8] = it.leftNz[8] =
        RecordCoeffs(it.topNz[8] + it.leftNz[8], res);
    InitResidual(1, 0, enc, res);
  } else {
    InitResidual(0, 3, enc, res);
  }

  // luma-AC
  for (var y = 0; y < 4; ++y) {
    for (var x = 0; x < 4; ++x) {
      var ctx = it.topNz[x] + it.leftNz[y];
      SetResidualCoeffs(rd.yAcLevels[x + y * 4], res);
      it.topNz[x] = it.leftNz[y] = RecordCoeffs(ctx, res);
    }
  }

  // U/V
  InitResidual(0, 2, enc, res);
  for (var ch = 0; ch <= 2; ch += 2) {
    for (var y = 0; y < 2; ++y) {
      for (var x = 0; x < 2; ++x) {
        var ctx = it.topNz[4 + ch + x] + it.leftNz[4 + ch + y];
        SetResidualCoeffs(rd.uvLevels[ch * 2 + x + y * 2], res);
        it.topNz[4 + ch + x] = it.leftNz[4 + ch + y] =
            RecordCoeffs(ctx, res);
      }
    }
  }

  VP8IteratorBytesToNz(it);
};

//------------------------------------------------------------------------------
// Main loops
//
//  VP8EncLoop(): does the final bitstream coding.

/**
 * @param {VP8EncIterator} it
 */
ResetAfterSkip = function(it) {
  var enc = it.enc;
  if (enc.mbInfo[it.mbIdx].type == 1) {
    it.nz[0] = 0;  // reset all predictors
    it.leftNz[8] = 0;
  } else {
    it.nz[0] &= (1 << 24);  // preserve the dc_nz bit
  }
};

/**
 * @param {VP8Encoder} enc
 * @return {boolean}
 */
VP8EncLoop = function(enc) {
  var ok = 1;
  var it = new VP8EncIterator();
  var info = new VP8ModeScore();
  var dontUseSkip = !enc.proba.useSkipProba;
  var kAverageBytesPerMB = 5;     // TODO: have a kTable[quality/10]
  var bytesPerParts = enc.mbW * enc.mbH * kAverageBytesPerMB;

  if (debug.isEnabled()) {
    debug.dumpEncoder("VP8EncLoop.START", enc);
  }

  // Initialize the bit-writers
  VP8BitWriterInit(enc.part1, bytesPerParts);

  ResetStats(enc);

  VP8IteratorInit(enc, it);
  do {
    VP8IteratorImport(it);
    // Warning! order is important: first call VP8Decimate() and
    // *then* decide how to code the skip decision if there's one.
    if (!VP8Decimate(it, info) || dontUseSkip) {
      CodeResiduals(it.bw, it, info);
    } else {   // reset predictors after a skip
      ResetAfterSkip(it);
    }
  } while (ok && VP8IteratorNext(it, it.yuvOut));

  if (ok) {      // Finalize the partitions, check for extra errors.
    VP8BitWriterFinish(enc.part1);
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

var kHeaderSizeEstimate = 15 + 20 + 10;      // TODO: fix better


/**
 * @param {VP8Encoder} enc
 * @param {number} q
 * @param {number} nbMbs
 * @return {boolean}
 */
OneStatPass = function(enc, q, nbMbs) {
  var it = new VP8EncIterator();
  var size = 0;
  var distortion = 0;
  var pixelCount = nbMbs * 384;

  VP8SetSegmentParams(enc, q);      // setup segment quantizations and filters

  ResetStats(enc);
  ResetTokenStats(enc);

  VP8IteratorInit(enc, it);
  do {
    var info = new VP8ModeScore();
    VP8IteratorImport(it);
    if (VP8Decimate(it, info)) {
      // Just record the number of skips and act like skip_proba is not used.
      enc.proba.nbSkip++;
    }
    RecordResiduals(it, info);
    size += info.R;
    distortion += info.D;
  } while (VP8IteratorNext(it, it.yuvOut) && --nbMbs > 0);
  size += FinalizeSkipProba(enc);
  size += FinalizeTokenProbas(enc);
  size += enc.segmentHdr.size;
  size = ((size + 1024) >> 11) + kHeaderSizeEstimate;

  return size > 0;
};

/**
 * @param {VP8Encoder} enc
 * @return {boolean}
 */
VP8StatLoop = function(enc) {
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

  result = OneStatPass(enc, q, nbMbs);

  if (debug.isEnabled()) {
    debug.dumpEncoder("VP8StatLoop.END", enc);
  }

  return result;
}

});
