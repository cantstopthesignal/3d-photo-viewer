// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.Exif');

goog.require('goog.asserts');
goog.require('pics3.parser.Ifd');
goog.require('pics3.parser.util');


goog.scope(function() {

var util = pics3.parser.util;
var Ifd = pics3.parser.Ifd;

/**
 * @extends {pics3.parser.BaseParser}
 * @constructor
 */
pics3.parser.Exif = function() {
  goog.base(this, 'pics3.parser.Exif');
};
var Exif = pics3.parser.Exif;
goog.inherits(Exif, pics3.parser.BaseParser);

/** @type {!Array.<number>} */
Exif.START_OF_IMAGE = [0xff, 0xd8];

/** @type {!Array.<number>} */
Exif.END_OF_IMAGE = [0xff, 0xd9];

/** @type {!Array.<number>} */
Exif.EXIF_FORMAT_IDENTIFIER = goog.array.concat(
    util.strToCodeArray('Exif'), [0x00, 0x00]);

/** @enum {!Array.<number>} */
Exif.AppMarker = {
  APP1: [0xff, 0xe1],
  APP2: [0xff, 0xe2]
};

/** @enum {!Array.<number>} */
Exif.EndianTag = {
  BIG: [0x4d, 0x4d, 0x00, 0x2a],
  LITTLE: [0x49, 0x49, 0x2a, 0x00]
};

Exif.isAppMarker = function(arr) {
  if (arr.length != 2) {
    throw new Error('App markers should be 2 bytes');
  }
  if (arr[0] != 0xff) {
    return false;
  }
  return arr[1] >= 0xe0 && arr[1] <= 0xef;
};

Exif.isEndianTag = function(arr) {
  if (arr.length != 4) {
    throw new Error('Endian tags should be 4 bytes');
  }
  return goog.array.equals(Exif.EndianTag.BIG, arr) ||
      goog.array.equals(Exif.EndianTag.LITTLE, arr);
};

/** @type {?number} */
Exif.prototype.baseOffset_;

/** @type {pics3.parser.Ifd} */
Exif.prototype.ifd_;

/** @type {pics3.parser.Ifd} */
Exif.prototype.exifIfd_;

/** @type {pics3.parser.DataReader} */
Exif.prototype.makernoteBuffer_;

/** @param {!pics3.parser.DataReader} reader */
Exif.prototype.parse = function(reader) {
  var formatIdentifier = reader.readBytes(6);
  this.assertArraysEqual(Exif.EXIF_FORMAT_IDENTIFIER,
      formatIdentifier, 'Expected Exif IDF format');
  this.baseOffset_ = reader.getOffset();
  var endianTag = reader.readBytes(4);
  this.assert(Exif.isEndianTag(endianTag), 'Expected endian tag');
  reader.setBigEndian(goog.array.equals(Exif.EndianTag.BIG, endianTag));

  var offsetToIfd = reader.readUint32();
  this.assertEquals(8, offsetToIfd, 'Expected first offset value');
  this.assertEquals(reader.getOffset() - this.baseOffset_, offsetToIfd,
      'Expected first IFD to follow directly');
  this.ifd_ = new Ifd(true, this.baseOffset_);
  this.ifd_.parse(reader.clone());
  if (!this.ifd_.hasKey(Ifd.TagId.EXIF_IFD)) {
    return;
  }

  var exifIfdKey = this.ifd_.getAndAssertKey(Ifd.TagId.EXIF_IFD,
      Ifd.TagType.LONG, 1);
  var exifIfdJumpOffset = this.baseOffset_ - reader.getOffset() +
      exifIfdKey.payloadUint32;
  this.exifIfd_ = new Ifd(true, this.baseOffset_);
  this.exifIfd_.parse(reader.subReader(exifIfdJumpOffset));

  if (this.exifIfd_.hasKey(Ifd.TagId.MAKERNOTE)) {
    var makernoteKey = this.exifIfd_.getAndAssertKey(Ifd.TagId.MAKERNOTE,
        Ifd.TagType.UNDEFINED);
    var makernoteJumpOffset = this.baseOffset_ - reader.getOffset() +
        makernoteKey.payloadUint32;
    this.makernoteBuffer_ = reader.subReader(makernoteJumpOffset,
        makernoteKey.count);
  }
};

/** @return {boolean} */
Exif.prototype.hasMakernoteBuffer = function() {
  return !!this.makernoteBuffer_;
};

/** @return {pics3.parser.DataReader} */
Exif.prototype.getMakernoteBuffer = function() {
  return this.makernoteBuffer_;
};

});