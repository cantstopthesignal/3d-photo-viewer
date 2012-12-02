// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.Exif');

goog.require('goog.asserts');
goog.require('pics3.parser.util');


goog.scope(function() {

var Exif = pics3.parser.Exif;
var util = pics3.parser.util;

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

/** @enum {number} */
Exif.IfdTagType = {
  /** An 8-bit unsigned integer */
  BYTE: 1,

  /**
   * An 8-bit byte containing one 7-bit ASCII code. The final byte
   * is terminated with NULL.
   */
  ASCII: 2,

  /** A 16-bit (2-byte) unsigned integer */
  SHORT: 3,

  /** A 32-bit (4-byte) unsigned integer */
  LONG: 4,

  /**
   * Two LONGs. The first LONG is the numerator and the second
   * LONG expresses the denominator.
   */
  RATIONAL: 5,

  /**
   * An 8-bit byte that can take any value depending on the field
   * definition.
   */
  UNDEFINED: 7,

  /** A 32-bit (4-byte) signed integer (2's complement notation). */
  SLONG: 9,

  /**
   * SRATIONAL Two SLONGs. The first SLONG is the numerator and the second
   * SLONG is the denominator.
   */
  SRATIONAL: 10
};

Exif.isIfdTagType = function(tagType) {
  if (!Exif.ifdTagTypeValuesSet_) {
    Exif.ifdTagTypeValuesSet_ = {};
    for (var tagTypeName in Exif.IfdTagType) {
      Exif.ifdTagTypeValuesSet_[
          Exif.IfdTagType[tagTypeName]] = true;
    }
  }
  return tagType in Exif.ifdTagTypeValuesSet_;
}

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

});