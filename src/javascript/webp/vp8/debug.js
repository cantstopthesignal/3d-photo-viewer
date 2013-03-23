// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.debug');

goog.scope(function() {

var debug = webp.vp8.debug;

/** @type {boolean} */
debug.enabled_ = false;

/** @type {boolean} */
debug.bitWriterVerbose_ = false;

/** @type {Element} */
debug.el_;

/** @type {string} */
debug.data_ = '';

/** @type {number} */
debug.timeoutId_;

debug.isEnabled = function() {
  return debug.enabled_;
};

debug.setEnabled = function(enabled) {
  this.enabled_ = enabled;
};

debug.clear = function() {
  debug.data_ = '';
  if (debug.el_) {
    goog.dom.removeNode(debug.el_);
    debug.el_ = null;
  }
};

debug.setBitWriterVerbose = function(verbose) {
  debug.bitWriterVerbose_ = verbose;
};

debug.getBitWriterVerbose = function() {
  return debug.bitWriterVerbose_;
};

debug.log = function(var_args) {
  if (!debug.isEnabled()) {
    return;
  }
  var msgA = [];
  for (var i = 0; i < arguments.length; i++) {
    msgA.push(new String(arguments[i]));
  }
  var msg = msgA.join(' ') + '\n';
  debug.data_ += msg;

  if (!debug.timeoutId_) {
    debug.timeoutId_ = window.setTimeout(function() {
      if (!debug.el_) {
        debug.el_ = document.createElement('pre');
        document.body.appendChild(debug.el_);
      }
      debug.el_.innerHTML = '';
      debug.el_.appendChild(document.createTextNode(debug.data_));
      debug.timeoutId_ = 0;
    }, 0);
  }
};

debug.addValueHash = function(oldVal, newVal) {
  return Math.abs((oldVal * 3 + Math.abs(newVal) + 1) & 0xfffffffff);
};

debug.checksumArrayDump = function(name, oldVal, arr) {
  return debug.checksumArray(name, oldVal, arr, 1)
};

debug.checksumArray = function(name, oldVal, arr, dump) {
  arr = new Uint8Array(arr.buffer);
  var val = oldVal;
  for (var i = 0; i < arr.length; i++) {
    if (dump && arr[i] != 0) {
      debug.log('ENC(' + name + ') SUB DUMP ' + i + ': ' + arr[i]);
    }
    val = debug.addValueHash(val, arr[i]);
  }
  if (dump) {
    debug.log('ENC(' + name + ') SUB DUMP COUNT', arr.length)
  }
  return val;
};

debug.dumpIterator = function(name, it) {
  debug.log(
    'ITER(' + name + ')', 'x', it.x, 'y', it.y, 'yOffset', it.yOffset,
    'uvOffset', it.uvOffset, 'yStride', it.yStride,
    'uvStride', it.uvStride, 'mbIdx', it.mbIdx,
    'i4', it.i4, 'done', it.done);
  debug.log(
    '  i4Boundary', debug.checksumArray(name, 0, it.i4Boundary),
    'topNz', debug.checksumArray(name, 0, it.topNz),
    'leftNz', debug.checksumArray(name, 0, it.leftNz));
  debug.log('');
};

debug.dumpMatrix = function(name, m) {
  debug.log(
    "    dqm." + name + ":",
    "q", debug.checksumArray(name, 0, m.q),
    "iq", debug.checksumArray(name, 0, m.iq),
    "bias", debug.checksumArray(name, 0, m.bias),
    "zthresh", debug.checksumArray(name, 0, m.zthresh),
    "sharpen", debug.checksumArray(name, 0, m.sharpen))
};

debug.dumpDqm = function(d, i) {
  debug.log("  dqm[" + i + "]:");
  debug.dumpMatrix("y1", d.y1);
  debug.dumpMatrix("y2", d.y2);
  debug.dumpMatrix("uv", d.uv);
  debug.log(
    "    alpha", d.alpha,
    "beta", d.beta,
    "quant", d.quant,
    "fstrength", d.fstrength,
    "lambdaI16", d.lambdaI16,
    "lambdaI4", d.lambdaI4)
  debug.log(
    "    lambdaUv", d.lambdaUv,
    "lambdaMode", d.lambdaMode,
    "lambdaTrellis", d.lambdaTrellis,
    "tlambda", d.tlambda,
    "lambdaTrellisI16", d.lambdaTrellisI16)
  debug.log(
    "    lambdaTrellisI4", d.lambdaTrellisI4,
    "lambdaTrellisUv", d.lambdaTrellisUv)
};

debug.dumpProba = function(p) {
  debug.log("  proba");
  debug.log(
    "    segments[0]", p.segments[0],
    "segments[1]", p.segments[1],
    "segments[2]", p.segments[2])
  debug.log(
    "    skipProba", p.skipProba,
    "dirty", p.dirty ? 1 : 0,
    "useSkipProba", p.useSkipProba ? 1 : 0,
    "nbSkip", p.nbSkip)
  var coeffsSum = 0, statsSum = 0, levelCostSum = 0
  for (var t = 0; t < NUM_TYPES; t++) {
    for (var b = 0; b < NUM_BANDS; b++) {
      for (var c = 0; c < NUM_CTX; c++) {
        coeffsSum = debug.checksumArray(
            "coeffs", coeffsSum, p.coeffs[t][b][c]);
        statsSum = debug.checksumArray(
            "stats", statsSum, p.stats[t][b][c]);
        levelCostSum = debug.checksumArray(
            "level_cost", levelCostSum, p.levelCost[t][b][c]);
      }
    }
  }
  debug.log(
    "    coeffs", coeffsSum,
    "stats", statsSum,
    "levelCost", levelCostSum);
}

debug.dumpMbInfo = function(info, i) {
  debug.log("  mbInfo[" + i + "]");
  debug.log(
    "    type", info.type,
    "uvMode", info.uvMode,
    "skip", info.skip ? 1 : 0,
    "segment", info.segment,
    "alpha", info.alpha)
};

debug.dumpBitWriter = function(name, bw) {
  debug.log(
    "  " + name, "range", bw.range,
    "value", bw.value,
    "run", bw.run,
    "nbBits", bw.nbBits,
    "pos", bw.pos,
    "maxPos", bw.maxPos,
    "error", bw.error);
  if (bw.maxPos) {
    if (bw.buf) {
      debug.log("    buf", debug.checksumArray(name, 0, bw.buf));
    } else {
      debug.log("    buf NULL");
    }
  } else {
    debug.log("    buf EMPTY");
  }
}

debug.dumpEncoder = function(name, enc) {
  debug.dumpEncoderEx(name, enc, false);
}

debug.dumpEncoderFull = function(name, enc) {
  debug.dumpEncoderEx(name, enc, true);
}

debug.dumpEncoderEx = function(name, enc, full) {
  debug.log(
    'ENC(' + name + ')', 'mbW', enc.mbW, 'mbH', enc.mbH, 'predsW', enc.predsW,
    'yuvIn', debug.checksumArray(name, 0, enc.yuvIn),
    'yuvOut', debug.checksumArray(name, 0, enc.yuvOut),
    'yuvOut2', debug.checksumArray(name, 0, enc.yuvOut2),
    'yuvP', debug.checksumArray(name, 0, enc.yuvP),
    'preds', debug.checksumArray(name, 0, enc.preds));
  if (full) {
    debug.log(
      '  nz', debug.checksumArray(name, 0, enc.nz),
      'yTop', debug.checksumArray(name, 0, enc.yTop),
      'uvTop', debug.checksumArray(name, 0, enc.uvTop),
      'y+u+vLeft', debug.checksumArray(name, 0, enc.yLeft));
    debug.log(
      '  segmentHdr: numSegments', enc.segmentHdr.numSegments,
      'updateMap', enc.segmentHdr.updateMap ? 1 : 0,
      'size', enc.segmentHdr.size);
    debug.log(
      "  filterHdr: simple", enc.filterHdr.simple,
      "level", enc.filterHdr.level,
      "sharpness", enc.filterHdr.sharpness,
      "i4x4LfDelta", enc.filterHdr.i4x4LfDelta);
    debug.log(
      "  baseQuant", enc.baseQuant,
      "uvAlpha", enc.uvAlpha,
      "dqY1Dc", enc.dqY1Dc,
      "dqY2Dc", enc.dqY2Dc,
      "dqY2Ac", enc.dqY2Ac,
      "dqUvDc", enc.dqUvDc,
      "dqUvAc", enc.dqUvAc)
    for (var i = 0; i < NUM_MB_SEGMENTS; i++) {
      debug.dumpDqm(enc.dqm[i], i);
    }
    debug.dumpProba(enc.proba);
    for (var i = 0; i < enc.mbW * enc.mbH; i++) {
      debug.dumpMbInfo(enc.mbInfo[i], i);
    }
  }
  debug.dumpBitWriter("bw", enc.bw);
  debug.dumpBitWriter("part1", enc.part1);
  debug.log('');
};

debug.int64ToStr = function(input) {
  if (Math.abs(input) > 0xffffffff) {
    output = "" + input;
    return output.substr(0, 12) + '_BIG';
  }
  return "" + input;
};

debug.dumpModeScore = function(name, info) {
  debug.log(
    "ModeScore(" + name + ") D", debug.int64ToStr(info.D),
    "SD", debug.int64ToStr(info.SD),
    "R", debug.int64ToStr(info.R),
    "score", debug.int64ToStr(info.score))
  debug.log(
    "  modeI16", info.modeI16,
    "modeUv", info.modeUv,
    "nz", info.nz);
  debug.log(
    "  yDcLevels", debug.checksumArray(name, 0, info.yDcLevels),
    "modesI4", debug.checksumArray(name, 0, info.modesI4));
  for (var i = 0; i < 16; i++) {
    debug.log(
      "  yAcLevels[" + i + "]",
      debug.checksumArray(name, 0, info.yAcLevels[i]));
  }
  for (var i = 0; i < 4 + 4; i++) {
    debug.log(
      "  uvLevels[" + i + "]",
      debug.checksumArray(name, 0, info.uvLevels[i]));
  }
};

});
