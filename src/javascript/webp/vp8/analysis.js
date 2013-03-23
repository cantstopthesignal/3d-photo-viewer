// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.Analysis');

goog.require('webp.vp8.Constants');
goog.require('webp.vp8.Cost');
goog.require('webp.vp8.Iterator');
goog.require('webp.vp8.Quant');
goog.require('webp.vp8.debug');

goog.scope(function() {

var debug = webp.vp8.debug;

//------------------------------------------------------------------------------
// Main analysis loop:
// Collect all susceptibilities for each macroblock and record their
// distribution in alphas[]. Segments is assigned a-posteriori, based on
// this histogram.
// We also pick an intra16 prediction mode, which shouldn't be considered
// final except for fast-encode settings. We can also pick some intra4 modes
// and decide intra4/intra16, but that's usually almost always a bad choice at
// this stage.
/**
 * @param {VP8Encoder} enc
 * @return {boolean}
 */
VP8EncAnalyze = function(enc) {
  var alphas = new Int32Array(256);
  var it = new VP8EncIterator();

  if (debug.isEnabled()) {
    debug.dumpEncoder("VP8EncAnalyze.START", enc);
  }

  VP8IteratorInit(enc, it);

  enc.uvAlpha = 0;
  do {
    VP8IteratorImport(it);
    MBAnalyze(it, alphas);
    // Let's pretend we have perfect lossless reconstruction.
  } while (VP8IteratorNext(it, it.yuvIn));
  enc.uvAlpha = parseInt(enc.uvAlpha / (enc.mbW * enc.mbH));
  AssignSegments(enc, alphas);

  if (debug.isEnabled()) {
    debug.dumpEncoder("VP8EncAnalyze.END", enc);
  }
  return true;
};

var MAX_ITERS_K_MEANS = 6;

/**
 * @param {VP8EncIterator} it
 * @param {Int32Array} alphas
 */
MBAnalyze = function(it, alphas) {
  var enc = it.enc;

  VP8SetIntra16Mode(it, 0);  // default: Intra16, DC_PRED
  VP8SetSkip(it, 0);         // not skipped
  VP8SetSegment(it, 0);      // default segment, spec-wise.

  var bestAlpha = MBAnalyzeBestIntra16Mode(it);
  bestAlpha = MBAnalyzeBestIntra4Mode(it, bestAlpha);
  var bestUvAlpha = MBAnalyzeBestUVMode(it);

  // Final susceptibility mix
  bestAlpha = parseInt((bestAlpha + bestUvAlpha + 1) / 2);
  alphas[bestAlpha]++;
  enc.uvAlpha += bestUvAlpha;
  it.enc.mbInfo[it.mbIdx].alpha = bestAlpha;   // Informative only.
};

/** @param {VP8EncIterator} it */
MBAnalyzeBestIntra16Mode = function(it) {
  var maxMode = 4;
  var bestAlpha = -1;
  var bestMode = 0;

  VP8MakeLuma16Preds(it);
  for (var mode = 0; mode < maxMode; ++mode) {
    var alpha = VP8CollectHistogram(it.yuvIn.subarray(Y_OFF),
        it.yuvP.subarray(VP8I16ModeOffsets[mode]), 0, 16);
    if (alpha > bestAlpha) {
      bestAlpha = alpha;
      bestMode = mode;
    }
  }
  VP8SetIntra16Mode(it, bestMode);
  return bestAlpha;
};

/*
static int ClipAlpha(int alpha) {
  return alpha < 0 ? 0 : alpha > 255 ? 255 : alpha;
}
*/

//------------------------------------------------------------------------------
// Finalize Segment probability based on the coding tree

/**
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
GetProba = function(a, b) {
  var total = a + b;
  if (total == 0) {
    return 255;  // that's the default probability.
  }
  return parseInt((255 * a + total / 2) / total);
};

/** @param {VP8Encoder} enc */
SetSegmentProbas = function(enc) {
  var p = new Int32Array(NUM_MB_SEGMENTS);

  for (var n = 0; n < enc.mbW * enc.mbH; ++n) {
    var mb = enc.mbInfo[n];
    p[mb.segment]++;
  }
  if (enc.segmentHdr.numSegments > 1) {
    var probas = enc.proba.segments;
    probas[0] = GetProba(p[0] + p[1], p[2] + p[3]);
    probas[1] = GetProba(p[0], p[1]);
    probas[2] = GetProba(p[2], p[3]);

    enc.segmentHdr.updateMap =
        (probas[0] != 255) || (probas[1] != 255) || (probas[2] != 255);
    enc.segmentHdr.size =
        p[0] * (VP8BitCost(0, probas[0]) + VP8BitCost(0, probas[1])) +
        p[1] * (VP8BitCost(0, probas[0]) + VP8BitCost(1, probas[1])) +
        p[2] * (VP8BitCost(1, probas[0]) + VP8BitCost(0, probas[2])) +
        p[3] * (VP8BitCost(1, probas[0]) + VP8BitCost(1, probas[2]));
  } else {
    enc.segmentHdr.updateMap = 0;
    enc.segmentHdr.size = 0;
  }
};

/**
 * @param {VP8Encoder} enc
 * @param {Int32Array} centers
 * @param {number} mid
 */
SetSegmentAlphas = function(enc, centers, mid) {
  var nb = enc.segmentHdr.numSegments;
  var min = centers[0];
  var max = centers[0];

  if (nb > 1) {
    for (var n = 0; n < nb; ++n) {
      if (min > centers[n]) min = centers[n];
      if (max < centers[n]) max = centers[n];
    }
  }
  if (max == min) {
    max = min + 1;
  }
  if (mid > max || mid < min) {
    throw Error('Illegal state');
  }
  for (var n = 0; n < nb; ++n) {
    var alpha = parseInt(255 * (centers[n] - mid) / (max - min));
    var beta = parseInt(255 * (centers[n] - min) / (max - min));
    enc.dqm[n].alpha = CLIP(alpha, -127, 127);
    enc.dqm[n].beta = CLIP(beta, 0, 255);
  }
};

//------------------------------------------------------------------------------
// Simplified k-Means, to assign Nb segments based on alpha-histogram

/**
 * @param {VP8Encoder} enc
 * @param {Int32Array} alphas
 */
AssignSegments = function(enc, alphas) {
  var nb = enc.segmentHdr.numSegments;
  var centers = new Int32Array(NUM_MB_SEGMENTS);
  var weightedAverage = 0;
  var map = new Int32Array(256);
  var minA = 0;
  var maxA = 255;
  // 'int' type is ok for histo, and won't overflow
  var accum = new Int32Array(NUM_MB_SEGMENTS);
  var distAccum = new Int32Array(NUM_MB_SEGMENTS);

  // bracket the input
  for (var n = 0; n < 256 && alphas[n] == 0; ++n) {}
  minA = n;
  for (var n = 255; n > minA && alphas[n] == 0; --n) {}
  maxA = n;
  var rangeA = maxA - minA;

  // Spread initial centers evenly
  for (var n = 1, k = 0; n < 2 * nb; n += 2) {
    centers[k++] = minA + (n * rangeA) / (2 * nb);
  }

  for (var k = 0; k < MAX_ITERS_K_MEANS; ++k) {     // few iters are enough
    // Reset stats
    for (var n = 0; n < nb; ++n) {
      accum[n] = 0;
      distAccum[n] = 0;
    }
    // Assign nearest center for each 'a'
    n = 0;    // track the nearest center for current 'a'
    for (var a = minA; a <= maxA; ++a) {
      if (alphas[a]) {
        while (n < nb - 1 && Math.abs(a - centers[n + 1]) <
               Math.abs(a - centers[n])) {
          n++;
        }
        map[a] = n;
        // accumulate contribution into best centroid
        distAccum[n] += a * alphas[a];
        accum[n] += alphas[a];
      }
    }
    // All point are classified. Move the centroids to the
    // center of their respective cloud.
    var displaced = 0;
    weightedAverage = 0;
    var totalWeight = 0;
    for (var n = 0; n < nb; ++n) {
      if (accum[n]) {
        var newCenter = parseInt((distAccum[n] + accum[n] / 2) / accum[n]);
        displaced += Math.abs(centers[n] - newCenter);
        centers[n] = newCenter;
        weightedAverage += newCenter * accum[n];
        totalWeight += accum[n];
      }
    }
    weightedAverage = parseInt((weightedAverage + totalWeight / 2) / totalWeight);
    if (displaced < 5) break;   // no need to keep on looping...
  }

  // Map each original value to the closest centroid
  for (var n = 0; n < enc.mbW * enc.mbH; ++n) {
    var mb = enc.mbInfo[n];
    var alpha = mb.alpha;
    mb.segment = map[alpha];
    mb.alpha = centers[map[alpha]];     // just for the record.
  }

  SetSegmentProbas(enc);                             // Assign final proba
  SetSegmentAlphas(enc, centers, weightedAverage);  // pick some alphas.
}

/*
//------------------------------------------------------------------------------
// Macroblock analysis: collect histogram for each mode, deduce the maximal
// susceptibility and set best modes for this macroblock.
// Segment assignment is done later.

// Number of modes to inspect for alpha_ evaluation. For high-quality settings,
// we don't need to test all the possible modes during the analysis phase.
#define MAX_INTRA16_MODE 2
#define MAX_INTRA4_MODE  2
#define MAX_UV_MODE      2

*/

/**
 * @param {VP8EncIterator} it
 * @param {number} bestAlpha
 * @return {number}
 */
MBAnalyzeBestIntra4Mode = function(it, bestAlpha) {
  var modes = new Uint8Array(16);
  var maxMode = NUM_BMODES;
  var i4Alpha = 0;
  VP8IteratorStartI4(it);
  do {
    var bestModeAlpha = -1;
    var src = it.yuvIn.subarray(Y_OFF + VP8Scan[it.i4]);

    VP8MakeIntra4Preds(it);
    for (var mode = 0; mode < maxMode; ++mode) {
      var alpha = VP8CollectHistogram(src,
          it.yuvP.subarray(VP8I4ModeOffsets[mode]), 0, 1);
      if (alpha > bestModeAlpha) {
        bestModeAlpha = alpha;
        modes[it.i4] = mode;
      }
    }
    i4Alpha += bestModeAlpha;
    // Note: we reuse the original samples for predictors
  } while (VP8IteratorRotateI4(it, it.yuvIn.subarray(Y_OFF)));

  if (i4Alpha > bestAlpha) {
    VP8SetIntra4Mode(it, modes);
    bestAlpha = ClipAlpha(i4Alpha);
  }
  return bestAlpha;
};

/**
 * @param {VP8EncIterator} it
 * @return {number}
 */
MBAnalyzeBestUVMode = function(it) {
  var bestAlpha = -1;
  var bestMode = 0;
  var maxMode = 4;
  VP8MakeChroma8Preds(it);
  for (var mode = 0; mode < maxMode; ++mode) {
    var alpha = VP8CollectHistogram(it.yuvIn.subarray(U_OFF),
                                    it.yuvP.subarray(VP8UVModeOffsets[mode]),
                                    16, 16 + 4 + 4);
    if (alpha > bestAlpha) {
      bestAlpha = alpha;
      bestMode = mode;
    }
  }
  VP8SetIntraUVMode(it, bestMode);
  return bestAlpha;
};

});
