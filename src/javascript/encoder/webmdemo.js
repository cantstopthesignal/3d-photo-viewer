// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.WebmDemo');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.events.EventHandler');
goog.require('goog.style');
goog.require('goog.testing.jsunit');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.encoder.Webm');
goog.require('pics3.encoder.Webp');
goog.require('pics3.encoder.testing.WebpTestFactory');
goog.require('pics3.encoder.testing.webmTestUtil');
goog.require('pics3.encoder.util');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.encoder.WebmDemo = function() {
  goog.base(this);

  /** @type {number} */
  this.frameIndex_;

  /** @type {number} */
  this.frameTime_;

  /** @type {goog.events.EventHandler} */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);
};
goog.inherits(pics3.encoder.WebmDemo, goog.events.EventTarget);

/** @type {!pics3.encoder.Webp.Factory} */
pics3.encoder.WebmDemo.WEBP_FACTORY_ =
    new pics3.encoder.testing.WebpTestFactory();

/** @type {Element} */
pics3.encoder.WebmDemo.prototype.stereoCheckboxEl_;

/** @type {Element} */
pics3.encoder.WebmDemo.prototype.nativeWebpCheckboxEl_;

/** @type {Element} */
pics3.encoder.WebmDemo.prototype.canvasEl_;

/** @type {Element} */
pics3.encoder.WebmDemo.prototype.progressEl_;

/** @type {Element} */
pics3.encoder.WebmDemo.prototype.statusEl_;

/** @type {Element} */
pics3.encoder.WebmDemo.prototype.videoEl_;

/** @type {Element} */
pics3.encoder.WebmDemo.prototype.downloadEl_;

/** @type {pics3.encoder.Webm} */
pics3.encoder.WebmDemo.prototype.webm_;

/** @type {boolean} */
pics3.encoder.WebmDemo.prototype.threeD_ = false;

pics3.encoder.WebmDemo.prototype.start = function() {
  this.stereoCheckboxEl_ = document.getElementById('stereo-checkbox');
  this.nativeWebpCheckboxEl_ = document.getElementById('native-webp-checkbox');
  this.canvasEl_ = document.getElementById('canvas');
  this.canvasCtx_ = this.canvasEl_.getContext('2d');
  this.progressEl_ = document.getElementById('progress');
  this.statusEl_ = document.getElementById('status');
  this.videoEl_ = document.getElementById('video');
  this.downloadEl_ = document.getElementById('download');
  goog.style.showElement(this.downloadEl_, true);

  this.eventHandler_.
      listen(this.stereoCheckboxEl_, goog.events.EventType.CHANGE,
          this.handleInputOptionsChanged_).
      listen(this.nativeWebpCheckboxEl_, goog.events.EventType.CHANGE,
          this.handleInputOptionsChanged_);

  this.startRenderVideo_();
};

pics3.encoder.WebmDemo.prototype.handleInputOptionsChanged_ = function() {
  this.startRenderVideo_();
};

/** @param {Function} callback */
pics3.encoder.WebmDemo.prototype.requestAnimationFrame_ = function(callback) {
  (window['requestAnimationFrame'] ||
      window['mozRequestAnimationFrame'] ||
      window['webkitRequestAnimationFrame'] ||
      window['msRequestAnimationFrame'])(callback);
};

pics3.encoder.WebmDemo.prototype.startRenderVideo_ = function() {
  this.frameTime_ = goog.now();
  this.frameIndex_ = 0;
  this.webm_ = new pics3.encoder.Webm();
  this.threeD_ = this.stereoCheckboxEl_.checked;

  this.progressEl_.value = 0;
  this.progressEl_.style.visibility = 'visible';
  goog.style.showElement(this.videoEl_, false);
  this.downloadEl_.href = null;
  this.statusEl_.innerHTML = '';
  this.stereoCheckboxEl_.disabled = true;

  this.nextAnimation_();
};

pics3.encoder.WebmDemo.prototype.nextAnimation_ = function() {
  var requestNextFrame = goog.bind(function() {
    if (progress.value / progress.max < 1) {
      this.requestAnimationFrame_(goog.bind(this.nextAnimation_, this));
      this.statusEl_.innerHTML = "Drawing Frames";
    } else {
      this.statusEl_.innerHTML = "Compiling Video";
      this.requestAnimationFrame_(goog.bind(this.finalizeVideo_, this));
    }
  }, this);

  this.progressEl_.value++;
  this.frameIndex_++;
  this.frameTime_ += 1000;

  var dataUrls = [];
  if (this.threeD_) {
    for (var i = 0; i < 2; i++) {
      pics3.encoder.testing.webmTestUtil.render3dSample(this.canvasCtx_,
          this.frameIndex_, i == 0);
      dataUrls.push(new pics3.parser.DataUrl(
          this.canvasEl_.toDataURL(pics3.PhotoMimeType.JPG)));
    }
  } else {
    pics3.encoder.testing.webmTestUtil.renderClock(this.canvasCtx_,
        this.frameTime_);
    dataUrls.push(new pics3.parser.DataUrl(
        this.canvasEl_.toDataURL(pics3.PhotoMimeType.JPG)));
  }

  var webpEncoder = pics3.encoder.WebmDemo.WEBP_FACTORY_.createWebp();
  webpEncoder.setEnableNativeEncoder(this.nativeWebpCheckboxEl_.checked);
  webpEncoder.encodeFromDataUrls(dataUrls).addCallback(function() {
    var frame = pics3.encoder.Webm.Frame.newFrame(webpEncoder.getImage(), 50);
    if (dataUrls.length == 2) {
      frame.setStereoSideBySide(true);
    }
    this.webm_.addFrame(frame);
    requestNextFrame();
  }, this);
};

pics3.encoder.WebmDemo.prototype.finalizeVideo_ = function() {
  var startTime = goog.now();
  this.webm_.compile(true);
  var output = this.webm_.getOutputAsBlob();
  var elapsed = goog.now() - startTime;

  var url = pics3.encoder.util.createObjectUrl(output);
  this.videoEl_.src = url;
  goog.style.showElement(this.videoEl_, true);

  this.downloadEl_.href = url;
  goog.style.showElement(this.downloadEl_, true);
  this.statusEl_.innerHTML = "Compiled Video in " + elapsed +
      "ms, file size: " + Math.ceil(output.size / 1024) + "KB";

  this.progressEl_.style.visibility = 'hidden';
  this.stereoCheckboxEl_.disabled = false;
};

function testLoad() {
  // Ensure the demo loads without javascript errors.
}
