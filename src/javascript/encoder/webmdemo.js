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
goog.require('pics3.encoder.testing.webmTestUtil');
goog.require('pics3.encoder.util');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.encoder.WebmDemo = function() {
  goog.base(this);

  /** @type {number} */
  this.time_ = goog.now();

  /** @type {goog.events.EventHandler} */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);
};
goog.inherits(pics3.encoder.WebmDemo, goog.events.EventTarget);

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

pics3.encoder.WebmDemo.prototype.start = function() {
  this.canvasEl_ = document.getElementById('canvas');
  this.canvasCtx_ = this.canvasEl_.getContext('2d');
  this.progressEl_ = document.getElementById('progress');
  this.statusEl_ = document.getElementById('status');
  this.videoEl_ = document.getElementById('video');
  this.downloadEl_ = document.getElementById('download');
  this.webm_ = new pics3.encoder.Webm();
  goog.style.showElement(this.downloadEl_, true);

  this.nextAnimation_();
};

/** @param {Function} callback */
pics3.encoder.WebmDemo.prototype.requestAnimationFrame_ = function(callback) {
  (window['requestAnimationFrame'] ||
      window['mozRequestAnimationFrame'] ||
      window['webkitRequestAnimationFrame'] ||
      window['msRequestAnimationFrame'])(callback);
};

pics3.encoder.WebmDemo.prototype.nextAnimation_ = function() {
  this.progressEl_.value++;
  this.time_ += 1000;
  pics3.encoder.testing.webmTestUtil.renderClock(this.canvasCtx_, this.time_);

  var requestNextFrame = goog.bind(function() {
    if (progress.value / progress.max < 1) {
      this.requestAnimationFrame_(goog.bind(this.nextAnimation_, this));
      this.statusEl_.innerHTML = "Drawing Frames";
    } else {
      this.statusEl_.innerHTML = "Compiling Video";
      this.requestAnimationFrame_(goog.bind(this.finalizeVideo_, this));
    }
  }, this);

  var webp = new pics3.encoder.Webp();
  var dataUrl = new pics3.parser.DataUrl(
      this.canvasEl_.toDataURL(pics3.PhotoMimeType.JPG));
  webp.encodeDataUrls([dataUrl]).addCallback(function() {
    var image = webp.getImages()[0];
    var frame = pics3.encoder.Webm.Frame.newFrame(image, 100);
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

  this.downloadEl_.href = url;
  goog.style.showElement(this.downloadEl_, true);
  this.statusEl_.innerHTML = "Compiled Video in " + elapsed +
      "ms, file size: " + Math.ceil(output.size / 1024) + "KB";
};

function testLoad() {
  // Ensure the demo loads without javascript errors.
}
