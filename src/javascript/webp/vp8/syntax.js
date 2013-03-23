// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.Syntax');

goog.require('webp.vp8.debug');

goog.scope(function() {

var debug = webp.vp8.debug;

//------------------------------------------------------------------------------
// Helper functions

/**
 * @param {Uint8Array} data
 * @param {number} dataSize
 * @param {WebPPicture} pic
 * @param {string} debugName
 * @return {boolean}
 */
WriteToPic = function(data, dataSize, pic, debugName) {
  if (debug.isEnabled()) {
    var debugBuf = new Uint8Array(data.subarray(0, dataSize));
    debug.log("WriteToPic(" + debugName + ") data",
        debug.checksumArray("WriteToPic", 0, debugBuf),
        "size", dataSize);
  }
  return pic.writer.write(data, dataSize, pic);
};

// TODO(later): Move to webp/format_constants.h?
/**
 * @param {Uint8Array} data
 * @param {number} val
 */
PutLE24 = function(data, val) {
  data[0] = (val >>  0) & 0xff;
  data[1] = (val >>  8) & 0xff;
  data[2] = (val >> 16) & 0xff;
};

/**
 * @param {Uint8Array} data
 * @param {number} val
 */
PutLE32 = function(data, val) {
  PutLE24(data, val);
  data[3] = (val >> 24) & 0xff;
};

/**
 * @param {WebPPicture} pic
 * @return {boolean}
 */
PutPaddingByte = function(pic) {
  return !!WriteToPic(new Uint8Array(1), 1, pic, "Padding");
};

//------------------------------------------------------------------------------
// Writers for header's various pieces (in order of appearance)

/**
 * @param {VP8Encoder} enc
 * @param {number} riffSize
 * @return {WebPEncodingError}
 */
PutRIFFHeader = function(enc, riffSize) {
  function code(c) {
    return c.charCodeAt(0);
  }
  var pic = enc.pic;
  var riff = new Uint8Array([
    code('R'), code('I'), code('F'), code('F'), 0, 0, 0, 0,
    code('W'), code('E'), code('B'), code('P')
  ]);
  if (riff.length != RIFF_HEADER_SIZE) {
    throw Error('Illegal state');
  }
  PutLE32(riff.subarray(TAG_SIZE), riffSize);
  if (!WriteToPic(riff, riff.length, pic, "RIFF")) {
    return WebPEncodingError.VP8_ENC_ERROR_BAD_WRITE;
  }
  return WebPEncodingError.VP8_ENC_OK;
}

/**
 * @param {WebPPicture} pic
 * @param {number} vp8Size
 * @return {WebPEncodingError}
 */
PutVP8Header = function(pic, vp8Size) {
  function code(c) {
    return c.charCodeAt(0);
  }
  var vp8ChunkHdr = new Uint8Array([
    code('V'), code('P'), code('8'), code(' '), 0, 0, 0, 0
  ]);
  if (vp8ChunkHdr.length != CHUNK_HEADER_SIZE) {
    throw Error('Illegal state');
  }
  PutLE32(vp8ChunkHdr.subarray(TAG_SIZE), vp8Size);
  if (!WriteToPic(vp8ChunkHdr, CHUNK_HEADER_SIZE, pic, "Header")) {
    return WebPEncodingError.VP8_ENC_ERROR_BAD_WRITE;
  }
  return WebPEncodingError.VP8_ENC_OK;
};

/**
 * @param {WebPPicture} pic
 * @param {number} size0
 * @return {WebPEncodingError}
 */
PutVP8FrameHeader = function(pic, size0) {
  var vp8FrmHdr = new Uint8Array(VP8_FRAME_HEADER_SIZE);
  var profile = 2;

  if (size0 >= VP8_MAX_PARTITION0_SIZE) {  // partition #0 is too big to fit
    return WebPEncodingError.VP8_ENC_ERROR_PARTITION0_OVERFLOW;
  }

  // Paragraph 9.1.
  var bits = 0                     // keyframe (1b)
       | (profile << 1)            // profile (3b)
       | (1 << 4)                  // visible (1b)
       | (size0 << 5);             // partition length (19b)
  vp8FrmHdr[0] = (bits >>  0) & 0xff;
  vp8FrmHdr[1] = (bits >>  8) & 0xff;
  vp8FrmHdr[2] = (bits >> 16) & 0xff;
  // signature
  vp8FrmHdr[3] = (VP8_SIGNATURE >> 16) & 0xff;
  vp8FrmHdr[4] = (VP8_SIGNATURE >>  8) & 0xff;
  vp8FrmHdr[5] = (VP8_SIGNATURE >>  0) & 0xff;
  // dimensions
  vp8FrmHdr[6] = pic.width & 0xff;
  vp8FrmHdr[7] = pic.width >> 8;
  vp8FrmHdr[8] = pic.height & 0xff;
  vp8FrmHdr[9] = pic.height >> 8;

  if (!WriteToPic(vp8FrmHdr, VP8_FRAME_HEADER_SIZE, pic, "FrameHeader")) {
    return WebPEncodingError.VP8_ENC_ERROR_BAD_WRITE;
  }
  return WebPEncodingError.VP8_ENC_OK;
};

// WebP Headers.
// static int PutWebPHeaders(const VP8Encoder* const enc, size_t size0,
//                           size_t vp8_size, size_t riff_size) {
/**
 * @param {VP8Encoder} enc
 * @param {number} size0
 * @param {number} vp8Size
 * @param {number} riffSize
 * @return {boolean}
 */
PutWebPHeaders = function(enc, size0, vp8Size, riffSize) {
  var pic = enc.pic;
  var err = WebPEncodingError.VP8_ENC_OK;

  // RIFF header.
  err = PutRIFFHeader(enc, riffSize);
  if (err != WebPEncodingError.VP8_ENC_OK) {
    return false;
  }

  // VP8 header.
  err = PutVP8Header(pic, vp8Size);
  if (err != WebPEncodingError.VP8_ENC_OK) {
    return false;
  }

  // VP8 frame header.
  err = PutVP8FrameHeader(pic, size0);
  if (err != WebPEncodingError.VP8_ENC_OK) {
    return false;
  }

  // All OK.
  return true;
}

// Segmentation header
/**
 * @param {VP8BitWriter} bw
 * @param {VP8Encoder} enc
 */
PutSegmentHeader = function(bw, enc) {
  var hdr = enc.segmentHdr;
  var proba = enc.proba;
  if (VP8PutBitUniform(bw, (hdr.numSegments > 1))) {
    // We always 'update' the quant and filter strength values
    var updateData = 1;
    VP8PutBitUniform(bw, hdr.updateMap);
    if (VP8PutBitUniform(bw, updateData)) {
      // we always use absolute values, not relative ones
      VP8PutBitUniform(bw, 1);   // (segment_feature_mode = 1. Paragraph 9.3.)
      for (var s = 0; s < NUM_MB_SEGMENTS; ++s) {
        VP8PutSignedValue(bw, enc.dqm[s].quant, 7);
      }
      for (var s = 0; s < NUM_MB_SEGMENTS; ++s) {
        VP8PutSignedValue(bw, enc.dqm[s].fstrength, 6);
      }
    }
    if (hdr.updateMap) {
      for (var s = 0; s < 3; ++s) {
        if (VP8PutBitUniform(bw, (proba.segments[s] != 255))) {
          VP8PutValue(bw, proba.segments[s], 8);
        }
      }
    }
  }
};

// Filtering parameters header
/**
 * @param {VP8BitWriter} bw
 * @param {VP8FilterHeader} hdr
 */
PutFilterHeader = function(bw, hdr) {
  var useLfDelta = (hdr.i4x4LfDelta != 0);
  VP8PutBitUniform(bw, hdr.simple);
  VP8PutValue(bw, hdr.level, 6);
  VP8PutValue(bw, hdr.sharpness, 3);
  if (VP8PutBitUniform(bw, useLfDelta)) {
    // '0' is the default value for i4x4_lf_delta_ at frame #0.
    var needUpdate = (hdr.i4x4LfDelta != 0);
    if (VP8PutBitUniform(bw, needUpdate)) {
      // we don't use ref_lf_delta => emit four 0 bits
      VP8PutValue(bw, 0, 4);
      // we use mode_lf_delta for i4x4
      VP8PutSignedValue(bw, hdr.i4x4LfDelta, 6);
      VP8PutValue(bw, 0, 3);    // all others unused
    }
  }
};

// Nominal quantization parameters
/**
 * @param {VP8BitWriter} bw
 * @param {VP8Encoder} enc
 */
PutQuant = function(bw, enc) {
  VP8PutValue(bw, enc.baseQuant, 7);
  VP8PutSignedValue(bw, enc.dqY1Dc, 4);
  VP8PutSignedValue(bw, enc.dqY2Dc, 4);
  VP8PutSignedValue(bw, enc.dqY2Ac, 4);
  VP8PutSignedValue(bw, enc.dqUvDc, 4);
  VP8PutSignedValue(bw, enc.dqUvAc, 4);
};

//------------------------------------------------------------------------------

/**
 * @param {VP8Encoder} enc
 * @return {number}
 */
GeneratePartition0 = function(enc) {
  var bw = enc.bw;
  var mbSize = enc.mbW * enc.mbH;

  var pos1 = VP8BitWriterPos(bw);
  VP8BitWriterInit(bw, parseInt(mbSize * 7 / 8));  // ~7 bits per macroblock
  VP8PutBitUniform(bw, 0);   // colorspace
  VP8PutBitUniform(bw, 0);   // clamp type

  PutSegmentHeader(bw, enc);
  PutFilterHeader(bw, enc.filterHdr);
  VP8PutValue(bw, 0, 2); // partitions
  PutQuant(bw, enc);
  VP8PutBitUniform(bw, 0);   // no proba update
  VP8WriteProbas(bw, enc.proba);
  var pos2 = VP8BitWriterPos(bw);
  VP8CodeIntraModes(enc);
  VP8BitWriterFinish(bw);

  var pos3 = VP8BitWriterPos(bw);

  return !bw.error;
};

/**
 * @param {VP8Encoder} enc
 * @return {number}
 */
VP8EncWrite = function(enc) {
  var pic = enc.pic;
  var bw = enc.bw;
  var ok = 0;

  if (debug.isEnabled()) {
    debug.dumpEncoder("VP8EncWrite.START", enc);
  }

  // Partition #0 with header and partition sizes
  ok = !!GeneratePartition0(enc);

  // Compute VP8 size
  var vp8Size = VP8_FRAME_HEADER_SIZE + VP8BitWriterSize(bw);
  vp8Size += VP8BitWriterSize(enc.part1);
  var pad = vp8Size & 1;
  vp8Size += pad;

  // Compute RIFF size
  // At the minimum it is: "WEBPVP8 nnnn" + VP8 data size.
  var riffSize = TAG_SIZE + CHUNK_HEADER_SIZE + vp8Size;

  // Emit headers and partition #0
  {
    var part0 = VP8BitWriterBuf(bw);
    var size0 = VP8BitWriterSize(bw);
    ok = ok && PutWebPHeaders(enc, size0, vp8Size, riffSize)
        && WriteToPic(part0, size0, pic, "Part0");
    VP8BitWriterWipeOut(bw);    // will free the internal buffer.
  }

  // Token partitions
  {
    var buf = VP8BitWriterBuf(enc.part1);
    var size = VP8BitWriterSize(enc.part1);
    if (size) {
      ok = ok && WriteToPic(buf, size, pic, "Part1");
    }
    VP8BitWriterWipeOut(enc.part1);    // will free the internal buffer.
  }

  // Padding byte
  if (ok && pad) {
    ok = PutPaddingByte(pic);
  }
  if (debug.isEnabled()) {
    debug.dumpEncoderFull("VP8EncWrite.END", enc);
  }
  return ok;
};

});
