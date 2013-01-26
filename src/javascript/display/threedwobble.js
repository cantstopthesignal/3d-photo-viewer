// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.display.ThreeDWobble');

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
 * @param {!pics3.Photo} photo
 * @constructor
 * @extends {pics3.display.Base}
 */
pics3.display.ThreeDWobble = function(photo) {
  goog.base(this, pics3.display.Type.THREE_D_WOBBLE, photo);
  goog.asserts.assert(photo.getState() == pics3.Photo.State.LOADED);
  goog.asserts.assert(photo.getMimeType() == pics3.PhotoMimeType.MPO);
  goog.asserts.assert(photo.getImageCount() == 2);

  /** @type {!Array.<!Element>} */
  this.imageEls_ = [];
};
goog.inherits(pics3.display.ThreeDWobble, pics3.display.Base);

/** @type {number} */
pics3.display.ThreeDWobble.ANIMATION_INTERVAL_MS_ = 100;

/** @type {Element} */
pics3.display.ThreeDWobble.prototype.imageContainerEl_;

/** @type {number} */
pics3.display.ThreeDWobble.prototype.animationIntervalId_;

pics3.display.ThreeDWobble.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'photo-display');

  var numImagesLoaded = 0;
  function handleImageLoad() {
    numImagesLoaded++;
    if (numImagesLoaded == 2) {
      this.handleImagesLoaded_();
    }
  }

  this.imageContainerEl_ = document.createElement('div');
  goog.dom.classes.add(this.imageContainerEl_, 'threedwobble-image-container');
  this.el.appendChild(this.imageContainerEl_);

  for (var i = 0; i < 2; i++) {
    var imageEl = document.createElement('img');
    goog.dom.classes.add(imageEl, 'image');
    this.eventHandler.listen(imageEl, goog.events.EventType.LOAD,
        handleImageLoad);
    imageEl.src = this.photo.getImageDataUrl(i);
    goog.style.setStyle(imageEl, 'visibility', 'hidden');
    this.imageContainerEl_.appendChild(imageEl);
    this.imageEls_.push(imageEl);
  }
};

/** @override */
pics3.display.ThreeDWobble.prototype.disposeInternal = function() {
  window.clearInterval(this.animationIntervalId_);
  delete this.animationIntervalId_;
  goog.base(this, 'disposeInternal');
};

pics3.display.ThreeDWobble.prototype.handleImagesLoaded_ = function() {
  this.layout();
  goog.asserts.assert(!this.animationIntervalId_);

  var imageIndex = 0;
  this.animationIntervalId_ = window.setInterval(goog.bind(function() {
    goog.style.setStyle(this.imageEls_[imageIndex], 'visibility', 'hidden');
    imageIndex = (imageIndex + 1) % 2;
    goog.style.setStyle(this.imageEls_[imageIndex], 'visibility', '');
  }, this), pics3.display.ThreeDWobble.ANIMATION_INTERVAL_MS_);
};

pics3.display.ThreeDWobble.prototype.layout = function() {
  var width = this.el.offsetWidth;
  var height = this.el.offsetHeight;
  var naturalImageWidth = this.imageEls_[0].naturalWidth;
  var naturalImageHeight = this.imageEls_[0].naturalHeight;
  if (!naturalImageWidth || !naturalImageHeight) {
    return;
  }
  var xOffsetRatio = this.photo.getParallaxXOffset() / naturalImageWidth;
  var clippedImageWidth = naturalImageWidth * (1 - Math.abs(xOffsetRatio));
  var containerWidth = width;
  var containerHeight = Math.ceil(containerWidth * naturalImageHeight /
      clippedImageWidth);
  if (containerHeight > height) {
    containerHeight = height;
    containerWidth = Math.ceil(containerHeight * clippedImageWidth /
        naturalImageHeight);
  }
  var imageHeight = containerHeight;
  var imageWidth = containerHeight * naturalImageWidth / naturalImageHeight;
  var xOffset = imageWidth * xOffsetRatio;
  goog.style.setPosition(this.imageContainerEl_,
      Math.floor((width - containerWidth) / 2),
      Math.floor((height - containerHeight) / 2));
  goog.style.setBorderBoxSize(this.imageContainerEl_,
      new goog.math.Size(containerWidth, containerHeight));
  if (xOffset >= 0) {
    goog.style.setPosition(this.imageEls_[0], Math.floor(-xOffset), 0);
  } else {
    goog.style.setPosition(this.imageEls_[1], Math.floor(xOffset), 0);
  }
  for (var i = 0; i < 2; i++) {
    goog.style.setBorderBoxSize(this.imageEls_[i],
        new goog.math.Size(Math.floor(imageWidth), Math.floor(imageHeight)));
  }
};
