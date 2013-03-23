// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.BitWriter');

goog.require('webp.vp8.debug');

goog.scope(function() {

var debug = webp.vp8.debug;

/** @constructor */
VP8BitWriter = function() {
  // int32_t  range_;      // range-1
  this.range = 0;

  // int32_t  value_;
  this.value = 0;

  // int      run_;        // number of outstanding bits
  this.run = 0;

  // int      nb_bits_;    // number of pending bits
  this.nbBits = 0;

  // uint8_t* buf_;        // internal buffer. Re-allocated regularly. Not owned.
  this.buf = null;

  // size_t   pos_;
  this.pos = 0;

  // size_t   max_pos_;
  this.maxPos = 0;

  // int      error_;      // true in case of error
  this.error = 0;
};

// return approximate write position (in bits)
// static WEBP_INLINE uint64_t VP8BitWriterPos(const VP8BitWriter* const bw) {
/**
 * @param {VP8BitWriter} bw
 * @return {number}
 */
VP8BitWriterPos = function(bw) {
  return (bw.posP + bw.run) * 8 + 8 + bw.nbBits;
};

// Returns a pointer to the internal buffer.
/**
 * @param {VP8BitWriter} bw
 * @return {Uint8Array}
 */
VP8BitWriterBuf = function(bw) {
  return bw.buf;
};

// Returns the size of the internal buffer.
/**
 * @param {VP8BitWriter} bw
 * @return {number}
 */
VP8BitWriterSize = function(bw) {
  return bw.pos;
};

//------------------------------------------------------------------------------
// VP8BitWriter

// static int BitWriterResize(VP8BitWriter* const bw, size_t extra_size) {
/**
 * @param {VP8BitWriter} bw
 * @param {number} extraSize
 * @return {number}
 */
BitWriterResize = function(bw, extraSize) {
  var neededSize = bw.pos + extraSize;
  if (neededSize <= bw.maxPos) {
    return 1;
  }
  // If the following line wraps over 32bit, the test just after will catch it.
  var newSize = 2 * bw.maxPos;
  if (newSize < neededSize) {
    newSize = neededSize;
  }
  if (newSize < 1024) {
    newSize = 1024;
  }
  var newBuf = new Uint8Array(newSize);
  if (bw.buf && bw.pos > 0) {
    newBuf.set(bw.buf, 0, bw.pos);
  }
  bw.buf = newBuf;
  bw.maxPos = newSize;
  return 1;
};

/** @param {VP8BitWriter} bw */
kFlush = function(bw) {
  var s = 8 + bw.nbBits;
  var bits = bw.value >> s;
  if (bw.nbBits < 0) {
    throw Error('Invalid condition');
  }
  bw.value -= bits << s;
  bw.nbBits -= 8;
  if ((bits & 0xff) != 0xff) {
    var pos = bw.pos;
    if (!BitWriterResize(bw, bw.run + 1)) {
      return;
    }
    if (bits & 0x100) {  // overflow -> propagate carry over pending 0xff's
      if (pos > 0) {
        bw.buf[pos - 1]++;
      }
    }
    if (bw.run > 0) {
      var value = (bits & 0x100) ? 0x00 : 0xff;
      for (; bw.run > 0; --bw.run) {
        bw.buf[pos++] = value;
      }
    }
    bw.buf[pos++] = bits;
    bw.pos = pos;
  } else {
    bw.run++;   // delay writing of bytes 0xff, pending eventual carry.
  }
};

//------------------------------------------------------------------------------
// renormalization

// static const uint8_t kNorm[128] = {  // renorm_sizes[i] = 8 - log2(i)
kNorm = new Uint8Array([  // renorm_sizes[i] = 8 - log2(i)
     7, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4,
  3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  0
]);

// range = ((range + 1) << kVP8Log2Range[range]) - 1
// static const uint8_t kNewRange[128] = {
kNewRange = new Uint8Array([
  127, 127, 191, 127, 159, 191, 223, 127, 143, 159, 175, 191, 207, 223, 239,
  127, 135, 143, 151, 159, 167, 175, 183, 191, 199, 207, 215, 223, 231, 239,
  247, 127, 131, 135, 139, 143, 147, 151, 155, 159, 163, 167, 171, 175, 179,
  183, 187, 191, 195, 199, 203, 207, 211, 215, 219, 223, 227, 231, 235, 239,
  243, 247, 251, 127, 129, 131, 133, 135, 137, 139, 141, 143, 145, 147, 149,
  151, 153, 155, 157, 159, 161, 163, 165, 167, 169, 171, 173, 175, 177, 179,
  181, 183, 185, 187, 189, 191, 193, 195, 197, 199, 201, 203, 205, 207, 209,
  211, 213, 215, 217, 219, 221, 223, 225, 227, 229, 231, 233, 235, 237, 239,
  241, 243, 245, 247, 249, 251, 253, 127
]);

// int VP8PutBit(VP8BitWriter* const bw, int bit, int prob) {
/**
 * @param {VP8BitWriter} bw
 * @param {number} bit
 * @param {number} prob
 * @return {number}
 */
VP8PutBit = function(bw, bit, prob) {
  bit = bit ? 1 : 0
  var split = (bw.range * prob) >> 8;
  if (debug.getBitWriterVerbose()) {
    debug.log("VP8PutBit", bit, prob, split);
  }
  if (bit) {
    bw.value += split + 1;
    bw.range -= split + 1;
  } else {
    bw.range = split;
  }
  if (bw.range < 127) {   // emit 'shift' bits out and renormalize
    var shift = kNorm[bw.range];
    bw.range = kNewRange[bw.range];
    bw.value <<= shift;
    bw.nbBits += shift;
    if (bw.nbBits > 0) {
      kFlush(bw);
    }
  }
  return bit;
};

// int VP8PutBitUniform(VP8BitWriter* const bw, int bit) {
/**
 * @param {VP8BitWriter} bw
 * @param {number} bit
 * @return {number}
 */
VP8PutBitUniform = function(bw, bit) {
  var split = bw.range >> 1;
  if (bit) {
    bw.value += split + 1;
    bw.range -= split + 1;
  } else {
    bw.range = split;
  }
  if (bw.range < 127) {
    bw.range = kNewRange[bw.range];
    bw.value <<= 1;
    bw.nbBits += 1;
    if (bw.nbBits > 0) {
      kFlush(bw);
    }
  }
  return bit;
};

// void VP8PutValue(VP8BitWriter* const bw, int value, int nb_bits) {
/**
 * @param {VP8BitWriter} bw
 * @param {number} value
 * @param {number} nbBits
 */
VP8PutValue = function(bw, value, nbBits) {
  for (var mask = 1 << (nbBits - 1); mask; mask >>= 1) {
    VP8PutBitUniform(bw, value & mask);
  }
};

// void VP8PutSignedValue(VP8BitWriter* const bw, int value, int nb_bits) {
/**
 * @param {VP8BitWriter} bw
 * @param {number} value
 * @param {number} nbBits
 */
VP8PutSignedValue = function(bw, value, nbBits) {
  if (!VP8PutBitUniform(bw, value != 0)) {
    return;
  }
  if (value < 0) {
    VP8PutValue(bw, ((-value) << 1) | 1, nbBits + 1);
  } else {
    VP8PutValue(bw, value << 1, nbBits + 1);
  }
};

//------------------------------------------------------------------------------

// Initialize the object. Allocates some initial memory based on expected_size.
// int VP8BitWriterInit(VP8BitWriter* const bw, size_t expected_size) {
/**
 * @param {VP8BitWriter} bw
 * @param {number} expectedSize
 * @return {number}
 */
VP8BitWriterInit = function(bw, expectedSize) {
  bw.range   = 255 - 1;
  bw.value   = 0;
  bw.run     = 0;
  bw.nbBits = -8;
  bw.pos     = 0;
  bw.maxPos  = 0;
  bw.error   = 0;
  bw.buf     = null;
  return (expectedSize > 0) ? BitWriterResize(bw, expectedSize) : 1;
}

/**
 * @param {VP8BitWriter} bw
 * @return {Uint8Array}
 */
VP8BitWriterFinish = function(bw) {
  VP8PutValue(bw, 0, 9 - bw.nbBits);
  bw.nbBits = 0;   // pad with zeroes
  kFlush(bw);
  return bw.buf;
};

/** @param {VP8BitWriter} bw */
VP8BitWriterWipeOut = function(bw) {
  if (bw) {
    bw.range = 0;
    bw.value = 0;
    bw.run = 0;
    bw.nbBits = 0;
    bw.buf = null;
    bw.pos = 0;
    bw.maxPos = 0;
    bw.error = 0;
  }
};

});
