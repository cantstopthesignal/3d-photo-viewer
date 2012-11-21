// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.Ifd');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('pics3.parser.BaseParser');
goog.require('pics3.parser.DataReader');
goog.require('pics3.parser.Exif');


/**
 * @param {number} baseOffset
 * @param {boolean} checkForNextIfd
 * @extends {pics3.parser.BaseParser}
 * @constructor
 */
pics3.parser.Ifd = function(baseOffset, checkForNextIfd) {
  goog.base(this, 'pics3.parser.Ifd');

  /** @type {number} */
  this.baseOffset_ = baseOffset;

  /** @type {boolean} */
  this.checkForNextIfd_ = checkForNextIfd;

  /** @type {?number} */
  this.offsetToNextIfd_;

  /** @type {Object.<number, Object>} */
  this.keyMap_ = {};

  /** @type {number} */
  this.keyCount_;
};
goog.inherits(pics3.parser.Ifd, pics3.parser.BaseParser);

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
  if (this.checkForNextIfd_) {
    this.offsetToNextIfd_ = reader.readUint32();
  }
};

pics3.parser.Ifd.prototype.getKeyCount = function() {
  return this.keyCount_;
};

pics3.parser.Ifd.prototype.getKey = function(tag) {
  return this.keyMap_[tag];
};

/**
 * @param {number} tag
 * @param {pics3.parser.Exif.IfdTagType} tagType
 * @param {number} count
 * @param {Array=} opt_payloadBytes
 * @param {number=} opt_payloadUint32
 */
pics3.parser.Ifd.prototype.getAndAssertKey = function(tag, tagType, count,
    opt_payloadBytes, opt_payloadUint32) {
  var key = this.getKey(tag);
  this.assert(key, 'Expected found ifd key: ' + tag);
  this.assertEquals(tagType, key.tagType, 'Expect tag type');
  this.assertEquals(count, key.count, 'Expect count');
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

pics3.parser.Ifd.prototype.parseIfdKey_ = function(reader) {
  var Exif = pics3.parser.Exif;

  var startOffset = reader.getOffset();
  var tag = reader.readUint16();
  var tagType = reader.readUint16();
  this.assert(Exif.isIfdTagType(tagType), 'Expected a valid ifd tag type but ' +
      'was ' + tagType);
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
