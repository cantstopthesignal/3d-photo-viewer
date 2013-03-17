// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.Webp');

goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.async.DeferredList');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventType');
goog.require('goog.math');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.encoder.BaseEncoder');
goog.require('pics3.parser.DataReader');
goog.require('pics3.parser.DataUrl');
goog.require('pics3.parser.util');


goog.scope(function() {

/**
 * @constructor
 * @extends {pics3.encoder.BaseEncoder}
 */
pics3.encoder.Webp = function() {
  goog.base(this, 'pics3.parser.Webp');

  /** @type {Error} */
  this.error_;

  /** @type {pics3.encoder.Webp.Image} */
  this.image_;

  /** @type {goog.events.EventHandler} */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);
};
var Webp = pics3.encoder.Webp;
goog.inherits(Webp, pics3.encoder.BaseEncoder);

/** @type {!goog.debug.Logger} */
Webp.prototype.logger_ = goog.debug.Logger.getLogger('pics3.encoder.Webp');

/** @type {boolean} */
Webp.prototype.supportTransparency_ = false;

/** @type {number} */
Webp.prototype.maxImageWidth_ = 1920;

/** @type {number} */
Webp.prototype.maxImageHeight_ = 1080;

/** @type {number} */
Webp.prototype.quality_ = 0.8;

/** @param {boolean} supportTransparency */
Webp.prototype.setSupportTransparency = function(supportTransparency) {
  this.supportTransparency_ = supportTransparency;
};

/** @return {pics3.encoder.Webp.Image} */
Webp.prototype.getImage = function() {
  return this.image_;
};

/**
 * @param {!pics3.Photo} photo
 * @return {!goog.async.Deferred} produces {boolean}
 */
Webp.prototype.encode = function(photo) {
  goog.asserts.assert(photo.getState() == pics3.Photo.State.LOADED);
  return this.encodeFromDataUrls(photo.getImageDataUrls(),
      photo.getParallaxXOffset());
};

/**
 * @param {!Array.<!pics3.parser.DataUrl>} dataUrls Mono or stereo images to
 *     encode.
 * @param {number=} opt_parallaxXOffset
 * @return {!goog.async.Deferred} produces {boolean}
 */
Webp.prototype.encodeFromDataUrls = function(dataUrls, opt_parallaxXOffset) {
  var parallaxXOffset = opt_parallaxXOffset || 0;
  var startTime = goog.now();
  return this.runSafeDeferred(goog.bind(this.loadImages_, this, dataUrls)).
      addCallback(this.wrapSafe(function(images) {
        var canvasEl;
        if (images.length == 2) {
          canvasEl = this.drawCanvasFor3dSideBySide_(images, parallaxXOffset);
        } else {
          canvasEl = this.drawCanvasFor2d_(images[0]);
        }
        this.encodeFromCanvas_(canvasEl);
      }), this).
      addCallback(function() {
        this.logger_.fine('Encoded in ' + (goog.now() - startTime) + 'ms');
      }, this);
};

/**
 * @param {!Function} fn Function to call.
 * @return {!Function}
 */
Webp.prototype.wrapSafe = function(fn) {
  return goog.bind(function() {
    try {
      fn.apply(this, arguments);
    } catch (e) {
      if (!pics3.encoder.encodeError.is(e)) {
        throw e;
      }
      this.error_ = e;
    }
  }, this);
};

/**
 * @param {Function} fn Function to call.
 * @return {!goog.async.Deferred}
 */
Webp.prototype.runSafeDeferred = function(fn) {
  try {
    return fn();
  } catch (e) {
    if (!pics3.encoder.encodeError.is(e)) {
      throw e;
    }
    this.error_ = e;
    return goog.async.Deferred.fail(null);
  }
};

/** @return {Error} */
Webp.prototype.getError = function() {
  return this.error_;
};

/**
 * @param {!Array.<!pics3.parser.DataUrl>} dataUrls
 * @return {!goog.async.Deferred} producing {!Array.<!Image>}
 */
Webp.prototype.loadImages_ = function(dataUrls) {
  var deferred = new goog.async.Deferred();

  var images = goog.array.map(dataUrls, function(){
    return new Image();
  });
  var loadCount = 0;
  var handleImageLoad = function() {
    loadCount++;
    if (loadCount < images.length) {
      return;
    }
    deferred.callback(images);
  };

  goog.array.forEach(dataUrls, function(dataUrl, i) {
    var image = images[i];
    this.eventHandler_.listen(image, goog.events.EventType.LOAD,
        this.wrapSafe(goog.bind(handleImageLoad, this)));
    image.src = dataUrl;
  }, this);
  return deferred;
};

/**
 * @param {!Array.<!Image>} images
 * @param {number} parallaxXOffset
 * @return {!Element}
 */
Webp.prototype.drawCanvasFor3dSideBySide_ = function(images, parallaxXOffset) {
  this.assertEquals(2, images.length, 'Expected stereo images');
  var sourceImageWidth = images[0].naturalWidth;
  var sourceImageHeight = images[0].naturalHeight;
  var sourceImageClippedWidth = sourceImageWidth - Math.abs(parallaxXOffset);

  var destImageWidth = sourceImageClippedWidth;
  var destImageHeight = sourceImageHeight;

  if (destImageHeight > this.maxImageHeight_) {
    destImageWidth = Math.floor(this.maxImageHeight_ * destImageWidth /
        destImageHeight);
    destImageHeight = this.maxImageHeight_;
  }
  if (destImageWidth > this.maxImageWidth_) {
    destImageHeight = Math.floor(this.maxImageWidth_ * destImageHeight /
        destImageWidth);
    destImageWidth = this.maxImageWidth_;
  }

  var canvasWidth = destImageWidth * 2;
  var canvasHeight = destImageHeight;

  var canvasEl = this.createAndPrepareCanvas_(canvasWidth, canvasHeight);
  var canvasCtx = canvasEl.getContext('2d');

  for (var i = 0; i < 2; i++) {
    var sourceXOffset = 0;
    if (parallaxXOffset > 0 && i == 0) {
      sourceXOffset = Math.floor(parallaxXOffset);
    } else if (parallaxXOffset < 0 && i == 1) {
      sourceXOffset = Math.floor(-parallaxXOffset);
    }
    var destXOffset = i == 1 ? destImageWidth : 0;
    canvasCtx.drawImage(images[i], sourceXOffset, 0, sourceImageClippedWidth,
        sourceImageHeight, destXOffset, 0, destImageWidth, destImageHeight);
  }
  return canvasEl;
};

/**
 * @param {!Image} image
 * @return {Element}
 */
Webp.prototype.drawCanvasFor2d_ = function(image) {
  var width = image.naturalWidth;
  var height = image.naturalHeight;
  var canvasEl = this.createAndPrepareCanvas_(width, height);
  var canvasCtx = canvasEl.getContext('2d');
  canvasCtx.drawImage(image, 0, 0);
  return canvasEl;
};

/**
 * @param {number} width
 * @param {number} height
 * @return {!Element}
 */
Webp.prototype.createAndPrepareCanvas_ = function(width, height) {
  var canvasEl = document.createElement('canvas');
  canvasEl.setAttribute('width', width);
  canvasEl.setAttribute('height', height);
  var canvasCtx = canvasEl.getContext('2d');
  if (!this.supportTransparency_) {
    canvasCtx.fillStyle = 'white';
    canvasCtx.fillRect(0, 0, width, height);
  }
  return canvasEl;
};

/** @param {Element} canvasEl */
Webp.prototype.encodeFromCanvas_ = function(canvasEl) {
  var width = parseInt(canvasEl.getAttribute('width'), 10);
  var height = parseInt(canvasEl.getAttribute('height'), 10);
  this.assert(goog.math.isFiniteNumber(width), 'Expected a valid width');
  this.assert(goog.math.isFiniteNumber(height), 'Expected a valid height');
  var dataUrl = new pics3.parser.DataUrl(
      canvasEl.toDataURL(pics3.PhotoMimeType.WEBP, this.quality_));
  this.image_ = new pics3.encoder.Webp.Image(dataUrl, width, height);
};

/** @override */
Webp.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
  delete this.image_;
};

/**
 * @param {pics3.parser.DataUrl} dataUrl
 * @param {number} width
 * @param {number} height
 * @constructor
 */
Webp.Image = function(dataUrl, width, height) {
  goog.asserts.assert(dataUrl.getMimeType() == pics3.PhotoMimeType.WEBP);
  /** @type {pics3.parser.DataUrl} */
  this.dataUrl = dataUrl;

  /** @type {number} */
  this.width = width;

  /** @type {number} */
  this.height = height;
};

});