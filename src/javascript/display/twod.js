// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.display.TwoD');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('pics3.Component');
goog.require('pics3.Photo');
goog.require('pics3.display.Base');


/**
 * @param {!pics3.Photo} photo
 * @constructor
 * @extends {pics3.display.Base}
 */
pics3.display.TwoD = function(photo) {
  goog.base(this, photo);
  goog.asserts.assert(photo.getState() == pics3.Photo.State.LOADED);
  goog.asserts.assert(photo.getMimeType() != pics3.Photo.MimeType.MPO);
  goog.asserts.assert(photo.getImageCount() == 1);
};
goog.inherits(pics3.display.TwoD, pics3.display.Base);

/** @type {Element} */
pics3.display.TwoD.prototype.imageEl_;

pics3.display.TwoD.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'photo-display', '2d-photo-display');

  this.imageEl_ = document.createElement('img');
  goog.dom.classes.add(this.imageEl_, 'image');
  this.eventHandler.listen(this.imageEl_, goog.events.EventType.LOAD,
      this.handleImageLoaded_);
  this.imageEl_.src = this.photo.getImageDataUrl(0);
  this.imageEl_.style.visibility = 'hidden';
  this.el.appendChild(this.imageEl_);
};

pics3.display.TwoD.prototype.handleImageLoaded_ = function() {
  this.resizeImage_();
  this.imageEl_.style.visibility = '';
};

/**
 * @param {number=} opt_width
 * @param {number=} opt_height
 */
pics3.display.TwoD.prototype.resize = function(opt_width, opt_height) {
  var width = opt_width || this.el.parentNode.offsetWidth;
  var height = opt_height || this.el.parentNode.offsetHeight;
  goog.style.setBorderBoxSize(this.el,
      new goog.math.Size(width, height));
  this.resizeImage_();
};

pics3.display.TwoD.prototype.resizeImage_ = function() {
  var width = this.el.offsetWidth;
  var height = this.el.offsetHeight;
  var naturalImageWidth = this.imageEl_.naturalWidth;
  var naturalImageHeight = this.imageEl_.naturalHeight;
  if (!naturalImageWidth || !naturalImageHeight) {
    return;
  }
  var imageWidth = width;
  var imageHeight = Math.ceil(imageWidth * naturalImageHeight /
      naturalImageWidth);
  if (imageHeight > height) {
    imageHeight = height;
    imageWidth = Math.ceil(imageHeight * naturalImageWidth /
        naturalImageHeight);
  }
  goog.style.setPosition(this.imageEl_,
      Math.floor((width - imageWidth) / 2),
      Math.floor((height - imageHeight) / 2));
  goog.style.setBorderBoxSize(this.imageEl_,
      new goog.math.Size(imageWidth, imageHeight));
}