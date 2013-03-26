// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.EncoderDemo');

goog.require('goog.async.Deferred');
goog.require('goog.debug.Console');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.style');
goog.require('goog.testing.jsunit');
goog.require('webp.PhotoMimeType');
goog.require('webp.Encoder');
goog.require('webp.testing.encoderTestUtil');
goog.require('webp.util');

goog.scope(function() {

/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
webp.EncoderDemo = function() {
  goog.base(this);

  /** @type {goog.events.EventHandler} */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);
};
var EncoderDemo = webp.EncoderDemo;
goog.inherits(EncoderDemo, goog.events.EventTarget);

/** @type {!goog.debug.Logger} */
EncoderDemo.prototype.logger_ = goog.debug.Logger.getLogger('webp.EncoderDemo');

/** @type {webp.Encoder} */
EncoderDemo.prototype.webpEncoder_;

/** @type {Element} */
EncoderDemo.prototype.canvasEl_;

/** @type {Element} */
EncoderDemo.prototype.image1RadioEl_;

/** @type {Element} */
EncoderDemo.prototype.photo1RadioEl_;

/** @type {Element} */
EncoderDemo.prototype.imageSizeControlsEl_;

/** @type {Element} */
EncoderDemo.prototype.encodedWebpContainerEl_;

/** @type {Element} */
EncoderDemo.prototype.sourceContainerEl_;

/** @type {Element} */
EncoderDemo.prototype.nativeWebpContainerEl_;

/** @type {Element} */
EncoderDemo.prototype.nativePngContainerEl_;

/** @type {Element} */
EncoderDemo.prototype.widthInputEl_;

/** @type {Element} */
EncoderDemo.prototype.heightInputEl_;

/** @type {Element} */
EncoderDemo.prototype.qualityInputEl_;

/** @type {Element} */
EncoderDemo.prototype.fastCheckboxEl_;

EncoderDemo.prototype.start = function() {
  this.image1RadioEl_ = document.getElementById('test-image1-radio');
  this.photo1RadioEl_ = document.getElementById('test-photo1-radio');
  this.widthInputEl_ = document.getElementById('width-input');
  this.heightInputEl_ = document.getElementById('height-input');
  this.qualityInputEl_ = document.getElementById('quality-input');
  this.fastCheckboxEl_ = document.getElementById('fast-checkbox');
  this.imageSizeControlsEl_ = document.getElementById('image-size-controls');

  this.encodedWebpContainerEl_ = document.getElementById('encoded-webp-image');
  this.sourceContainerEl_ = document.getElementById('source-image');
  this.nativeWebpContainerEl_ = document.getElementById('native-webp-image');
  this.nativePngContainerEl_ = document.getElementById('native-png-image');

  this.eventHandler_.
      listen(this.image1RadioEl_, goog.events.EventType.CHANGE,
          this.handleTestImageChange_).
      listen(this.photo1RadioEl_, goog.events.EventType.CHANGE,
          this.handleTestImageChange_).
      listen(this.widthInputEl_, goog.events.EventType.CHANGE,
          this.handleTestImageChange_).
      listen(this.heightInputEl_, goog.events.EventType.CHANGE,
          this.handleTestImageChange_).
      listen(this.qualityInputEl_, goog.events.EventType.CHANGE,
          this.handleTestImageChange_).
      listen(this.fastCheckboxEl_, goog.events.EventType.CHANGE,
          this.handleTestImageChange_);

  this.runDemo_();
};

EncoderDemo.prototype.handleTestImageChange_ = function() {
  var useTestImage1 = this.image1RadioEl_.checked;
  goog.style.showElement(this.imageSizeControlsEl_, useTestImage1);
  this.runDemo_();
};

EncoderDemo.prototype.runDemo_ = function() {
  this.draw_().addCallback(function() {
    this.encodeNativeWebpImage_();
    this.encodeNativePngImage_();
    this.encodeWebpImage_();
  }, this);
};

EncoderDemo.prototype.draw_ = function() {
  var width = this.getWidthInputValue_();
  var height = this.getHeightInputValue_();
  if (this.image1RadioEl_.checked) {
    this.canvasEl_ = webp.testing.encoderTestUtil.renderTestImage1(
        width, height);
    goog.dom.removeChildren(this.sourceContainerEl_);
    this.sourceContainerEl_.appendChild(this.canvasEl_);
    return goog.async.Deferred.succeed();
  } else {
    return webp.testing.encoderTestUtil.renderTestPhoto1().
    addCallback(function(canvasEl) {
      this.canvasEl_ = canvasEl;
      goog.dom.removeChildren(this.sourceContainerEl_);
      this.sourceContainerEl_.appendChild(this.canvasEl_);
    }, this);
  }
};

EncoderDemo.prototype.getWidthInputValue_ = function() {
  var value = Math.max(1, parseInt(this.widthInputEl_.value));
  if (this.widthInputEl_.value != String(value)) {
    this.widthInputEl_.value = value;
  }
  return value;
};

EncoderDemo.prototype.getHeightInputValue_ = function() {
  var value = Math.max(1, parseInt(this.heightInputEl_.value));
  if (this.heightInputEl_.value != String(value)) {
    this.heightInputEl_.value = value;
  }
  return value;
};

EncoderDemo.prototype.getQualityInputValue_ = function() {
  var value = Math.min(100, Math.max(1, parseInt(this.qualityInputEl_.value)));
  if (this.qualityInputEl_.value != String(value)) {
    this.qualityInputEl_.value = value;
  }
  return value;
};

EncoderDemo.prototype.encodeWebpImage_ = function() {
  var width = parseInt(this.canvasEl_.getAttribute('width'));
  var height = parseInt(this.canvasEl_.getAttribute('height'));
  var webpEncoder = new webp.Encoder();
  webpEncoder.setQuality(this.getQualityInputValue_());
  webpEncoder.setFast(this.fastCheckboxEl_.checked);
  if (!webpEncoder.encode(this.canvasEl_)) {
    throw Error('Error encoding Webp');
  }

  var imageEl = document.createElement('img');
  imageEl.src = webp.util.createObjectUrl(webpEncoder.getOutputAsBlob());
  goog.dom.removeChildren(this.encodedWebpContainerEl_);
  this.encodedWebpContainerEl_.appendChild(imageEl);
};

EncoderDemo.prototype.encodeNativeWebpImage_ = function() {
  var imageEl = document.createElement('img');
  var dataUrl = this.canvasEl_.toDataURL(webp.PhotoMimeType.WEBP,
      this.getQualityInputValue_() / 100);
  if (dataUrl.indexOf("data:" + webp.PhotoMimeType.WEBP) == 0) {
    imageEl.src = dataUrl;
    goog.dom.removeChildren(this.nativeWebpContainerEl_);
    this.nativeWebpContainerEl_.appendChild(imageEl);
  }
};

EncoderDemo.prototype.encodeNativePngImage_ = function() {
  var imageEl = document.createElement('img');
  var dataUrl = this.canvasEl_.toDataURL(webp.PhotoMimeType.PNG);
  if (dataUrl.indexOf("data:" + webp.PhotoMimeType.PNG) == 0) {
    imageEl.src = dataUrl;
    goog.dom.removeChildren(this.nativePngContainerEl_);
    this.nativePngContainerEl_.appendChild(imageEl);
  }
};

goog.debug.Console.autoInstall();
goog.debug.Console.instance.setCapturing(true);

});

function testLoad() {
  // Ensure the demo loads without javascript errors.
}
