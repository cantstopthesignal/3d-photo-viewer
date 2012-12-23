// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.Ifd');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('pics3.parser.BaseParser');
goog.require('pics3.parser.DataReader');
goog.require('pics3.parser.Rational');


/**
 * @param {boolean} readNextIfdOffset
 * @param {number} baseOffset
 * @extends {pics3.parser.BaseParser}
 * @constructor
 */
pics3.parser.Ifd = function(readNextIfdOffset, baseOffset) {
  goog.base(this, 'pics3.parser.Ifd');

  /** @type {boolean} */
  this.readNextIfdOffset_ = readNextIfdOffset;

  /** @type {number} */
  this.baseOffset_ = baseOffset;

  /** @type {?number} */
  this.offsetToNextIfd_;

  /** @type {Object.<number, Object>} */
  this.keyMap_ = {};

  /** @type {number} */
  this.keyCount_;
};
goog.inherits(pics3.parser.Ifd, pics3.parser.BaseParser);

/** @enum {number} */
pics3.parser.Ifd.TagId = {
  EXIF_IFD: 34665,
  MAKERNOTE: 37500
};

/** @enum {number} */
pics3.parser.Ifd.TagType = {
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

pics3.parser.Ifd.isTagType = function(tagType) {
  if (!pics3.parser.Ifd.tagTypeValuesSet_) {
    pics3.parser.Ifd.tagTypeValuesSet_ = {};
    for (var tagTypeName in pics3.parser.Ifd.TagType) {
      pics3.parser.Ifd.tagTypeValuesSet_[
          pics3.parser.Ifd.TagType[tagTypeName]] = true;
    }
  }
  return tagType in pics3.parser.Ifd.tagTypeValuesSet_;
}

pics3.parser.Ifd.prototype.parse = function(reader) {
  this.keyCount_ = reader.readUint16();
  this.assert(this.keyCount_ <= 9999, 'Expected at most 9999 ifd keys');
  for (var i = 0; i < this.keyCount_; i++) {
    var ifdKey = this.parseIfdKey_(reader);
    this.assert(!(ifdKey.tag in this.keyMap_),
        'Did not expect duplicate ifd keys: ' + ifdKey.tag);
    this.keyMap_[ifdKey.tag] = ifdKey;
  }
  this.assertEquals(this.keyCount_, goog.object.getCount(this.keyMap_),
      'Expected all keys to be found');
  if (this.readNextIfdOffset_) {
    this.offsetToNextIfd_ = reader.readUint32();
  }
};

pics3.parser.Ifd.prototype.getKeyCount = function() {
  return this.keyCount_;
};

/**
 * @param {number} tag
 * @return {boolean}
 */
pics3.parser.Ifd.prototype.hasKey = function(tag) {
  return tag in this.keyMap_;
};

/**
 * @param {number} tag
 * @return {Object}
 */
pics3.parser.Ifd.prototype.getKey = function(tag) {
  return this.keyMap_[tag];
};

/**
 * @param {number} tag
 * @param {pics3.parser.Ifd.TagType} tagType
 * @param {number=} opt_count
 * @param {Array=} opt_payloadBytes
 * @param {number=} opt_payloadUint32
 * @return {Object}
 */
pics3.parser.Ifd.prototype.getAndAssertKey = function(tag, tagType, opt_count,
    opt_payloadBytes, opt_payloadUint32) {
  var key = this.getKey(tag);
  this.assert(key, 'Expected found ifd key: ' + tag);
  this.assertEquals(tagType, key.tagType, 'Expect tag type');
  if (goog.isDefAndNotNull(opt_count)) {
    this.assertEquals(opt_count, key.count, 'Expect count');
  }
  if (opt_payloadBytes) {
    this.assertArraysEqual(opt_payloadBytes, key.payloadBytes,
        'Expected payload bytes');
  }
  if (goog.isDefAndNotNull(opt_payloadUint32)) {
    this.assertEquals(opt_payloadUint32, key.payloadUint32,
        'Expected payload Uint32');
  }
  return key;
};

/**
 * @param {!pics3.parser.DataReader} reader
 * @param {number} tag
 * @return {pics3.parser.Rational}
 */
pics3.parser.Ifd.prototype.getSRationalKey = function(reader, tag) {
  var key = this.getAndAssertKey(tag, pics3.parser.Ifd.TagType.SRATIONAL, 1);
  var seekReader = reader.subReader(key.payloadUint32 - reader.getOffset(), 8);
  return new pics3.parser.Rational(seekReader.readInt32(),
      seekReader.readInt32());
};

pics3.parser.Ifd.prototype.parseIfdKey_ = function(reader) {
  var startOffset = reader.getOffset();
  var tag = reader.readUint16();
  var tagType = reader.readUint16();
  this.assert(pics3.parser.Ifd.isTagType(tagType),
      'Expected a valid ifd tag type but was ' + tagType);
  var count = reader.readUint32();
  var payloadBytes = reader.peekBytes(4);
  var payloadUint32 = reader.readUint32();
  this.assertEquals(startOffset + 12, reader.getOffset(),
      'Expected exactly 12 bytes to be read for ifd key');
  return {
    tag: tag,
    tagType: tagType,
    count: count,
    payloadBytes: payloadBytes,
    payloadUint32: payloadUint32
  };
};
