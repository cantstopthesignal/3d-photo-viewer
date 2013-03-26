// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.worker.ImageHandler');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.encoder.Webp');
goog.require('pics3.parser.ImageResult');
goog.require('pics3.parser.Mpo');
goog.require('pics3.worker.Handler');
goog.require('pics3.worker.RpcMessage');
goog.require('webp.Encoder');


/**
 * @constructor
 * @implements {pics3.worker.Handler}
 */
pics3.worker.ImageHandler = function() {
};

/** @type {goog.debug.Logger} */
pics3.worker.ImageHandler.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.worker.ImageHandler');

/** @override */
pics3.worker.ImageHandler.prototype.handleRpc = function(rpcMessage) {
  if (rpcMessage.type == pics3.worker.RpcMessage.Type.PARSE_IMAGE) {
    return this.handleParseImageRpc_(rpcMessage.data);
  } else if (rpcMessage.type == pics3.worker.RpcMessage.Type.ENCODE_WEBP) {
      return this.handleEncodeWebpRpc_(rpcMessage.data);
  } else {
    throw Error('Unexpected rpc type: ' + rpcMessage.type);
  }
};

/**
 * @param {Object} request
 * @return {!goog.async.Deferred} producing {Object}
 */
pics3.worker.ImageHandler.prototype.handleParseImageRpc_ = function(request) {
  var imageResult = new pics3.parser.ImageResult(request['mimeType']);
  var name = request['name']
  var buffer = request['buffer'];
  var error;

  if (pics3.photoMimeType.isPossible3dPhoto(imageResult.mimeType, name)) {
    var mpo = new pics3.parser.Mpo();
    if (mpo.parse(buffer)) {
      imageResult.mimeType = pics3.PhotoMimeType.MPO;
      imageResult.parallaxXOffset = mpo.getParallaxXOffset();
      goog.array.forEach(mpo.getImages(), function(mpoImage) {
        imageResult.imageDataUrls.push(mpoImage.toDataUrl());
      });
    } else {
      imageResult.imageDataUrls.push(pics3.parser.DataUrl.fromUint8Array(
          imageResult.mimeType, new Uint8Array(buffer)));
      if (!imageResult.mimeType || imageResult.mimeType ==
          pics3.PhotoMimeType.MPO) {
        this.logger_.warning('Could not parse likely mpo file');
        error = mpo.getError();
      } else {
        this.logger_.warning('Photo with mimeType ' + imageResult.mimeType +
            ' does not appear to be an mpo file: ' + mpo.getError());
      }
    }
  } else {
    imageResult.imageDataUrls.push(pics3.parser.DataUrl.fromUint8Array(
        imageResult.mimeType, new Uint8Array(buffer)));
  }
  if (error) {
    return goog.async.Deferred.fail(error);
  } else {
    return goog.async.Deferred.succeed(imageResult.toObject());
  }
};

/**
 * @param {Object} request
 * @return {!goog.async.Deferred} producing {Object}
 */
pics3.worker.ImageHandler.prototype.handleEncodeWebpRpc_ = function(request) {
  var width = request['width'];
  var height = request['height'];
  var stride = request['stride'];
  var rgbaBuffer = request['rgbaBuffer'];
  var quality = request['quality'];
  var fast = request['fast'];

  var webpEncoder = new webp.Encoder();
  webpEncoder.setQuality(quality);
  webpEncoder.setFast(fast);
  if (!webpEncoder.encodeFromRgba(rgbaBuffer, width, height, stride)) {
    return goog.async.Deferred.fail(Error('Error encoding Webp'));
  }
  var dataUrl = pics3.parser.DataUrl.fromUint8Array(
      pics3.PhotoMimeType.WEBP, webpEncoder.getOutput());
  var webpImage = new pics3.encoder.Webp.Image(dataUrl, width, height);
  return goog.async.Deferred.succeed(webpImage.toObject());

};