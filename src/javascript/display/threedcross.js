// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.display.ThreeDCross');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('pics3.Component');
goog.require('pics3.Photo');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.display.Base');
goog.require('pics3.display.Type');


/**
 * @param {!pics3.Photo} photo
 * @constructor
 * @extends {pics3.display.Base}
 */
pics3.display.ThreeDCross = function(photo) {
  goog.base(this, pics3.display.Type.THREE_D_CROSS, photo);
  goog.asserts.assert(photo.getState() == pics3.Photo.State.LOADED);
  goog.asserts.assert(photo.getMimeType() == pics3.PhotoMimeType.MPO);
  goog.asserts.assert(photo.getImageCount() == 2);

  /** @type {!Array.<!Element>} */
  this.imageEls_ = [];

  /** @type {!Array.<!Element>} */
  this.crossEyeDotEls_ = [];
};
goog.inherits(pics3.display.ThreeDCross, pics3.display.Base);

/** @type {number} */
pics3.display.ThreeDCross.IMAGE_SPACER_PIXELS = 4;

/** @type {number} */
pics3.display.ThreeDCross.DEFAULT_MAX_IMAGE_WIDTH_PIXELS = 350;

/** @type {number} */
pics3.display.ThreeDCross.CROSS_EYE_DOT_MARGIN = 16;

/** @type {Element} */
pics3.display.ThreeDCross.prototype.helpContainerEl_;

pics3.display.ThreeDCross.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'photo-display', 'threedcross-photo-display');

  this.helpContainerEl_ = document.createElement('div');
  goog.dom.classes.add(this.helpContainerEl_, 'help-container');
  this.el.appendChild(this.helpContainerEl_);
  this.helpContainerEl_.appendChild(document.createTextNode(
      'View 3D by relaxing your eyes: look through the screen until the ' +
      'two dots line up.'));

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
    goog.style.setStyle(imageEl, 'visibility', 'hidden');
    this.imageEls_.push(imageEl);
    this.el.appendChild(imageEl);
  }
  for (var i = 0; i < 2; i++) {
    var crossEyeDotEl = document.createElement('div');
    goog.dom.classes.add(crossEyeDotEl, 'cross-eye-dot');
    goog.style.setStyle(crossEyeDotEl, 'visibility', 'hidden');
    this.crossEyeDotEls_.push(crossEyeDotEl);
    this.el.appendChild(crossEyeDotEl);
  }
};

pics3.display.ThreeDCross.prototype.handleImagesLoaded_ = function() {
  this.layout();
  for (var i = 0; i < 2; i++) {
    goog.style.setStyle(this.imageEls_[i], 'visibility', '');
    goog.style.setStyle(this.crossEyeDotEls_[i], 'visibility', '');
  }
};

pics3.display.ThreeDCross.prototype.layout = function() {
  var ThreeDCross = pics3.display.ThreeDCross;

  var displayBounds = goog.style.getBounds(this.el);
  var halfWidth = Math.ceil(displayBounds.width / 2);
  var halfSpacer = Math.floor(ThreeDCross.IMAGE_SPACER_PIXELS /
      2);
  var helpBounds = goog.style.getBounds(this.helpContainerEl_);
  var helpBottom = helpBounds.top + helpBounds.height - displayBounds.top;
  var crossEyeDotSize = this.crossEyeDotEls_[0].offsetWidth;
  var headerHeight = crossEyeDotSize +
      2 * ThreeDCross.CROSS_EYE_DOT_MARGIN + helpBottom;
  var maxImageHeight = Math.max(50, displayBounds.height - headerHeight);
  for (var i = 0; i < 2; i++) {
    var naturalImageWidth = this.imageEls_[i].naturalWidth;
    var naturalImageHeight = this.imageEls_[i].naturalHeight;
    if (!naturalImageWidth || !naturalImageHeight) {
      continue;
    }
    var imageWidth = Math.min(halfWidth - halfSpacer, ThreeDCross.
        DEFAULT_MAX_IMAGE_WIDTH_PIXELS);
    var imageHeight = Math.ceil(imageWidth * naturalImageHeight /
        naturalImageWidth);
    if (imageHeight > maxImageHeight) {
      imageHeight = maxImageHeight;
      imageWidth = Math.ceil(imageHeight * naturalImageWidth /
          naturalImageHeight);
    }
    var x = i == 0 ? halfWidth - imageWidth - halfSpacer : halfWidth +
        halfSpacer;
    var y = Math.floor((displayBounds.height - imageHeight) / 2);
    y = Math.max(headerHeight, y);
    goog.style.setPosition(this.imageEls_[i], x, y);
    goog.style.setBorderBoxSize(this.imageEls_[i],
        new goog.math.Size(imageWidth, imageHeight));

    goog.style.setPosition(this.crossEyeDotEls_[i],
        x + (imageWidth - crossEyeDotSize) / 2,
        y - crossEyeDotSize - ThreeDCross.CROSS_EYE_DOT_MARGIN);
  }
}