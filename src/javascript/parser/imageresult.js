// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.ImageResult');

goog.require('goog.array');
goog.require('pics3.parser.DataUrl');


/**
 * @param {pics3.PhotoMimeType} mimeType
 * @constructor
 */
pics3.parser.ImageResult = function(mimeType) {
  /** @type {pics3.PhotoMimeType} */
  this.mimeType = mimeType;

  /** @type {?pics3.parser.Rational} */
  this.parallax = null;

  /** @type {!Array.<!pics3.parser.DataUrl>} */
  this.imageDataUrls = [];
};

/**
 * @param {Object} object
 * @return {!pics3.parser.ImageResult}
 */
pics3.parser.ImageResult.fromObject = function(object) {
  var imageResult = new pics3.parser.ImageResult(object['mimeType']);
  imageResult.parallax = object['parallax'] ? pics3.parser.Rational.fromObject(
      object['parallax']) : null;
  imageResult.imageDataUrls = goog.array.map(object['imageDataUrls'],
      function(imageDataUrlObject) {
    return pics3.parser.DataUrl.fromObject(imageDataUrlObject);
  });
  return imageResult;
};

/** @return {Object} */
pics3.parser.ImageResult.prototype.toObject = function() {
  return {
    'mimeType': this.mimeType,
    'parallax': this.parallax ? this.parallax.toObject() : null,
    'imageDataUrls': goog.array.map(this.imageDataUrls, function(imageDataUrl) {
      return imageDataUrl.toObject();
    })
  };
};
