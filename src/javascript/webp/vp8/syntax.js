// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.vp8.syntax');

goog.require('webp.vp8.constants');
goog.require('webp.vp8.debug');


goog.scope(function() {

var constants = webp.vp8.constants;
var debug = webp.vp8.debug;
var vp8 = webp.vp8;

//------------------------------------------------------------------------------
// Helper functions

/**
 * @param {Uint8Array} data
 * @param {number} dataSize
 * @param {webp.picture.WebPPicture} pic
 * @param {string} debugName
 * @return {boolean}
 */
vp8.syntax.WriteToPic = function(data, dataSize, pic, debugName) {
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
vp8.syntax.PutLE24 = function(data, val) {
  data[0] = (val >>  0) & 0xff;
  data[1] = (val >>  8) & 0xff;
  data[2] = (val >> 16) & 0xff;
};

/**
 * @param {Uint8Array} data
 * @param {number} val
 */
vp8.syntax.PutLE32 = function(data, val) {
  vp8.syntax.PutLE24(data, val);
  data[3] = (val >> 24) & 0xff;
};

/**
 * @param {webp.picture.WebPPicture} pic
 * @return {boolean}
 */
vp8.syntax.PutPaddingByte = function(pic) {
  return !!vp8.syntax.WriteToPic(new Uint8Array(1), 1, pic, "Padding");
};

//------------------------------------------------------------------------------
// Writers for header's various pieces (in order of appearance)

/**
 * @param {webp.vp8.encode.VP8Encoder} enc
 * @param {number} riffSize
 * @return {webp.vp8.types.WebPEncodingError}
 */
vp8.syntax.PutRIFFHeader = function(enc, riffSize) {
  function code(c) {
    return c.charCodeAt(0);
  }
  var pic = enc.pic;
  var riff = new Uint8Array([
    code('R'), code('I'), code('F'), code('F'), 0, 0, 0, 0,
    code('W'), code('E'), code('B'), code('P')
  ]);
  if (riff.length != constants.RIFF_HEADER_SIZE) {
    throw Error('Illegal state');
  }
  vp8.syntax.PutLE32(riff.subarray(constants.TAG_SIZE), riffSize);
  if (!vp8.syntax.WriteToPic(riff, riff.length, pic, "RIFF")) {
    return vp8.types.WebPEncodingError.VP8_ENC_ERROR_BAD_WRITE;
  }
  return vp8.types.WebPEncodingError.VP8_ENC_OK;
}

/**
 * @param {webp.picture.WebPPicture} pic
 * @param {number} vp8Size
 * @return {webp.vp8.types.WebPEncodingError}
 */
vp8.syntax.PutVP8Header = function(pic, vp8Size) {
  function code(c) {
    return c.charCodeAt(0);
  }
  var vp8ChunkHdr = new Uint8Array([
    code('V'), code('P'), code('8'), code(' '), 0, 0, 0, 0
  ]);
  if (vp8ChunkHdr.length != constants.CHUNK_HEADER_SIZE) {
    throw Error('Illegal state');
  }
  vp8.syntax.PutLE32(vp8ChunkHdr.subarray(constants.TAG_SIZE), vp8Size);
  if (!vp8.syntax.WriteToPic(vp8ChunkHdr, constants.CHUNK_HEADER_SIZE, pic, "Header")) {
    return vp8.types.WebPEncodingError.VP8_ENC_ERROR_BAD_WRITE;
  }
  return vp8.types.WebPEncodingError.VP8_ENC_OK;
};

/**
 * @param {webp.picture.WebPPicture} pic
 * @param {number} size0
 * @return {webp.vp8.types.WebPEncodingError}
 */
vp8.syntax.PutVP8FrameHeader = function(pic, size0) {
  var vp8FrmHdr = new Uint8Array(constants.VP8_FRAME_HEADER_SIZE);
  var profile = 2;

  if (size0 >= constants.VP8_MAX_PARTITION0_SIZE) {  // partition #0 is too big to fit
    return vp8.types.WebPEncodingError.VP8_ENC_ERROR_PARTITION0_OVERFLOW;
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
  vp8FrmHdr[3] = (constants.VP8_SIGNATURE >> 16) & 0xff;
  vp8FrmHdr[4] = (constants.VP8_SIGNATURE >>  8) & 0xff;
  vp8FrmHdr[5] = (constants.VP8_SIGNATURE >>  0) & 0xff;
  // dimensions
  vp8FrmHdr[6] = pic.width & 0xff;
  vp8FrmHdr[7] = pic.width >> 8;
  vp8FrmHdr[8] = pic.height & 0xff;
  vp8FrmHdr[9] = pic.height >> 8;

  if (!vp8.syntax.WriteToPic(vp8FrmHdr, constants.VP8_FRAME_HEADER_SIZE, pic, "FrameHeader")) {
    return vp8.types.WebPEncodingError.VP8_ENC_ERROR_BAD_WRITE;
  }
  return vp8.types.WebPEncodingError.VP8_ENC_OK;
};

// WebP Headers.
// static int PutWebPHeaders(const VP8Encoder* const enc, size_t size0,
//                           size_t vp8_size, size_t riff_size) {
/**
 * @param {webp.vp8.encode.VP8Encoder} enc
 * @param {number} size0
 * @param {number} vp8Size
 * @param {number} riffSize
 * @return {boolean}
 */
vp8.syntax.PutWebPHeaders = function(enc, size0, vp8Size, riffSize) {
  var pic = enc.pic;
  var err = vp8.types.WebPEncodingError.VP8_ENC_OK;

  // RIFF header.
  err = vp8.syntax.PutRIFFHeader(enc, riffSize);
  if (err != vp8.types.WebPEncodingError.VP8_ENC_OK) {
    return false;
  }

  // VP8 header.
  err = vp8.syntax.PutVP8Header(pic, vp8Size);
  if (err != vp8.types.WebPEncodingError.VP8_ENC_OK) {
    return false;
  }

  // VP8 frame header.
  err = vp8.syntax.PutVP8FrameHeader(pic, size0);
  if (err != vp8.types.WebPEncodingError.VP8_ENC_OK) {
    return false;
  }

  // All OK.
  return true;
}

// Segmentation header
/**
 * @param {webp.vp8.bitwriter.VP8BitWriter} bw
 * @param {webp.vp8.encode.VP8Encoder} enc
 */
vp8.syntax.PutSegmentHeader = function(bw, enc) {
  var hdr = enc.segmentHdr;
  var proba = enc.proba;
  if (vp8.bitwriter.VP8PutBitUniform(bw, (hdr.numSegments > 1) ? 1 : 0)) {
    // We always 'update' the quant and filter strength values
    var updateData = 1;
    vp8.bitwriter.VP8PutBitUniform(bw, hdr.updateMap);
    if (vp8.bitwriter.VP8PutBitUniform(bw, updateData)) {
      // we always use absolute values, not relative ones
      vp8.bitwriter.VP8PutBitUniform(bw, 1);   // (segment_feature_mode = 1. Paragraph 9.3.)
      for (var s = 0; s < constants.NUM_MB_SEGMENTS; ++s) {
        vp8.bitwriter.VP8PutSignedValue(bw, enc.dqm[s].quant, 7);
      }
      for (var s = 0; s < constants.NUM_MB_SEGMENTS; ++s) {
        vp8.bitwriter.VP8PutSignedValue(bw, enc.dqm[s].fstrength, 6);
      }
    }
    if (hdr.updateMap) {
      for (var s = 0; s < 3; ++s) {
        if (vp8.bitwriter.VP8PutBitUniform(bw, (proba.segments[s] != 255) ? 1 : 0)) {
          vp8.bitwriter.VP8PutValue(bw, proba.segments[s], 8);
        }
      }
    }
  }
};

// Filtering parameters header
/**
 * @param {webp.vp8.bitwriter.VP8BitWriter} bw
 * @param {webp.vp8.encode.VP8FilterHeader} hdr
 */
vp8.syntax.PutFilterHeader = function(bw, hdr) {
  var useLfDelta = (hdr.i4x4LfDelta != 0);
  vp8.bitwriter.VP8PutBitUniform(bw, hdr.simple);
  vp8.bitwriter.VP8PutValue(bw, hdr.level, 6);
  vp8.bitwriter.VP8PutValue(bw, hdr.sharpness, 3);
  if (vp8.bitwriter.VP8PutBitUniform(bw, useLfDelta ? 1 : 0)) {
    // '0' is the default value for i4x4_lf_delta_ at frame #0.
    var needUpdate = (hdr.i4x4LfDelta != 0);
    if (vp8.bitwriter.VP8PutBitUniform(bw, needUpdate ? 1 : 0)) {
      // we don't use ref_lf_delta => emit four 0 bits
      vp8.bitwriter.VP8PutValue(bw, 0, 4);
      // we use mode_lf_delta for i4x4
      vp8.bitwriter.VP8PutSignedValue(bw, hdr.i4x4LfDelta, 6);
      vp8.bitwriter.VP8PutValue(bw, 0, 3);    // all others unused
    }
  }
};

// Nominal quantization parameters
/**
 * @param {webp.vp8.bitwriter.VP8BitWriter} bw
 * @param {webp.vp8.encode.VP8Encoder} enc
 */
vp8.syntax.PutQuant = function(bw, enc) {
  vp8.bitwriter.VP8PutValue(bw, enc.baseQuant, 7);
  vp8.bitwriter.VP8PutSignedValue(bw, enc.dqY1Dc, 4);
  vp8.bitwriter.VP8PutSignedValue(bw, enc.dqY2Dc, 4);
  vp8.bitwriter.VP8PutSignedValue(bw, enc.dqY2Ac, 4);
  vp8.bitwriter.VP8PutSignedValue(bw, enc.dqUvDc, 4);
  vp8.bitwriter.VP8PutSignedValue(bw, enc.dqUvAc, 4);
};

//------------------------------------------------------------------------------

/**
 * @param {webp.vp8.encode.VP8Encoder} enc
 * @return {boolean}
 */
vp8.syntax.GeneratePartition0 = function(enc) {
  var bw = enc.bw;
  var mbSize = enc.mbW * enc.mbH;

  var pos1 = vp8.bitwriter.VP8BitWriterPos(bw);
  vp8.bitwriter.VP8BitWriterInit(bw, parseInt(mbSize * 7 / 8, 10));  // ~7 bits per macroblock
  vp8.bitwriter.VP8PutBitUniform(bw, 0);   // colorspace
  vp8.bitwriter.VP8PutBitUniform(bw, 0);   // clamp type

  vp8.syntax.PutSegmentHeader(bw, enc);
  vp8.syntax.PutFilterHeader(bw, enc.filterHdr);
  vp8.bitwriter.VP8PutValue(bw, 0, 2); // partitions
  vp8.syntax.PutQuant(bw, enc);
  vp8.bitwriter.VP8PutBitUniform(bw, 0);   // no proba update
  vp8.tree.VP8WriteProbas(bw, enc.proba);
  var pos2 = vp8.bitwriter.VP8BitWriterPos(bw);
  vp8.tree.VP8CodeIntraModes(enc);
  vp8.bitwriter.VP8BitWriterFinish(bw);

  var pos3 = vp8.bitwriter.VP8BitWriterPos(bw);

  return !bw.error;
};

/**
 * @param {webp.vp8.encode.VP8Encoder} enc
 * @return {boolean}
 */
vp8.syntax.VP8EncWrite = function(enc) {
  var pic = enc.pic;
  var bw = enc.bw;
  var ok = false;

  if (debug.isEnabled()) {
    debug.dumpEncoder("VP8EncWrite.START", enc);
  }

  // Partition #0 with header and partition sizes
  ok = !!vp8.syntax.GeneratePartition0(enc);

  // Compute VP8 size
  var vp8Size = constants.VP8_FRAME_HEADER_SIZE +
      vp8.bitwriter.VP8BitWriterSize(bw);
  vp8Size += vp8.bitwriter.VP8BitWriterSize(enc.part1);
  var pad = vp8Size & 1;
  vp8Size += pad;

  // Compute RIFF size
  // At the minimum it is: "WEBPVP8 nnnn" + VP8 data size.
  var riffSize = constants.TAG_SIZE + constants.CHUNK_HEADER_SIZE + vp8Size;

  // Emit headers and partition #0
  {
    var part0 = vp8.bitwriter.VP8BitWriterBuf(bw);
    var size0 = vp8.bitwriter.VP8BitWriterSize(bw);
    ok = ok && vp8.syntax.PutWebPHeaders(enc, size0, vp8Size, riffSize)
        && vp8.syntax.WriteToPic(part0, size0, pic, "Part0");
    vp8.bitwriter.VP8BitWriterWipeOut(bw);    // will free the internal buffer.
  }

  // Token partitions
  {
    var buf = vp8.bitwriter.VP8BitWriterBuf(enc.part1);
    var size = vp8.bitwriter.VP8BitWriterSize(enc.part1);
    if (size) {
      ok = ok && vp8.syntax.WriteToPic(buf, size, pic, "Part1");
    }
    vp8.bitwriter.VP8BitWriterWipeOut(enc.part1);    // will free the internal buffer.
  }

  // Padding byte
  if (ok && pad) {
    ok = !!vp8.syntax.PutPaddingByte(pic);
  }
  if (debug.isEnabled()) {
    debug.dumpEncoderFull("VP8EncWrite.END", enc);
  }
  return ok;
};

});
