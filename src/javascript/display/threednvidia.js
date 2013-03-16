// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.display.ThreeDNvidia');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('pics3.Component');
goog.require('pics3.Photo');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.display.Base');
goog.require('pics3.encoder.Webm');
goog.require('pics3.encoder.Webp');
goog.require('pics3.encoder.util');


/**
 * @param {!pics3.Photo} photo
 * @constructor
 * @extends {pics3.display.Base}
 */
pics3.display.ThreeDNvidia = function(photo) {
  goog.base(this, pics3.display.Type.THREE_D_NVIDIA, photo);
  goog.asserts.assert(photo.getState() == pics3.Photo.State.LOADED);
  goog.asserts.assert(photo.getMimeType() == pics3.PhotoMimeType.MPO);
  goog.asserts.assert(photo.getImageCount() == 2);

  /** @type {!pics3.encoder.Webp} */
  this.webp_ = new pics3.encoder.Webp();
  this.registerDisposable(this.webp_);

  /** @type {!pics3.encoder.Webm} */
  this.webm_ = new pics3.encoder.Webm();
  this.registerDisposable(this.webm_);
};
goog.inherits(pics3.display.ThreeDNvidia, pics3.display.Base);

/** @type {string} */
pics3.display.ThreeDNvidia.VIDEO_LOADED_DATA_EVENT_TYPE = 'loadeddata';

/** @type {Element} */
pics3.display.ThreeDNvidia.prototype.videoEl_;

pics3.display.ThreeDNvidia.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'photo-display');

  this.videoEl_ = document.createElement('video');
  goog.dom.classes.add(this.videoEl_, 'image');
  this.eventHandler.listen(this.videoEl_, pics3.display.ThreeDNvidia.
      VIDEO_LOADED_DATA_EVENT_TYPE, this.handleVideoLoaded_);

  var dataUrls = this.photo.getImageDataUrls();
  this.webp_.encodeFromDataUrls(dataUrls).addCallback(function() {
    var image = goog.asserts.assertObject(this.webp_.getImage());
    var frame = pics3.encoder.Webm.Frame.newFrame(image, 1000);
    if (dataUrls.length == 2) {
      frame.setStereoSideBySide(true);
    }
    this.webm_.addFrame(frame);
    this.webm_.compile(true);

    var url = pics3.encoder.util.createObjectUrl(this.webm_.getOutputAsBlob());
    this.videoEl_.src = url;
  }, this);

  goog.style.setStyle(this.videoEl_, 'visibility', 'hidden');
  this.el.appendChild(this.videoEl_);
};

pics3.display.ThreeDNvidia.prototype.handleVideoLoaded_ = function() {
  this.layout();
  goog.style.setStyle(this.videoEl_, 'visibility', '');
};

pics3.display.ThreeDNvidia.prototype.layout = function() {
  this.resizeComponentToFullSize(this.videoEl_, this.videoEl_.videoWidth,
      this.videoEl_.videoHeight);
};
