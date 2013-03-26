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
goog.require('pics3.Photo');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.encoder.BaseEncoder');
goog.require('pics3.parser.DataReader');
goog.require('pics3.parser.DataUrl');
goog.require('pics3.parser.util');


goog.scope(function() {

/**
 * @param {!pics3.encoder.Webp.AsyncEncoder} fallbackEncoder
 * @constructor
 * @extends {pics3.encoder.BaseEncoder}
 */
pics3.encoder.Webp = function(fallbackEncoder) {
  goog.base(this, 'pics3.parser.Webp');

  /** @type {pics3.encoder.Webp.AsyncEncoder} */
  this.fallbackEncoder_ = fallbackEncoder;

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

/** @type {number} */
Webp.NATIVE_MAX_IMAGE_WIDTH_ = 1920;

/** @type {number} */
Webp.NATIVE_MAX_IMAGE_HEIGHT_ = 1080;

/** @type {number} */
Webp.FALLBACK_MAX_IMAGE_WIDTH_ = 800;

/** @type {number} */
Webp.FALLBACK_MAX_IMAGE_HEIGHT_ = 600;

/** @type {!goog.debug.Logger} */
Webp.prototype.logger_ = goog.debug.Logger.getLogger('pics3.encoder.Webp');

/** @type {boolean} */
Webp.prototype.supportTransparency_ = false;

/** @type {boolean} */
Webp.prototype.enableNativeEncoder_ = true;

/** @type {number} */
Webp.prototype.maxImageWidth_;

/** @type {number} */
Webp.prototype.maxImageHeight_;

/** @type {number} */
Webp.prototype.quality_ = 0.8;

/** @type {boolean} */
Webp.prototype.browserHasWebpSupport_;

Webp.prototype.updateMaxImageSize_ = function() {
  if (!goog.isDefAndNotNull(this.maxImageWidth_)) {
    this.maxImageWidth_ = Webp.NATIVE_MAX_IMAGE_WIDTH_;
  }
  if (!goog.isDefAndNotNull(this.maxImageHeight_)) {
    this.maxImageHeight_ = Webp.NATIVE_MAX_IMAGE_HEIGHT_;
  }
  if (!this.browserHasWebpSupport_ || !this.enableNativeEncoder_) {
    this.maxImageWidth_ = Math.min(this.maxImageWidth_,
        Webp.FALLBACK_MAX_IMAGE_WIDTH_);
    this.maxImageHeight_ = Math.min(this.maxImageHeight_,
        Webp.FALLBACK_MAX_IMAGE_HEIGHT_);
  }
};

/** @param {boolean} supportTransparency */
Webp.prototype.setSupportTransparency = function(supportTransparency) {
  this.supportTransparency_ = supportTransparency;
};

/** @param {boolean} enable */
Webp.prototype.setEnableNativeEncoder = function(enable) {
  this.enableNativeEncoder_ = enable;
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
  return this.runSafeDeferred(goog.bind(this.testWebpSupport_, this)).
      addCallback(this.wrapSafe(function() {
        return this.loadImages_(dataUrls);
      }), this).
      addCallback(this.wrapSafe(function(images) {
        this.updateMaxImageSize_();
        var canvasEl;
        if (images.length == 2) {
          canvasEl = this.drawCanvasFor3dSideBySide_(images, parallaxXOffset);
        } else {
          canvasEl = this.drawCanvasFor2d_(images[0]);
        }
        return this.encodeFromCanvas_(canvasEl);
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
      return fn.apply(this, arguments);
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
 * @return {!goog.async.Deferred} producing {boolean}
 */
Webp.prototype.testWebpSupport_ = function() {
  if (goog.isDefAndNotNull(this.browserHasWebpSupport_)) {
    return goog.async.Deferred.succeed(this.browserHasWebpSupport_);
  }
  var deferred = new goog.async.Deferred();
  var image = new Image();
  function handleImageDone() {
    this.browserHasWebpSupport_ = image.naturalWidth > 0 &&
        image.naturalHeight > 0;
    deferred.callback(this.browserHasWebpSupport_);
  }
  this.eventHandler_.listen(image,
      [goog.events.EventType.LOAD, goog.events.EventType.ERROR],
      this.wrapSafe(goog.bind(handleImageDone, this)));
  image.src = 'data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAADyAgCdASoBAAE' +
      'ALiUSiUSCAAJEtIBOl0A/AABkIN9wAAD+/m0lj/7kA9kA9kA/hP//BnfgzvwZ3/gggAA=';
  return deferred;
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

/**
 * @param {Element} canvasEl
 * @return {!goog.async.Deferred}
 */
Webp.prototype.encodeFromCanvas_ = function(canvasEl) {
  if (this.enableNativeEncoder_ && this.browserHasWebpSupport_) {
    var width = parseInt(canvasEl.getAttribute('width'), 10);
    var height = parseInt(canvasEl.getAttribute('height'), 10);
    this.assert(goog.math.isFiniteNumber(width), 'Expected a valid width');
    this.assert(goog.math.isFiniteNumber(height), 'Expected a valid height');
    var dataUrl = new pics3.parser.DataUrl(
        canvasEl.toDataURL(pics3.PhotoMimeType.WEBP, this.quality_));
    this.image_ = new pics3.encoder.Webp.Image(dataUrl, width, height);
    return goog.async.Deferred.succeed();
  } else {
    return this.fallbackEncoder_.encodeAsync(canvasEl, this.quality_ * 100).
        addCallback(this.wrapSafe(function(image) {
          this.image_ = image;
        }), this);
  }
};

/** @override */
Webp.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
  delete this.image_;
};

/** @interface */
Webp.Factory = function() {};

/** @return {!pics3.encoder.Webp} */
Webp.Factory.prototype.createWebp = goog.abstractMethod;

/** @interface */
Webp.AsyncEncoder = function() {};

/**
 * Encode an image to a webp version asynchronously.
 * @param {Element} canvasEl Canvas element holding the image data.
 * @param {number} quality
 * @return {!goog.async.Deferred} producing {pics3.encoder.Webp.Image}
 */
Webp.AsyncEncoder.prototype.encodeAsync = goog.abstractMethod;

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

/**
 * @param {Object} object
 * @return {!pics3.encoder.Webp.Image}
 */
Webp.Image.fromObject = function(object) {
  return new Webp.Image(pics3.parser.DataUrl.fromObject(object['dataUrl']),
      object['width'], object['height']);
};

/** @return {Object} */
Webp.Image.prototype.toObject = function() {
  return {
    'dataUrl': this.dataUrl.toObject(),
    'width': this.width,
    'height': this.height
  };
};

});