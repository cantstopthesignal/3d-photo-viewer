// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.Encoder');

goog.require('goog.asserts');
goog.require('goog.debug.Logger');
goog.require('webp.Config');
goog.require('webp.PhotoMimeType');
goog.require('webp.Picture');
goog.require('webp.vp8.Analysis');
goog.require('webp.vp8.BitWriter');
goog.require('webp.vp8.Constants');
goog.require('webp.vp8.Encode');
goog.require('webp.vp8.Frame');
goog.require('webp.vp8.Syntax');
goog.require('webp.vp8.Tree');
goog.require('webp.vp8.debug');

goog.scope(function() {

var debug = webp.vp8.debug;

/**
 * @constructor
 */
webp.Encoder = function() {
  /** @type {Uint8Array} */
  this.output_;

  /** @type {number} */
  this.quality_ = 90;
};
Encoder = webp.Encoder;

/** @type {!goog.debug.Logger} */
Encoder.prototype.logger_ = goog.debug.Logger.getLogger('webp.Encoder');

/** @param {number} quality */
Encoder.prototype.setQuality = function(quality) {
  goog.asserts.assert(quality >= 1 && quality <= 100,
      'Quality should be between 1 and 100');
  this.quality_ = quality;
};

/** @return {!Uint8Array} */
Encoder.prototype.getOutput = function() {
  return goog.asserts.assertObject(this.output_);
};

/** @return {!Blob} */
Encoder.prototype.getOutputAsBlob = function() {
  goog.asserts.assert(this.output_ instanceof Uint8Array);
  return new Blob([this.output_], {"type": webp.PhotoMimeType.WEBP});
};

/**
 * @param {Element} canvasEl
 * @return {boolean}
 */
Encoder.prototype.encode = function(canvasEl) {
  var width = parseInt(canvasEl.getAttribute('width'));
  var height = parseInt(canvasEl.getAttribute('height'));
  var canvasCtx = canvasEl.getContext('2d');
  var rgbaBuffer = new Uint8Array(canvasCtx.getImageData(
      0, 0, width, height).data);
  var stride = 4 * width;
  return this.encodeFromRgba(rgbaBuffer, width, height, stride);
};

/**
 * @param {Uint8Array} rgbaBuffer
 * @param {number} width
 * @param {number} height
 * @param {number} stride
 * @return {boolean}
 */
Encoder.prototype.encodeFromRgba = function(rgbaBuffer, width, height, stride) {
  var startTime = goog.now();

  var pic = new WebPPicture();
  if (!WebPPictureInit(pic)) {
    throw Error('WebPPictureInit error');
  }
  var config = new WebPConfig();
  if (!WebPConfigInit(config)) {
    throw Error('WebPConfigInit error');
  }
  config.quality = this.quality_;

  pic.width = width;
  pic.height = height;
  if (!WebPPictureImportRGBA(pic, rgbaBuffer, stride)) {
    throw Error('WebPPictureImportRGBA error');
  }

  var outputBuffers = [];
  var outputLength = 0;

  pic.writer = {
    write: function(buf, size) {
      outputBuffers.push(buf.subarray(0, size));
      outputLength += size;
      return true;
    }
  };

  if (!WebPEncode(config, pic)) {
    throw Error('WebPEncode error');
  }

  var output = new Uint8Array(outputLength);
  var pos = 0;
  for (var i = 0; i < outputBuffers.length; i++) {
    output.set(outputBuffers[i], pos);
    pos += outputBuffers[i].length;
  }
  this.output_ = output;

  this.logger_.info('Encoded ' + width + 'x' + height + ' image to webp in ' +
      (goog.now() - startTime) + 'ms; sized ' + this.output_.length + ' bytes');
  return true;
};

/**
 * @param {WebPConfig} config
 * @param {WebPPicture} pic
 * @return {boolean}
 */
WebPEncode = function(config, pic) {
  if (!pic) {
    return false;
  }

  debug.log("====================== START ======================");

  var enc = InitVP8Encoder(config, pic);
  var ok = VP8EncAnalyze(enc) &&
      VP8StatLoop(enc) &&
      VP8EncLoop(enc) &&
      VP8EncWrite(enc);

  debug.log("====================== DONE ======================");

  return ok;
};

});
