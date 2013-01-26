// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.display.Base');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('pics3.Component');
goog.require('pics3.Photo');


/**
 * @param {!pics3.display.Type} type
 * @param {!pics3.Photo} photo
 * @constructor
 * @extends {pics3.Component}
 */
pics3.display.Base = function(type, photo) {
  goog.base(this);

  /** @type {!pics3.display.Type} */
  this.type = type;

  /** @type {!pics3.Photo} */
  this.photo = photo;
};
goog.inherits(pics3.display.Base, pics3.Component);

/** @return {!pics3.display.Type} */
pics3.display.Base.prototype.getType = function() {
  return this.type;
};

/**
 * @param {number=} opt_width
 * @param {number=} opt_height
 */
pics3.display.Base.prototype.resize = function(opt_width, opt_height) {
  var width = opt_width || this.el.parentNode.offsetWidth;
  var height = opt_height || this.el.parentNode.offsetHeight;
  goog.style.setBorderBoxSize(this.el,
      new goog.math.Size(width, height));
  this.layout();
};

pics3.display.Base.prototype.layout = goog.abstractMethod;

pics3.display.Base.prototype.resizeImageToFullSize = function(imageEl) {
  var width = this.el.offsetWidth;
  var height = this.el.offsetHeight;
  var naturalImageWidth = imageEl.naturalWidth;
  var naturalImageHeight = imageEl.naturalHeight;
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
  goog.style.setPosition(imageEl,
      Math.floor((width - imageWidth) / 2),
      Math.floor((height - imageHeight) / 2));
  goog.style.setBorderBoxSize(imageEl,
      new goog.math.Size(imageWidth, imageHeight));
};
