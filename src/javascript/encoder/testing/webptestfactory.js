// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.testing.WebpTestFactory');

goog.require('pics3.encoder.Webp');
goog.require('webp.Encoder');


goog.scope(function() {

/**
 * @implements {pics3.encoder.Webp.Factory}
 */
pics3.encoder.testing.WebpTestFactory = function() {
  
};
var WebpTestFactory = pics3.encoder.testing.WebpTestFactory;

/** @return {!pics3.encoder.Webp} */
WebpTestFactory.prototype.createWebp = function() {
  return new pics3.encoder.Webp(new WebpTestFactory.FallbackAsyncEncoder());
};

/**
 * @constructor
 * @implements {pics3.encoder.Webp.AsyncEncoder}
 */
WebpTestFactory.FallbackAsyncEncoder = function() {
};

/** @override */
WebpTestFactory.FallbackAsyncEncoder.prototype.encodeAsync = function(
    canvasEl, quality, fast) {
  var width = parseInt(canvasEl.getAttribute('width'));
  var height = parseInt(canvasEl.getAttribute('height'));
  var canvasCtx = canvasEl.getContext('2d');
  var rgbaBuffer = new Uint8Array(canvasCtx.getImageData(
      0, 0, width, height).data);
  var stride = 4 * width;
  var webpEncoder = new webp.Encoder();
  webpEncoder.setQuality(quality);
  webpEncoder.setFast(fast);
  if (!webpEncoder.encodeFromRgba(rgbaBuffer, width, height, stride)) {
    return goog.async.Deferred.fail(Error('Error encoding Webp'));
  }
  var dataUrl = pics3.parser.DataUrl.fromUint8Array(
      pics3.PhotoMimeType.WEBP, webpEncoder.getOutput());
  var webpImage = new pics3.encoder.Webp.Image(dataUrl, width, height);
  return goog.async.Deferred.succeed(webpImage);
};

});
