// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.cost');

goog.require('webp.vp8.constants');


goog.scope(function() {

var constants = webp.vp8.constants;
var vp8 = webp.vp8;

// Cost of coding one event with probability 'proba'.
/**
 * @param {number} bit
 * @param {number} proba
 * @return {number}
 */
vp8.cost.VP8BitCost = function(bit, proba) {
  return !bit ? vp8.cost.VP8EntropyCost[proba] : vp8.cost.VP8EntropyCost[255 - proba];
};

//------------------------------------------------------------------------------
// Boolean-cost cost table

/** @type {Uint16Array} */
vp8.cost.VP8EntropyCost = new Uint16Array([
  1792, 1792, 1792, 1536, 1536, 1408, 1366, 1280, 1280, 1216,
  1178, 1152, 1110, 1076, 1061, 1024, 1024,  992,  968,  951,
   939,  911,  896,  878,  871,  854,  838,  820,  811,  794,
   786,  768,  768,  752,  740,  732,  720,  709,  704,  690,
   683,  672,  666,  655,  647,  640,  631,  622,  615,  607,
   598,  592,  586,  576,  572,  564,  559,  555,  547,  541,
   534,  528,  522,  512,  512,  504,  500,  494,  488,  483,
   477,  473,  467,  461,  458,  452,  448,  443,  438,  434,
   427,  424,  419,  415,  410,  406,  403,  399,  394,  390,
   384,  384,  377,  374,  370,  366,  362,  359,  355,  351,
   347,  342,  342,  336,  333,  330,  326,  323,  320,  316,
   312,  308,  305,  302,  299,  296,  293,  288,  287,  283,
   280,  277,  274,  272,  268,  266,  262,  256,  256,  256,
   251,  248,  245,  242,  240,  237,  234,  232,  228,  226,
   223,  221,  218,  216,  214,  211,  208,  205,  203,  201,
   198,  196,  192,  191,  188,  187,  183,  181,  179,  176,
   175,  171,  171,  168,  165,  163,  160,  159,  156,  154,
   152,  150,  148,  146,  144,  142,  139,  138,  135,  133,
   131,  128,  128,  125,  123,  121,  119,  117,  115,  113,
   111,  110,  107,  105,  103,  102,  100,   98,   96,   94,
    92,   91,   89,   86,   86,   83,   82,   80,   77,   76,
    74,   73,   71,   69,   67,   66,   64,   63,   61,   59,
    57,   55,   54,   52,   51,   49,   47,   46,   44,   43,
    41,   40,   38,   36,   35,   33,   32,   30,   29,   27,
    25,   24,   22,   21,   19,   18,   16,   15,   13,   12,
    10,    9,    7,    6,    4,    3
]);

//------------------------------------------------------------------------------
// Level cost tables

// For each given level, the following table gives the pattern of contexts to
// use for coding it (in [][0]) as well as the bit value to use for each
// context (in [][1]).
vp8.cost.VP8LevelCodes = [[0x001, 0x000], [0x007, 0x001], [0x00f, 0x005],
  [0x00f, 0x00d], [0x033, 0x003], [0x033, 0x003], [0x033, 0x023],
  [0x033, 0x023], [0x033, 0x023], [0x033, 0x023], [0x0d3, 0x013],
  [0x0d3, 0x013], [0x0d3, 0x013], [0x0d3, 0x013], [0x0d3, 0x013],
  [0x0d3, 0x013], [0x0d3, 0x013], [0x0d3, 0x013], [0x0d3, 0x093],
  [0x0d3, 0x093], [0x0d3, 0x093], [0x0d3, 0x093], [0x0d3, 0x093],
  [0x0d3, 0x093], [0x0d3, 0x093], [0x0d3, 0x093], [0x0d3, 0x093],
  [0x0d3, 0x093], [0x0d3, 0x093], [0x0d3, 0x093], [0x0d3, 0x093],
  [0x0d3, 0x093], [0x0d3, 0x093], [0x0d3, 0x093], [0x153, 0x053],
  [0x153, 0x053], [0x153, 0x053], [0x153, 0x053], [0x153, 0x053],
  [0x153, 0x053], [0x153, 0x053], [0x153, 0x053], [0x153, 0x053],
  [0x153, 0x053], [0x153, 0x053], [0x153, 0x053], [0x153, 0x053],
  [0x153, 0x053], [0x153, 0x053], [0x153, 0x053], [0x153, 0x053],
  [0x153, 0x053], [0x153, 0x053], [0x153, 0x053], [0x153, 0x053],
  [0x153, 0x053], [0x153, 0x053], [0x153, 0x053], [0x153, 0x053],
  [0x153, 0x053], [0x153, 0x053], [0x153, 0x053], [0x153, 0x053],
  [0x153, 0x053], [0x153, 0x053], [0x153, 0x053], [0x153, 0x153]
];

/**
 * @param {number} level
 * @param {Uint8Array} probas
 * @return {number}
 */
vp8.cost.VariableLevelCost = function(level, probas) {
  var pattern = vp8.cost.VP8LevelCodes[level - 1][0];
  var bits = vp8.cost.VP8LevelCodes[level - 1][1];
  var cost = 0;
  for (var i = 2; pattern; ++i) {
    if (pattern & 1) {
      cost += vp8.cost.VP8BitCost(bits & 1, probas[i]);
    }
    bits = bits >> 1;
    pattern = pattern >> 1;
  }
  return cost;
};

//------------------------------------------------------------------------------
// Pre-calc level costs once for all

/** @param {webp.vp8.encode.VP8Proba} proba */
vp8.cost.VP8CalculateLevelCosts = function(proba) {
  if (!proba.dirty) {
    return;  // nothing to do.
  }

  for (var ctype = 0; ctype < constants.NUM_TYPES; ++ctype) {
    for (var band = 0; band < constants.NUM_BANDS; ++band) {
      for (var ctx = 0; ctx < constants.NUM_CTX; ++ctx) {
        var p = proba.coeffs[ctype][band][ctx];
        var table = proba.levelCost[ctype][band][ctx];
        var costBase = vp8.cost.VP8BitCost(1, p[1]);
        table[0] = vp8.cost.VP8BitCost(0, p[1]);
        for (var v = 1; v <= constants.MAX_VARIABLE_LEVEL; ++v) {
          table[v] = costBase + vp8.cost.VariableLevelCost(v, p);
        }
        // Starting at level 67 and up, the variable part of the cost is
        // actually constant.
      }
    }
  }
  proba.dirty = 0;
};

});