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
Webp.prototype.supportTransparency_ = true;

/** @type {number} */
Webp.prototype.quality_ = 0.8;

/** @param {boolean} supportTransparency */
Webp.prototype.setSupportTransparency = function(supportTransparency) {
  this.supportTransparency_ = supportTransparency;
};

/** @return {pics3.encoder.Webp.Image} */
Webp.prototype.getImage = function() {
  return this.image_;
}

/**
 * @param {!pics3.Photo} photo
 * @return {!goog.async.Deferred} produces {boolean}
 */
Webp.prototype.encode = function(photo) {
  goog.asserts.assert(photo.getState() == pics3.Photo.State.LOADED);
  return this.encodeFromDataUrls(photo.getImageDataUrls());
};

/**
 * @param {!Array.<!pics3.parser.DataUrl>} dataUrls Mono or stereo images to
 *     encode.
 * @return {!goog.async.Deferred} produces {boolean}
 */
Webp.prototype.encodeFromDataUrls = function(dataUrls) {
  var startTime = goog.now();
  return this.runSafeDeferred(goog.bind(this.encodeFromDataUrlsInternal, this,
      dataUrls)).
      addCallback(function() {
        this.logger_.fine('Encoded in ' + (goog.now() - startTime) + 'ms');
      }, this);
};

/**
 * @param {Function} fn Function to call.
 * @return {Function}
 */
Webp.prototype.wrapSafe = function(fn) {
  return goog.bind(function() {
    try {
      fn();
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
 * @return {!goog.async.Deferred}
 */
Webp.prototype.encodeFromDataUrlsInternal = function(dataUrls) {
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
    var image = images[0];
    var rightImage = images.length > 1 ? images[1] : null;
    var canvas = document.createElement('canvas');
    var width = image.naturalWidth;
    var height = image.naturalHeight;
    if (rightImage) {
      this.assertEquals(width, rightImage.naturalWidth,
          'Stereo images should be the same size');
      this.assertEquals(height, rightImage.naturalHeight,
          'Stereo images should be the same size');
      width *= 2;
    }
    canvas.setAttribute('width', width);
    canvas.setAttribute('height', height);
    var canvasCtx = canvas.getContext('2d');
    if (!this.supportTransparency_) {
      canvasCtx.fillStyle = 'white';
      canvasCtx.fillRect(0, 0, width, height);
    }
    canvasCtx.drawImage(image, 0, 0);
    if (rightImage) {
      canvasCtx.drawImage(rightImage, image.naturalWidth, 0);
    }
    var dataUrl = new pics3.parser.DataUrl(
        canvas.toDataURL(pics3.PhotoMimeType.WEBP, this.quality_));
    this.image_ = new pics3.encoder.Webp.Image(
        dataUrl, width, height);
    deferred.callback(true);
  };

  goog.array.forEach(dataUrls, function(dataUrl, i) {
    var image = images[i];
    this.eventHandler_.listen(image, goog.events.EventType.LOAD,
        this.wrapSafe(goog.bind(handleImageLoad, this)));
    image.src = dataUrl;
  }, this);
  return deferred;
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