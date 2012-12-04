// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.DataUrl');

goog.require('goog.asserts');
goog.require('pics3.parser.base64');


/**
 * @param {string} url
 * @constructor
 */
pics3.parser.DataUrl = function(url) {
  goog.asserts.assert(url.indexOf('data:') == 0);
  /**
   * @type {string}
   * @private
   */
  this.url_ = url;

  var commaIndex = url.indexOf(',');
  goog.asserts.assert(commaIndex > 0);

  var attrib = url.substr(5, commaIndex - 5);
  var attribPieces = attrib.split(';');

  var foundBase64 = false;
  for (var i = 0; i < attribPieces.length; i++) {
    if (attribPieces[i] == 'base64') {
      foundBase64 = true;
    }
  }
  goog.asserts.assert(foundBase64);

  /**
   * @type {string}
   * @private
   */
  this.mimeType_ = attribPieces[0];
  goog.asserts.assert(!this.mimeType_.length ||
      this.mimeType_.indexOf('/') > 0);

  /**
   * @type {string}
   * @private
   */
  this.base64Data_ = url.substr(commaIndex + 1);
};

/**
 * @param {!Object} object
 * @return {!pics3.parser.DataUrl}
 */
pics3.parser.DataUrl.fromObject = function(object) {
  var url = object['url'];
  goog.asserts.assert(url);
  return new pics3.parser.DataUrl(url);
};

/**
 * @param {string} mimeType
 * @param {!Uint8Array} array
 * @return {!pics3.parser.DataUrl}
 */
pics3.parser.DataUrl.fromUint8Array = function(mimeType, array) {
  return new pics3.parser.DataUrl('data:' + mimeType + ';base64,' +
      pics3.parser.base64.fromUint8Array(array));
};

/**
 * @return {string}
 */
pics3.parser.DataUrl.prototype.getMimeType = function() {
  return this.mimeType_;
};

pics3.parser.DataUrl.prototype.toString = function() {
  return this.url_;
};

pics3.parser.DataUrl.prototype.toObject = function() {
  return {
    'url': this.url_
  };
};

pics3.parser.DataUrl.prototype.toUint8Array = function() {
  return pics3.parser.base64.toUint8Array(this.base64Data_);
};
