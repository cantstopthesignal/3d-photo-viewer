// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.Iterator');

goog.scope(function() {

// Iterator structure to iterate through macroblocks, pointing to the
// right neighbouring data (samples, predictions, contexts, ...)
/** @constructor */
VP8EncIterator = function() {
  // int x_, y_;                      // current macroblock
  this.x = 0;
  this.y = 0;

  // int y_offset_, uv_offset_;       // offset to the luma / chroma planes
  this.yOffset = 0;
  this.uvOffset = 0;

  // int y_stride_, uv_stride_;       // respective strides
  this.yStride = 0;
  this.uvStride = 0;

  // uint8_t*      yuv_in_;           // borrowed from enc_ (for now)
  this.yuvIn = null;

  // uint8_t*      yuv_out_;          // ''
  this.yuvOut = null;

  // uint8_t*      yuv_out2_;         // ''
  this.yuvOut2 = null;

  // uint8_t*      yuv_p_;            // ''
  this.yuvP = null;

  // VP8Encoder*   enc_;              // back-pointer
  this.enc = null;

  // VP8MBInfo*    mb_;               // current macroblock
  this.mbIdx = 0;  // macroblock index

  // VP8BitWriter* bw_;               // current bit-writer
  this.bw = null;

  // uint8_t*      preds_;            // intra mode predictors (4x4 blocks)
  this.preds = null;

  // uint32_t*     nz_;               // non-zero pattern
  this.nz = null;

  // uint8_t       i4_boundary_[37];  // 32+5 boundary samples needed by intra4x4
  this.i4Boundary = new Uint8Array(37);

  // uint8_t*      i4_top_;           // pointer to the current top boundary sample
  this.i4Top = null;

  // int           i4_;               // current intra4x4 mode being tested
  this.i4 = 0;

  // int           top_nz_[9];        // top-non-zero context.
  this.topNz = new Int32Array(9);

  // int           left_nz_[9];       // left-non-zero. left_nz[8] is independent.
  this.leftNz = new Int32Array(9);

  // uint64_t      bit_count_[4][3];  // bit counters for coded levels.
  this.bitCount = [];
  for (var i = 0; i < 4; i++) {
    this.bitCount.push([0, 0, 0]);
  }

  // uint64_t      luma_bits_;        // macroblock bit-cost for luma
  this.lumaBits = 0;

  // uint64_t      uv_bits_;          // macroblock bit-cost for chroma
  this.uvBits = 0;

  // int           done_;             // true when scan is finished
  this.done = 0;

  // int           percent0_;         // saved initial progress percent
  this.percent0 = 0;
};

/** @param {VP8EncIterator} it */
InitLeft = function(it) {
  enc = it.enc;

  var val = it.y > 0 ? 129 : 127;
  Uint8SetNeg(enc.yLeft, -1, val);
  Uint8SetNeg(enc.uLeft, -1, val);
  Uint8SetNeg(enc.vLeft, -1, val);
  for (var i = 0; i < 16; i++) {
    enc.yLeft[i] = 129;
  }
  for (var i = 0; i < 8; i++) {
    enc.uLeft[i] = 129;
    enc.vLeft[i] = 129;
  }
  it.leftNz[8] = 0;
};

/** @param {VP8EncIterator} it */
InitTop = function(it) {
  var enc = it.enc;
  var topSize = enc.mbW * 16;
  for (var i = 0; i < topSize; i++) {
    enc.yTop[i] = 127;
    enc.uvTop[i] = 127;
  }
  for (var i = 0; i < enc.mbW; i++) {
    enc.nz[i] = 0;
  }
};

/** @param {VP8EncIterator} it */
VP8IteratorReset = function(it) {
  var enc = it.enc;
  it.x = 0;
  it.y = 0;
  it.yOffset = 0;
  it.uvOffset = 0;
  it.mbIdx = 0;
  it.preds = enc.preds;
  it.nz = enc.nz;
  it.bw = enc.part1;
  it.done = enc.mbW * enc.mbH;
  InitTop(it);
  InitLeft(it);
  for (var i = 0; i < it.bitCount.length; i++) {
    it.bitCount[i] = 0;
  }
};

/**
 * @param {VP8Encoder} enc
 * @param {VP8EncIterator} it
 */
VP8IteratorInit = function(enc, it) {
  it.enc = enc;
  it.yStride  = enc.pic.yStride;
  it.uvStride = enc.pic.uvStride;
  // TODO(later): for multithreading, these should be owned by 'it'.
  it.yuvIn = enc.yuvIn;
  it.yuvOut = enc.yuvOut;
  it.yuvOut2 = enc.yuvOut2;
  it.yuvP = enc.yuvP;
  it.percent0 = enc.percent;
  VP8IteratorReset(it);
};

//------------------------------------------------------------------------------
// Import the source samples into the cache. Takes care of replicating
// boundary pixels if necessary.
/**
 * @param {Uint8Array} src
 * @param {number} srcStride
 * @param {Uint8Array} dst
 * @param {number} w
 * @param {number} h
 * @param {number} size
 */
ImportBlock = function(src, srcStride, dst, w, h, size) {
  var dstOffset = 0;
  var srcOffset = 0;
  for (var i = 0; i < h; ++i) {
    for (var j = 0; j < w; j++) {
      dst[dstOffset + j] = src[srcOffset + j];
    }
    if (w < size) {
      for (var j = 0; j < size - w; j++) {
        dst[dstOffset + w + j] = dst[dstOffset + w - 1];
      }
    }
    dstOffset += BPS;
    srcOffset += srcStride;
  }
  for (var i = h; i < size; ++i) {
    for (var j = 0; j < size; j++) {
      dst[dstOffset + j] = dst[dstOffset - BPS + j];
    }
    dstOffset += BPS;
  }
};

/** @param {VP8EncIterator} it */
VP8IteratorImport = function(it) {
  var enc = it.enc;
  var x = it.x;
  var y = it.y;
  var pic = enc.pic;
  var ysrc = pic.y.subarray((y * pic.yStride + x) * 16);
  var usrc = pic.u.subarray((y * pic.uvStride + x) * 8);
  var vsrc = pic.v.subarray((y * pic.uvStride + x) * 8);
  var ydst = it.yuvIn.subarray(Y_OFF);
  var udst = it.yuvIn.subarray(U_OFF);
  var vdst = it.yuvIn.subarray(V_OFF);
  var w = (pic.width - x * 16);
  var h = (pic.height - y * 16);

  if (w > 16) {
    w = 16;
  }
  if (h > 16) {
    h = 16;
  }

  // Luma plane
  ImportBlock(ysrc, pic.yStride, ydst, w, h, 16);

  {   // U/V planes
    var uvW = (w + 1) >> 1;
    var uvH = (h + 1) >> 1;
    ImportBlock(usrc, pic.uvStride, udst, uvW, uvH, 8);
    ImportBlock(vsrc, pic.uvStride, vdst, uvW, uvH, 8);
  }
};

//------------------------------------------------------------------------------
// Helper function to set mode properties

/**
 * @param {VP8EncIterator} it
 * @param {number} mode
 */
VP8SetIntra16Mode = function(it, mode) {
  var preds = it.preds;
  var predsOffset = 0;
  for (var y = 0; y < 4; ++y) {
    for (var i = 0; i < 4; i++) {
      preds[i + predsOffset] = mode;
    }
    predsOffset += it.enc.predsW;
  }
  it.enc.mbInfo[it.mbIdx].type = 1;
}

/**
 * @param {VP8EncIterator} it
 * @param {Uint8Array} modes
 */
VP8SetIntra4Mode = function(it, modes) {
  var preds = it.preds;
  var predsOffset = 0;
  var modesOffset = 0;
  for (var y = 4; y > 0; --y) {
    for (var i = 0; i < 4; i++) {
      preds[i + predsOffset] = modes[i + modesOffset];
    }
    predsOffset += it.enc.predsW;
    modesOffset += 4;
  }
  it.enc.mbInfo[it.mbIdx].type = 0;
};

/**
 * @param {VP8EncIterator} it
 * @param {number} mode
 */
VP8SetIntraUVMode = function(it, mode) {
  it.enc.mbInfo[it.mbIdx].uvMode = mode;
};

/**
 * @param {VP8EncIterator} it
 * @param {number} skip
 */
VP8SetSkip = function(it, skip) {
  it.enc.mbInfo[it.mbIdx].skip = skip;
};

/**
 * @param {VP8EncIterator} it
 * @param {number} segment
 */
VP8SetSegment = function(it, segment) {
  it.enc.mbInfo[it.mbIdx].segment = segment;
};

//------------------------------------------------------------------------------
// VP8Iterator
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// Non-zero contexts setup/teardown

// Nz bits:
//  0  1  2  3  Y
//  4  5  6  7
//  8  9 10 11
// 12 13 14 15
// 16 17        U
// 18 19
// 20 21        V
// 22 23
// 24           DC-intra16

/** @param {VP8EncIterator} it */
VP8IteratorNzToBytes = function(it) {
  // Convert packed context to byte array
  var BIT = function(nz, n) {
    return !!((nz) & (1 << (n)));
  };

  var tnz = it.nz[0];
  var lnz = Uint32GetNeg(it.nz, -1);
  var topNz = it.topNz;
  var leftNz = it.leftNz;

  // Top-Y
  topNz[0] = BIT(tnz, 12);
  topNz[1] = BIT(tnz, 13);
  topNz[2] = BIT(tnz, 14);
  topNz[3] = BIT(tnz, 15);
  // Top-U
  topNz[4] = BIT(tnz, 18);
  topNz[5] = BIT(tnz, 19);
  // Top-V
  topNz[6] = BIT(tnz, 22);
  topNz[7] = BIT(tnz, 23);
  // DC
  topNz[8] = BIT(tnz, 24);

  // left-Y
  leftNz[0] = BIT(lnz,  3);
  leftNz[1] = BIT(lnz,  7);
  leftNz[2] = BIT(lnz, 11);
  leftNz[3] = BIT(lnz, 15);
  // left-U
  leftNz[4] = BIT(lnz, 17);
  leftNz[5] = BIT(lnz, 19);
  // left-V
  leftNz[6] = BIT(lnz, 21);
  leftNz[7] = BIT(lnz, 23);
  // left-DC is special, iterated separately
}

/** @param {VP8EncIterator} it */
VP8IteratorBytesToNz = function(it) {
  var nz = 0;
  var topNz = it.topNz;
  var leftNz = it.leftNz;
  // top
  nz |= (topNz[0] << 12) | (topNz[1] << 13);
  nz |= (topNz[2] << 14) | (topNz[3] << 15);
  nz |= (topNz[4] << 18) | (topNz[5] << 19);
  nz |= (topNz[6] << 22) | (topNz[7] << 23);
  nz |= (topNz[8] << 24);  // we propagate the _top_ bit, esp. for intra4
  // left
  nz |= (leftNz[0] << 3) | (leftNz[1] << 7);
  nz |= (leftNz[2] << 11);
  nz |= (leftNz[4] << 17) | (leftNz[6] << 21);

  it.nz[0] = nz;
};

//------------------------------------------------------------------------------
// Advance to the next position, doing the bookeeping.

/**
 * @param {VP8EncIterator} it
 * @param {Uint8Array} blockToSave
 * @return {boolean}
 */
VP8IteratorNext = function(it, blockToSave) {
  var enc = it.enc;
  if (blockToSave) {
    var x = it.x;
    var y = it.y;
    if (x < enc.mbW - 1) {   // left
      for (var i = 0; i < 16; ++i) {
        enc.yLeft[i] = blockToSave[Y_OFF + 15 + i * BPS];
      }
      for (var i = 0; i < 8; ++i) {
        enc.uLeft[i] = blockToSave[U_OFF + 7 + i * BPS];
        enc.vLeft[i] = blockToSave[U_OFF + 15 + i * BPS];
      }
      // top-left (before 'top'!)
      Uint8SetNeg(enc.yLeft, -1, enc.yTop[x * 16 + 15]);
      Uint8SetNeg(enc.uLeft, -1, enc.uvTop[x * 16 + 0 + 7]);
      Uint8SetNeg(enc.vLeft, -1, enc.uvTop[x * 16 + 8 + 7]);
    }
    if (y < enc.mbH - 1) {  // top
      for (var i = 0; i < 16; i++) {
        enc.yTop[x * 16 + i] = blockToSave[Y_OFF + 15 * BPS + i];
      }
      for (var i = 0; i < 8 + 8; i++) {
        enc.uvTop[x * 16 + i] = blockToSave[U_OFF + 7 * BPS + i];
      }
    }
  }

  it.mbIdx++;
  it.preds = it.preds.subarray(4);
  it.nz = it.nz.subarray(1);
  it.x++;
  if (it.x == enc.mbW) {
    it.x = 0;
    it.y++;
    it.bw = enc.part1;
    it.preds = enc.preds.subarray(it.y * 4 * enc.predsW);
    it.nz = enc.nz;
    InitLeft(it);
  }
  return (0 < --it.done);
};

//------------------------------------------------------------------------------
// Intra4x4 sub-blocks iteration
//
//  We store and update the boundary samples into an array of 37 pixels. They
//  are updated as we iterate and reconstructs each intra4x4 blocks in turn.
//  The position of the samples has the following snake pattern:
//
// 16|17 18 19 20|21 22 23 24|25 26 27 28|29 30 31 32|33 34 35 36  <- Top-right
// --+-----------+-----------+-----------+-----------+
// 15|         19|         23|         27|         31|
// 14|         18|         22|         26|         30|
// 13|         17|         21|         25|         29|
// 12|13 14 15 16|17 18 19 20|21 22 23 24|25 26 27 28|
// --+-----------+-----------+-----------+-----------+
// 11|         15|         19|         23|         27|
// 10|         14|         18|         22|         26|
//  9|         13|         17|         21|         25|
//  8| 9 10 11 12|13 14 15 16|17 18 19 20|21 22 23 24|
// --+-----------+-----------+-----------+-----------+
//  7|         11|         15|         19|         23|
//  6|         10|         14|         18|         22|
//  5|          9|         13|         17|         21|
//  4| 5  6  7  8| 9 10 11 12|13 14 15 16|17 18 19 20|
// --+-----------+-----------+-----------+-----------+
//  3|          7|         11|         15|         19|
//  2|          6|         10|         14|         18|
//  1|          5|          9|         13|         17|
//  0| 1  2  3  4| 5  6  7  8| 9 10 11 12|13 14 15 16|
// --+-----------+-----------+-----------+-----------+

// Array to record the position of the top sample to pass to the prediction
// functions in dsp.c.
/** @type {Uint8Array} */
var VP8TopLeftI4 = new Uint8Array([
  17, 21, 25, 29,
  13, 17, 21, 25,
  9,  13, 17, 21,
  5,   9, 13, 17
]);

/** @param {VP8EncIterator} it */
VP8IteratorStartI4 = function(it) {
  var enc = it.enc;

  it.i4 = 0;    // first 4x4 sub-block
  it.i4Top = it.i4Boundary.subarray(VP8TopLeftI4[0]);

  // Import the boundary samples
  yLeftBuffOff = 1
  var yLeftBuf = Uint8Repoint(enc.yLeft, -yLeftBuffOff)
  for (var i = 0; i < 17; ++i) {    // left
    it.i4Boundary[i] = yLeftBuf[yLeftBuffOff + 15 - i];
  }
  for (var i = 0; i < 16; ++i) {    // top
    it.i4Boundary[17 + i] = enc.yTop[it.x * 16 + i];
  }
  // top-right samples have a special case on the far right of the picture
  if (it.x < enc.mbW - 1) {
    for (var i = 16; i < 16 + 4; ++i) {
      it.i4Boundary[17 + i] = enc.yTop[it.x * 16 + i];
    }
  } else {    // else, replicate the last valid pixel four times
    for (var i = 16; i < 16 + 4; ++i) {
      it.i4Boundary[17 + i] = it.i4Boundary[17 + 15];
    }
  }
  VP8IteratorNzToBytes(it);  // import the non-zero context
};

/**
 * @param {VP8EncIterator} it
 * @param {Uint8Array} yuvOut
 * @return {boolean}
 */
VP8IteratorRotateI4 = function(it, yuvOut) {
  var blkOffset = VP8Scan[it.i4];
  var topOffset = 4;
  var top = Uint8Repoint(it.i4Top, -topOffset);

  // Update the cache with 7 fresh samples
  for (var i = 0; i <= 3; ++i) {
    // store future top samples
    top[topOffset - 4 + i] = yuvOut[blkOffset + i + 3 * BPS];   
  }
  if ((it.i4 & 3) != 3) {  // if not on the right sub-blocks #3, #7, #11, #15
    for (var i = 0; i <= 2; ++i) {        // store future left samples
      top[topOffset + i] = yuvOut[blkOffset + 3 + (2 - i) * BPS];
    }
  } else {  // else replicate top-right samples, as says the specs.
    for (var i = 0; i <= 3; ++i) {
      top[topOffset + i] = top[topOffset + i + 4];
    }
  }
  // move pointers to next sub-block
  ++it.i4;
  if (it.i4 == 16) {    // we're done
    return false;
  }

  it.i4Top = it.i4Boundary.subarray(VP8TopLeftI4[it.i4]);
  return true;
};

});
