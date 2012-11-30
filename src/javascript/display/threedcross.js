// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.display.ThreeDCross');

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
pics3.display.ThreeDCross = function(photo) {
  goog.base(this, photo);
  goog.asserts.assert(photo.getState() == pics3.Photo.State.LOADED);
  goog.asserts.assert(photo.getMimeType() == pics3.Photo.MimeType.MPO);
  goog.asserts.assert(photo.getImageCount() == 2);

  /** @type {!Array.<!Element>} */
  this.imageEls_ = [];
};
goog.inherits(pics3.display.ThreeDCross, pics3.display.Base);

pics3.display.ThreeDCross.IMAGE_SPACER_PIXELS = 4;

pics3.display.ThreeDCross.DEFAULT_MAX_IMAGE_WIDTH_PIXELS = 350;

pics3.display.ThreeDCross.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'photo-display', '3dcross-photo-display');

  var imagesLoaded = 0;
  function imageLoadBarrier() {
    imagesLoaded++;
    if (imagesLoaded == 2) {
      this.handleImagesLoaded_();
    }
  }

  for (var i = 0; i < 2; i++) {
    var imageEl = document.createElement('img');
    goog.dom.classes.add(imageEl, 'image');
    this.eventHandler.listen(imageEl, goog.events.EventType.LOAD,
        imageLoadBarrier);
    imageEl.src = this.photo.getImageDataUrl(i);
    imageEl.style.visibility = 'hidden';
    this.imageEls_.push(imageEl);
    this.el.appendChild(imageEl);
  }
};

pics3.display.ThreeDCross.prototype.handleImagesLoaded_ = function() {
  this.resizeImages_();
  for (var i = 0; i < 2; i++) {
    this.imageEls_[i].style.visibility = '';
  }
};

/**
 * @param {number=} opt_width
 * @param {number=} opt_height
 */
pics3.display.ThreeDCross.prototype.resize = function(opt_width, opt_height) {
  var width = opt_width || this.el.parentNode.offsetWidth;
  var height = opt_height || this.el.parentNode.offsetHeight;
  goog.style.setBorderBoxSize(this.el,
      new goog.math.Size(width, height));
  this.resizeImages_();
};

pics3.display.ThreeDCross.prototype.resizeImages_ = function() {
  var width = Math.ceil(this.el.offsetWidth / 2);
  var height = this.el.offsetHeight;
  var halfSpacer = Math.floor(pics3.display.ThreeDCross.IMAGE_SPACER_PIXELS /
      2);
  for (var i = 0; i < 2; i++) {
    var naturalImageWidth = this.imageEls_[i].naturalWidth;
    var naturalImageHeight = this.imageEls_[i].naturalHeight;
    if (!naturalImageWidth || !naturalImageHeight) {
      continue;
    }
    var imageWidth = Math.min(width - halfSpacer, pics3.display.ThreeDCross.
        DEFAULT_MAX_IMAGE_WIDTH_PIXELS);
    var imageHeight = Math.ceil(imageWidth * naturalImageHeight /
        naturalImageWidth);
    if (imageHeight > height) {
      imageHeight = height;
      imageWidth = Math.ceil(imageHeight * naturalImageWidth /
          naturalImageHeight);
    }
    goog.style.setPosition(this.imageEls_[i],
        i == 0 ? width - imageWidth - halfSpacer : width + halfSpacer,
        Math.floor((height - imageHeight) / 2));
    goog.style.setBorderBoxSize(this.imageEls_[i],
        new goog.math.Size(imageWidth, imageHeight));
  }
}