// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.Encoder');
goog.provide('webp.encoder');

goog.require('goog.asserts');
goog.require('goog.debug.Logger');
goog.require('webp.PhotoMimeType');
goog.require('webp.config');
goog.require('webp.picture');
goog.require('webp.vp8.analysis');
goog.require('webp.vp8.bitwriter');
goog.require('webp.vp8.constants');
goog.require('webp.vp8.debug');
goog.require('webp.vp8.encode');
goog.require('webp.vp8.frame');
goog.require('webp.vp8.syntax');
goog.require('webp.vp8.tree');


goog.scope(function() {

var constants = webp.vp8.constants;
var debug = webp.vp8.debug;
var vp8 = webp.vp8;

/**
 * @constructor
 */
webp.Encoder = function() {
  /** @type {Uint8Array} */
  this.output_;

  /** @type {number} */
  this.quality_ = 90;
};
var Encoder = webp.Encoder;

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
  var width = parseInt(canvasEl.getAttribute('width'), 10);
  var height = parseInt(canvasEl.getAttribute('height'), 10);
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

  var pic = new webp.picture.WebPPicture();
  if (!webp.picture.WebPPictureInit(pic)) {
    throw Error('WebPPictureInit error');
  }
  var config = new webp.config.WebPConfig();
  if (!webp.config.WebPConfigInit(config)) {
    throw Error('WebPConfigInit error');
  }
  config.quality = this.quality_;

  debug.log("====================== START ======================");

  pic.width = width;
  pic.height = height;
  if (!webp.picture.WebPPictureImportRGBA(pic, rgbaBuffer, stride)) {
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

  if (!webp.encoder.WebPEncode(config, pic)) {
    throw Error('WebPEncode error');
  }

  debug.log("====================== DONE ======================");

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
 * @param {webp.config.WebPConfig} config
 * @param {webp.picture.WebPPicture} pic
 * @return {boolean}
 */
webp.encoder.WebPEncode = function(config, pic) {
  if (!pic) {
    return false;
  }

  var enc = vp8.encode.InitVP8Encoder(config, pic);
  var ok = vp8.analysis.VP8EncAnalyze(enc) &&
      vp8.frame.VP8StatLoop(enc) &&
      vp8.frame.VP8EncLoop(enc) &&
      vp8.syntax.VP8EncWrite(enc);

  return ok;
};

});
