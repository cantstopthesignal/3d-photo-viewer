// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.dsp');

goog.require('webp.vp8.constants');
goog.require('webp.vp8.debug');


goog.scope(function() {

var constants = webp.vp8.constants;
var debug = webp.vp8.debug;
var vp8 = webp.vp8;

var BPS = constants.BPS;

vp8.dsp.CreateClip1 = function() {
  var clip1 = new Uint8Array(255 + 510 + 1);
  for (var i = -255; i <= 255 + 255; ++i) {
    clip1[255 + i] = (i < 0) ? 0 : (i > 255) ? 255 : i;
  }
  return clip1;
};

//clips [-255,510] to [0,255]
vp8.dsp.CLIP1 = vp8.dsp.CreateClip1();

//------------------------------------------------------------------------------
// luma 16x16 prediction (paragraph 12.3)

/**
 * @param {Uint8Array} dst
 * @param {Uint8Array} left
 * @param {Uint8Array} top
 */
vp8.dsp.VP8EncPredLuma16 = function(dst, left, top) {
  vp8.dsp.DCMode(dst.subarray(constants.I16DC16), left, top, 16, 16, 5);
  vp8.dsp.VerticalPred(dst.subarray(constants.I16VE16), top, 16);
  vp8.dsp.HorizontalPred(dst.subarray(constants.I16HE16), left, 16);
  vp8.dsp.TrueMotion(dst.subarray(constants.I16TM16), left, top, 16);
};

//------------------------------------------------------------------------------
// Intra predictions

/**
 * @param {Uint8Array} dst
 * @param {number} value
 * @param {number} size
 */
vp8.dsp.Fill = function(dst, value, size) {
  for (var j = 0; j < size; ++j) {
    for (var k = 0; k < size; k++) {
      dst[j * BPS + k] = value;
    }
  }
};

/**
 * @param {Uint8Array} dst
 * @param {number} dstOff
 * @param {number} value
 * @param {number} size
 */
vp8.dsp.Fill2 = function(dst, dstOff, value, size) {
  for (var j = 0; j < size; ++j) {
    for (var k = 0; k < size; k++) {
      dst[dstOff + j * BPS + k] = value;
    }
  }
};

/**
 * @param {Uint8Array} dst
 * @param {Uint8Array} top
 * @param {number} size
 */
vp8.dsp.VerticalPred = function(dst, top, size) {
  if (top) {
    for (var j = 0; j < size; ++j) {
      for (var k = 0; k < size; k++) {
        dst[j * BPS + k] = top[k];
      }
    }
  } else {
    vp8.dsp.Fill(dst, 127, size);
  }
};

/**
 * @param {Uint8Array} dst
 * @param {Uint8Array} left
 * @param {number} size
 */
vp8.dsp.HorizontalPred = function(dst, left, size) {
  if (left) {
    for (var j = 0; j < size; ++j) {
      for (var k = 0; k < size; k++) {
        dst[j * BPS + k] = left[j];
      }
    }
  } else {
    vp8.dsp.Fill(dst, 129, size);
  }
}

/**
 * @param {Uint8Array} dst
 * @param {Uint8Array} left
 * @param {Uint8Array} top
 * @param {number} size
 */
vp8.dsp.TrueMotion = function(dst, left, top, size) {
  if (left) {
    if (top) {
      var clipOffset = 255 - vp8.utils.Uint8GetNeg(left, -1);
      var dstOff = 0;
      for (var y = 0; y < size; ++y) {
        var clipOffset2 = clipOffset + left[y];
        for (var x = 0; x < size; ++x) {
          dst[dstOff + x] = vp8.dsp.CLIP1[clipOffset2 + top[x]];
        }
        dstOff += BPS;
      }
    } else {
      vp8.dsp.HorizontalPred(dst, left, size);
    }
  } else {
    // true motion without left samples (hence: with default 129 value)
    // is equivalent to VE prediction where you just copy the top samples.
    // Note that if top samples are not available, the default value is
    // then 129, and not 127 as in the VerticalPred case.
    if (top) {
      vp8.dsp.VerticalPred(dst, top, size);
    } else {
      vp8.dsp.Fill(dst, 129, size);
    }
  }
};

/**
 * @param {Uint8Array} dst
 * @param {Uint8Array} left
 * @param {Uint8Array} top
 * @param {number} size
 * @param {number} round
 * @param {number} shift
 */
vp8.dsp.DCMode = function(dst, left, top, size, round, shift) {
  var DC = 0;
  if (top) {
    for (var j = 0; j < size; ++j) {
      DC += top[j];
    }
    if (left) {   // top and left present
      for (j = 0; j < size; ++j) {
        DC += left[j];
      }
    } else {      // top, but no left
      DC += DC;
    }
    DC = (DC + round) >> shift;
  } else if (left) {   // left but no top
    for (var j = 0; j < size; ++j) {
      DC += left[j];
    }
    DC += DC;
    DC = (DC + round) >> shift;
  } else {   // no top, no left, nothing.
    DC = 0x80;
  }
  vp8.dsp.Fill(dst, DC, size);
};

/**
 * @param {number} alpha
 * @return {number}
 */
vp8.dsp.ClipAlpha = function(alpha) {
  return alpha < 0 ? 0 : alpha > 255 ? 255 : alpha;
};

/**
 * @param {Int32Array} histo
 * @return {number}
 */
vp8.dsp.VP8GetAlpha = function(histo) {
  var num = 0, den = 0, val = 0;
  // note: changing this loop to avoid the numerous "k + 1" slows things down.
  for (var k = 0; k < constants.MAX_COEFF_THRESH; ++k) {
    if (histo[k + 1]) {
      val += histo[k + 1];
      num += val * (k + 1);
      den += (k + 1) * (k + 1);
    }
  }
  // we scale the value to a usable [0..255] range
  var alpha = parseInt(den ? 10 * num / den - 5 : 0, 10);
  return vp8.dsp.ClipAlpha(alpha);
}

/** @type {!Array.<number>} */
vp8.dsp.VP8DspScan = [
  // Luma
  0 +  0 * BPS,  4 +  0 * BPS, 8 +  0 * BPS, 12 +  0 * BPS,
  0 +  4 * BPS,  4 +  4 * BPS, 8 +  4 * BPS, 12 +  4 * BPS,
  0 +  8 * BPS,  4 +  8 * BPS, 8 +  8 * BPS, 12 +  8 * BPS,
  0 + 12 * BPS,  4 + 12 * BPS, 8 + 12 * BPS, 12 + 12 * BPS,

  0 + 0 * BPS,   4 + 0 * BPS, 0 + 4 * BPS,  4 + 4 * BPS,    // U
  8 + 0 * BPS,  12 + 0 * BPS, 8 + 4 * BPS, 12 + 4 * BPS     // V
];

/**
 * @param {Uint8Array} ref
 * @param {Uint8Array} pred
 * @param {number} startBlock
 * @param {number} endBlock
 */
vp8.dsp.VP8CollectHistogram = function(ref, pred, startBlock, endBlock) {
  var histo = new Int32Array(constants.MAX_COEFF_THRESH + 1);
  var out = new Int16Array(16);
  for (var j = startBlock; j < endBlock; ++j) {
    vp8.dsp.VP8FTransform(ref.subarray(vp8.dsp.VP8DspScan[j]),
        pred.subarray(vp8.dsp.VP8DspScan[j]), out);

    // Convert coefficients to bin (within out[]).
    for (var k = 0; k < 16; ++k) {
      var v = Math.abs(out[k]) >> 2;
      out[k] = (v > constants.MAX_COEFF_THRESH) ? constants.MAX_COEFF_THRESH : v;
    }

    // Use bin to update histogram.
    for (k = 0; k < 16; ++k) {
      histo[out[k]]++;
    }
  }

  return vp8.dsp.VP8GetAlpha(histo);
};

//------------------------------------------------------------------------------
// Transforms (Paragraph 14.4)

/**
 * @param {Uint8Array} refBuf
 * @param {Int16Array} inBuf
 * @param {Uint8Array} dstBuf
 */
vp8.dsp.VP8ITransformOne = function(refBuf, inBuf, dstBuf) {
  function store(x, y, v) {
    v = refBuf[x + y * BPS] + (v >> 3);
    dstBuf[x + y * BPS] = (!(v & ~0xff)) ? v : v < 0 ? 0 : 255;
  }
  function mul(a, b) {
    return (a * b) >> 16;
  }

  var kC1 = 20091 + (1 << 16);
  var kC2 = 35468;

  var tmp = new Int32Array(4 * 4);
  var tmpOffset = 0;
  var inOffset = 0;
  for (var i = 0; i < 4; ++i) {    // vertical pass
    var a = inBuf[inOffset + 0] + inBuf[inOffset + 8];
    var b = inBuf[inOffset + 0] - inBuf[inOffset + 8];
    var c = mul(inBuf[inOffset + 4], kC2) - mul(inBuf[inOffset + 12], kC1);
    var d = mul(inBuf[inOffset + 4], kC1) + mul(inBuf[inOffset + 12], kC2);
    tmp[tmpOffset + 0] = a + d;
    tmp[tmpOffset + 1] = b + c;
    tmp[tmpOffset + 2] = b - c;
    tmp[tmpOffset + 3] = a - d;
    tmpOffset += 4;
    inOffset++;
  }

  tmpOffset = 0;
  for (var i = 0; i < 4; ++i) {    // horizontal pass
    var dc = tmp[tmpOffset + 0] + 4;
    var a =  dc +  tmp[tmpOffset + 8];
    var b =  dc -  tmp[tmpOffset + 8];
    var c = mul(tmp[tmpOffset + 4], kC2) - mul(tmp[tmpOffset + 12], kC1);
    var d = mul(tmp[tmpOffset + 4], kC1) + mul(tmp[tmpOffset + 12], kC2);
    store(0, i, a + d);
    store(1, i, b + c);
    store(2, i, b - c);
    store(3, i, a - d);
    tmpOffset++;
  }
}

/**
 * @param {Uint8Array} refBuf
 * @param {Int16Array} inBuf
 * @param {Uint8Array} dstBuf
 * @param {boolean} doTwo
 */
vp8.dsp.VP8ITransform = function(refBuf, inBuf, dstBuf, doTwo) {
  vp8.dsp.VP8ITransformOne(refBuf, inBuf, dstBuf);
  if (doTwo) {
    vp8.dsp.VP8ITransformOne(refBuf.subarray(4), inBuf.subarray(16), dstBuf.subarray(4));
  }
};

/**
 * @param {Uint8Array} src
 * @param {Uint8Array} ref
 * @param {Int16Array} out
 */
vp8.dsp.VP8FTransform = function(src, ref, out) {
  var tmp = new Int32Array(16);
  var offset = 0;
  for (var i = 0; i < 4; ++i) {
    var d0 = src[offset + 0] - ref[offset + 0];
    var d1 = src[offset + 1] - ref[offset + 1];
    var d2 = src[offset + 2] - ref[offset + 2];
    var d3 = src[offset + 3] - ref[offset + 3];
    var a0 = (d0 + d3) << 3;
    var a1 = (d1 + d2) << 3;
    var a2 = (d1 - d2) << 3;
    var a3 = (d0 - d3) << 3;
    tmp[0 + i * 4] = (a0 + a1);
    tmp[1 + i * 4] = (a2 * 2217 + a3 * 5352 + 14500) >> 12;
    tmp[2 + i * 4] = (a0 - a1);
    tmp[3 + i * 4] = (a3 * 2217 - a2 * 5352 +  7500) >> 12;
    offset += BPS;
  }
  for (var i = 0; i < 4; ++i) {
    var a0 = (tmp[0 + i] + tmp[12 + i]);
    var a1 = (tmp[4 + i] + tmp[ 8 + i]);
    var a2 = (tmp[4 + i] - tmp[ 8 + i]);
    var a3 = (tmp[0 + i] - tmp[12 + i]);
    out[0 + i] = (a0 + a1 + 7) >> 4;
    out[4 + i] = ((a2 * 2217 + a3 * 5352 + 12000) >> 16) + (a3 != 0);
    out[8 + i] = (a0 - a1 + 7) >> 4;
    out[12+ i] = ((a3 * 2217 - a2 * 5352 + 51000) >> 16);
  }
};

/**
 * @param {Int16Array} inBuf
 * @param {Int16Array} outBuf
 */
vp8.dsp.VP8ITransformWHT = function(inBuf, outBuf) {
  var tmp = new Int32Array(16);
  for (var i = 0; i < 4; ++i) {
    var a0 = inBuf[0 + i] + inBuf[12 + i];
    var a1 = inBuf[4 + i] + inBuf[ 8 + i];
    var a2 = inBuf[4 + i] - inBuf[ 8 + i];
    var a3 = inBuf[0 + i] - inBuf[12 + i];
    tmp[0  + i] = a0 + a1;
    tmp[8  + i] = a0 - a1;
    tmp[4  + i] = a3 + a2;
    tmp[12 + i] = a3 - a2;
  }
  var outOffset = 0;
  for (var i = 0; i < 4; ++i) {
    var dc = tmp[0 + i * 4] + 3;    // w/ rounder
    var a0 = dc             + tmp[3 + i * 4];
    var a1 = tmp[1 + i * 4] + tmp[2 + i * 4];
    var a2 = tmp[1 + i * 4] - tmp[2 + i * 4];
    var a3 = dc             - tmp[3 + i * 4];
    outBuf[outOffset + 0]  = (a0 + a1) >> 3;
    outBuf[outOffset + 16] = (a3 + a2) >> 3;
    outBuf[outOffset + 32] = (a0 - a1) >> 3;
    outBuf[outOffset + 48] = (a3 - a2) >> 3;
    outOffset += 64;
  }
};

/**
 * @param {Int16Array} inBuf
 * @param {Int16Array} outBuf
 */
vp8.dsp.VP8FTransformWHT = function(inBuf, outBuf) {
  var tmp = new Int32Array(16);
  var inOffset = 0;
  for (var i = 0; i < 4; ++i) {
    var a0 = (inBuf[inOffset + 0 * 16] + inBuf[inOffset + 2 * 16]) << 2;
    var a1 = (inBuf[inOffset + 1 * 16] + inBuf[inOffset + 3 * 16]) << 2;
    var a2 = (inBuf[inOffset + 1 * 16] - inBuf[inOffset + 3 * 16]) << 2;
    var a3 = (inBuf[inOffset + 0 * 16] - inBuf[inOffset + 2 * 16]) << 2;
    tmp[0 + i * 4] = (a0 + a1) + (a0 != 0);
    tmp[1 + i * 4] = a3 + a2;
    tmp[2 + i * 4] = a3 - a2;
    tmp[3 + i * 4] = a0 - a1;
    inOffset += 64;
  }
  for (var i = 0; i < 4; ++i) {
    var a0 = (tmp[0 + i] + tmp[8 + i]);
    var a1 = (tmp[4 + i] + tmp[12+ i]);
    var a2 = (tmp[4 + i] - tmp[12+ i]);
    var a3 = (tmp[0 + i] - tmp[8 + i]);
    var b0 = a0 + a1;
    var b1 = a3 + a2;
    var b2 = a3 - a2;
    var b3 = a0 - a1;
    outBuf[ 0 + i] = (b0 + (b0 > 0) + 3) >> 3;
    outBuf[ 4 + i] = (b1 + (b1 > 0) + 3) >> 3;
    outBuf[ 8 + i] = (b2 + (b2 > 0) + 3) >> 3;
    outBuf[12 + i] = (b3 + (b3 > 0) + 3) >> 3;
  }
};

//------------------------------------------------------------------------------
// Chroma 8x8 prediction (paragraph 12.2)

/**
 * @param {Uint8Array} dst
 * @param {Uint8Array} left
 * @param {Uint8Array} top
 */
vp8.dsp.VP8EncPredChroma8 = function(dst, left, top) {
  // U block
  vp8.dsp.DCMode(dst.subarray(constants.C8DC8), left, top, 8, 8, 4);
  vp8.dsp.VerticalPred(dst.subarray(constants.C8VE8), top, 8);
  vp8.dsp.HorizontalPred(dst.subarray(constants.C8HE8), left, 8);
  vp8.dsp.TrueMotion(dst.subarray(constants.C8TM8), left, top, 8);
  // V block
  var dstOff = 8;
  if (top) {
    top = top.subarray(8)
  }
  if (left) {
    left = left.subarray(16)
  }
  vp8.dsp.DCMode(dst.subarray(dstOff + constants.C8DC8), left, top, 8, 8, 4);
  vp8.dsp.VerticalPred(dst.subarray(dstOff + constants.C8VE8), top, 8);
  vp8.dsp.HorizontalPred(dst.subarray(dstOff + constants.C8HE8), left, 8);
  vp8.dsp.TrueMotion(dst.subarray(dstOff + constants.C8TM8), left, top, 8);
};

//------------------------------------------------------------------------------
// luma 4x4 prediction

vp8.dsp.AVG3 = function(a, b, c) {
  return ((a) + 2 * (b) + (c) + 2) >> 2;
};

vp8.dsp.AVG2 = function(a, b) {
  return ((a) + (b) + 1) >> 1;
};

/**
 * @param {Uint8Array} dst
 * @param {number} dstOff
 * @param {Uint8Array} top
 * @param {number} topOff
 */
vp8.dsp.VE4 = function(dst, dstOff, top, topOff) {    // vertical
  var vals = new Uint8Array([
    vp8.dsp.AVG3(top[topOff-1], top[topOff+0], top[topOff+1]),
    vp8.dsp.AVG3(top[topOff+0], top[topOff+1], top[topOff+2]),
    vp8.dsp.AVG3(top[topOff+1], top[topOff+2], top[topOff+3]),
    vp8.dsp.AVG3(top[topOff+2], top[topOff+3], top[topOff+4])
  ]);
  for (var i = 0; i < 4; ++i) {
    for (var j = 0; j < 4; j++) {
      dst[dstOff + i*BPS+j] = vals[j];
    }
  }
}

/**
 * @param {Uint8Array} dst
 * @param {number} dstOff
 * @param {Uint8Array} top
 * @param {number} topOff
 */
vp8.dsp.HE4 = function(dst, dstOff, top, topOff) {    // horizontal
  var X = top[topOff - 1];
  var I = top[topOff - 2];
  var J = top[topOff - 3];
  var K = top[topOff - 4];
  var L = top[topOff - 5];
  var dst32 = new Uint32Array(dst.buffer, dst.byteOffset);
  // TODO TODO: Byte order?
  dst32[(dstOff + 0 * BPS) / 4] = 0x01010101 * vp8.dsp.AVG3(X, I, J);
  dst32[(dstOff + 1 * BPS) / 4] = 0x01010101 * vp8.dsp.AVG3(I, J, K);
  dst32[(dstOff + 2 * BPS) / 4] = 0x01010101 * vp8.dsp.AVG3(J, K, L);
  dst32[(dstOff + 3 * BPS) / 4] = 0x01010101 * vp8.dsp.AVG3(K, L, L);
};

/**
 * @param {Uint8Array} dst
 * @param {number} dstOff
 * @param {Uint8Array} top
 * @param {number} topOff
 */
vp8.dsp.DC4 = function(dst, dstOff, top, topOff) {
  var dc = 4;
  for (var i = 0; i < 4; ++i) {
    dc += top[topOff + i] + top[topOff - 5 + i];
  }
  vp8.dsp.Fill2(dst, dstOff, dc >> 3, 4);
};

/**
 * @param {Uint8Array} dst
 * @param {number} dstOff
 * @param {Uint8Array} top
 * @param {number} topOff
 */
vp8.dsp.RD4 = function(dst, dstOff, top, topOff) {
  var X = top[topOff - 1];
  var I = top[topOff - 2];
  var J = top[topOff - 3];
  var K = top[topOff - 4];
  var L = top[topOff - 5];
  var A = top[topOff];
  var B = top[topOff + 1];
  var C = top[topOff + 2];
  var D = top[topOff + 3];
  dst[dstOff+0+3*BPS]                                             = vp8.dsp.AVG3(J, K, L);
  dst[dstOff+0+2*BPS] = dst[dstOff+1+3*BPS]                       = vp8.dsp.AVG3(I, J, K);
  dst[dstOff+0+1*BPS] = dst[dstOff+1+2*BPS] = dst[dstOff+2+3*BPS] = vp8.dsp.AVG3(X, I, J);
  dst[dstOff+0+0*BPS] = dst[dstOff+1+1*BPS] = dst[dstOff+2+2*BPS] =
      dst[dstOff+3+3*BPS] = vp8.dsp.AVG3(A, X, I);
  dst[dstOff+1+0*BPS] = dst[dstOff+2+1*BPS] = dst[dstOff+3+2*BPS] = vp8.dsp.AVG3(B, A, X);
  dst[dstOff+2+0*BPS] = dst[dstOff+3+1*BPS]                       = vp8.dsp.AVG3(C, B, A);
  dst[dstOff+3+0*BPS]                                             = vp8.dsp.AVG3(D, C, B);
};

/**
 * @param {Uint8Array} dst
 * @param {number} dstOff
 * @param {Uint8Array} top
 * @param {number} topOff
 */
vp8.dsp.LD4 = function(dst, dstOff, top, topOff) {
  var A = top[topOff+0];
  var B = top[topOff+1];
  var C = top[topOff+2];
  var D = top[topOff+3];
  var E = top[topOff+4];
  var F = top[topOff+5];
  var G = top[topOff+6];
  var H = top[topOff+7];
  dst[dstOff+0+0*BPS]                                             = vp8.dsp.AVG3(A, B, C);
  dst[dstOff+1+0*BPS] = dst[dstOff+0+1*BPS]                       = vp8.dsp.AVG3(B, C, D);
  dst[dstOff+2+0*BPS] = dst[dstOff+1+1*BPS] = dst[dstOff+0+2*BPS] = vp8.dsp.AVG3(C, D, E);
  dst[dstOff+3+0*BPS] = dst[dstOff+2+1*BPS] = dst[dstOff+1+2*BPS] =
      dst[dstOff+0+3*BPS] = vp8.dsp.AVG3(D, E, F);
  dst[dstOff+3+1*BPS] = dst[dstOff+2+2*BPS] = dst[dstOff+1+3*BPS] = vp8.dsp.AVG3(E, F, G);
  dst[dstOff+3+2*BPS] = dst[dstOff+2+3*BPS]                       = vp8.dsp.AVG3(F, G, H);
  dst[dstOff+3+3*BPS]                                             = vp8.dsp.AVG3(G, H, H);
};

/**
 * @param {Uint8Array} dst
 * @param {number} dstOff
 * @param {Uint8Array} top
 * @param {number} topOff
 */
vp8.dsp.VR4 = function(dst, dstOff, top, topOff) {
  var X = top[topOff - 1];
  var I = top[topOff - 2];
  var J = top[topOff - 3];
  var K = top[topOff - 4];
  var A = top[topOff];
  var B = top[topOff + 1];
  var C = top[topOff + 2];
  var D = top[topOff + 3];
  dst[dstOff+0+0*BPS] = dst[dstOff+1+2*BPS] = vp8.dsp.AVG2(X, A);
  dst[dstOff+1+0*BPS] = dst[dstOff+2+2*BPS] = vp8.dsp.AVG2(A, B);
  dst[dstOff+2+0*BPS] = dst[dstOff+3+2*BPS] = vp8.dsp.AVG2(B, C);
  dst[dstOff+3+0*BPS]                       = vp8.dsp.AVG2(C, D);

  dst[dstOff+0+3*BPS]                       = vp8.dsp.AVG3(K, J, I);
  dst[dstOff+0+2*BPS]                       = vp8.dsp.AVG3(J, I, X);
  dst[dstOff+0+1*BPS] = dst[dstOff+1+3*BPS] = vp8.dsp.AVG3(I, X, A);
  dst[dstOff+1+1*BPS] = dst[dstOff+2+3*BPS] = vp8.dsp.AVG3(X, A, B);
  dst[dstOff+2+1*BPS] = dst[dstOff+3+3*BPS] = vp8.dsp.AVG3(A, B, C);
  dst[dstOff+3+1*BPS]                       = vp8.dsp.AVG3(B, C, D);
};

/**
 * @param {Uint8Array} dst
 * @param {number} dstOff
 * @param {Uint8Array} top
 * @param {number} topOff
 */
vp8.dsp.VL4 = function(dst, dstOff, top, topOff) {
  var A = top[topOff+0];
  var B = top[topOff+1];
  var C = top[topOff+2];
  var D = top[topOff+3];
  var E = top[topOff+4];
  var F = top[topOff+5];
  var G = top[topOff+6];
  var H = top[topOff+7];
  dst[dstOff+0+0*BPS]                       = vp8.dsp.AVG2(A, B);
  dst[dstOff+1+0*BPS] = dst[dstOff+0+2*BPS] = vp8.dsp.AVG2(B, C);
  dst[dstOff+2+0*BPS] = dst[dstOff+1+2*BPS] = vp8.dsp.AVG2(C, D);
  dst[dstOff+3+0*BPS] = dst[dstOff+2+2*BPS] = vp8.dsp.AVG2(D, E);

  dst[dstOff+0+1*BPS]                       = vp8.dsp.AVG3(A, B, C);
  dst[dstOff+1+1*BPS] = dst[dstOff+0+3*BPS] = vp8.dsp.AVG3(B, C, D);
  dst[dstOff+2+1*BPS] = dst[dstOff+1+3*BPS] = vp8.dsp.AVG3(C, D, E);
  dst[dstOff+3+1*BPS] = dst[dstOff+2+3*BPS] = vp8.dsp.AVG3(D, E, F);
                        dst[dstOff+3+2*BPS] = vp8.dsp.AVG3(E, F, G);
                        dst[dstOff+3+3*BPS] = vp8.dsp.AVG3(F, G, H);
};

/**
 * @param {Uint8Array} dst
 * @param {number} dstOff
 * @param {Uint8Array} top
 * @param {number} topOff
 */
vp8.dsp.HU4 = function(dst, dstOff, top, topOff) {
  var I = top[topOff - 2];
  var J = top[topOff - 3];
  var K = top[topOff - 4];
  var L = top[topOff - 5];
  dst[dstOff+0+0*BPS]                       = vp8.dsp.AVG2(I, J);
  dst[dstOff+2+0*BPS] = dst[dstOff+0+1*BPS] = vp8.dsp.AVG2(J, K);
  dst[dstOff+2+1*BPS] = dst[dstOff+0+2*BPS] = vp8.dsp.AVG2(K, L);
  dst[dstOff+1+0*BPS]                       = vp8.dsp.AVG3(I, J, K);
  dst[dstOff+3+0*BPS] = dst[dstOff+1+1*BPS] = vp8.dsp.AVG3(J, K, L);
  dst[dstOff+3+1*BPS] = dst[dstOff+1+2*BPS] = vp8.dsp.AVG3(K, L, L);
  dst[dstOff+3+2*BPS] = dst[dstOff+2+2*BPS] =
      dst[dstOff+0+3*BPS] = dst[dstOff+1+3*BPS] = dst[dstOff+2+3*BPS] =
      dst[dstOff+3+3*BPS] = L;
};

/**
 * @param {Uint8Array} dst
 * @param {number} dstOff
 * @param {Uint8Array} top
 * @param {number} topOff
 */
vp8.dsp.HD4 = function(dst, dstOff, top, topOff) {
  var X = top[topOff - 1];
  var I = top[topOff - 2];
  var J = top[topOff - 3];
  var K = top[topOff - 4];
  var L = top[topOff - 5];
  var A = top[topOff];
  var B = top[topOff + 1];
  var C = top[topOff + 2];

  dst[dstOff+0+0*BPS] = dst[dstOff+2+1*BPS] = vp8.dsp.AVG2(I, X);
  dst[dstOff+0+1*BPS] = dst[dstOff+2+2*BPS] = vp8.dsp.AVG2(J, I);
  dst[dstOff+0+2*BPS] = dst[dstOff+2+3*BPS] = vp8.dsp.AVG2(K, J);
  dst[dstOff+0+3*BPS]                       = vp8.dsp.AVG2(L, K);

  dst[dstOff+3+0*BPS]                       = vp8.dsp.AVG3(A, B, C);
  dst[dstOff+2+0*BPS]                       = vp8.dsp.AVG3(X, A, B);
  dst[dstOff+1+0*BPS] = dst[dstOff+3+1*BPS] = vp8.dsp.AVG3(I, X, A);
  dst[dstOff+1+1*BPS] = dst[dstOff+3+2*BPS] = vp8.dsp.AVG3(J, I, X);
  dst[dstOff+1+2*BPS] = dst[dstOff+3+3*BPS] = vp8.dsp.AVG3(K, J, I);
  dst[dstOff+1+3*BPS]                       = vp8.dsp.AVG3(L, K, J);
};

/**
 * @param {Uint8Array} dst
 * @param {number} dstOff
 * @param {Uint8Array} top
 * @param {number} topOff
 */
vp8.dsp.TM4 = function(dst, dstOff, top, topOff) {
  var clipOffset = 255 - top[topOff - 1];
  var dstOffO = dstOff
  for (var y = 0; y < 4; ++y) {
    var clipOffsetNew = clipOffset + top[topOff - 2 - y];
    for (var x = 0; x < 4; ++x) {
      dst[dstOff + x] = vp8.dsp.CLIP1[clipOffsetNew + top[topOff + x]];
    }
    dstOff += BPS;
  }
};

// Left samples are top[-5 .. -2], top_left is top[-1], top are
// located at top[0..3], and top right is top[4..7]
/**
 * @param {Uint8Array} dst
 * @param {Uint8Array} top
 */
vp8.dsp.VP8EncPredLuma4 = function(dst, top) {
  var topOff = 5
  top = vp8.utils.Uint8Repoint(top, -topOff)
  vp8.dsp.DC4(dst, constants.I4DC4, top, topOff);
  vp8.dsp.TM4(dst, constants.I4TM4, top, topOff);
  vp8.dsp.VE4(dst, constants.I4VE4, top, topOff);
  vp8.dsp.HE4(dst, constants.I4HE4, top, topOff);
  vp8.dsp.RD4(dst, constants.I4RD4, top, topOff);
  vp8.dsp.VR4(dst, constants.I4VR4, top, topOff);
  vp8.dsp.LD4(dst, constants.I4LD4, top, topOff);
  vp8.dsp.VL4(dst, constants.I4VL4, top, topOff);
  vp8.dsp.HD4(dst, constants.I4HD4, top, topOff);
  vp8.dsp.HU4(dst, constants.I4HU4, top, topOff);
};

//------------------------------------------------------------------------------
// Quantization
//

vp8.dsp.kZigzag = new Uint8Array([
  0, 1, 4, 8, 5, 2, 3, 6, 9, 12, 13, 10, 7, 11, 14, 15
]);

// Simple quantization
/**
 * @param {Int16Array} inBuf
 * @param {Int16Array} outBuf
 * @param {number} n
 * @param {webp.vp8.encode.VP8Matrix} mtx
 */
vp8.dsp.VP8EncQuantizeBlock = function(inBuf, outBuf, n, mtx) {
  var last = -1;
  for (; n < 16; ++n) {
    var j = vp8.dsp.kZigzag[n];
    var sign = (inBuf[j] < 0);
    var coeff = (sign ? -inBuf[j] : inBuf[j]) + mtx.sharpen[j];
    if (coeff > mtx.zthresh[j]) {
      var Q = mtx.q[j];
      var iQ = mtx.iq[j];
      var B = mtx.bias[j];
      outBuf[n] = vp8.utils.QUANTDIV(coeff, iQ, B);
      if (outBuf[n] > constants.MAX_LEVEL) {
        outBuf[n] = constants.MAX_LEVEL;
      }
      if (sign) {
        outBuf[n] = -outBuf[n];
      }
      inBuf[j] = outBuf[n] * Q;
      if (outBuf[n]) {
        last = n;
      }
    } else {
      outBuf[n] = 0;
      inBuf[j] = 0;
    }
  }
  return (last >= 0);
};

});