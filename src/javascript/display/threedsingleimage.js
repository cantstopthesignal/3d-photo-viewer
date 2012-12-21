// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.display.ThreeDSingleImage');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('pics3.Component');
goog.require('pics3.Photo');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.display.Base');


/**
 * @param {boolean} leftImage
 * @param {!pics3.Photo} photo
 * @constructor
 * @extends {pics3.display.Base}
 */
pics3.display.ThreeDSingleImage = function(leftImage, photo) {
  goog.base(this, leftImage ? pics3.display.Type.THREE_D_LEFT_IMAGE :
      pics3.display.Type.THREE_D_RIGHT_IMAGE, photo);
  goog.asserts.assert(photo.getState() == pics3.Photo.State.LOADED);
  goog.asserts.assert(photo.getMimeType() == pics3.PhotoMimeType.MPO);
  goog.asserts.assert(photo.getImageCount() == 2);

  /** @type {boolean} */
  this.leftImage_ = leftImage;
};
goog.inherits(pics3.display.ThreeDSingleImage, pics3.display.Base);

/** @type {Element} */
pics3.display.ThreeDSingleImage.prototype.imageEl_;

pics3.display.ThreeDSingleImage.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'photo-display');

  this.imageEl_ = document.createElement('img');
  goog.dom.classes.add(this.imageEl_, 'image');
  this.eventHandler.listen(this.imageEl_, goog.events.EventType.LOAD,
      this.handleImageLoaded_);
  this.imageEl_.src = this.photo.getImageDataUrl(this.leftImage_ ? 0 : 1);
  goog.style.setStyle(this.imageEl_, 'visibility', 'hidden');
  this.el.appendChild(this.imageEl_);
};

pics3.display.ThreeDSingleImage.prototype.handleImageLoaded_ = function() {
  this.layout();
  goog.style.setStyle(this.imageEl_, 'visibility', '');
};

pics3.display.ThreeDSingleImage.prototype.layout = function() {
  this.resizeImageToFullSize(this.imageEl_);
};
