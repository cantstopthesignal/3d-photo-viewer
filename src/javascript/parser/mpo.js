// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.Mpo');

goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.debug.Logger');
goog.require('pics3.parser.BaseParser');
goog.require('pics3.parser.DataReader');
goog.require('pics3.parser.DataUrl');
goog.require('pics3.parser.Ifd');
goog.require('pics3.parser.Exif');
goog.require('pics3.parser.parseError');
goog.require('pics3.parser.util');


goog.scope(function() {

var Exif = pics3.parser.Exif;
var util = pics3.parser.util;

/**
 * @extends {pics3.parser.BaseParser}
 * @constructor
 */
pics3.parser.Mpo = function() {
  goog.base(this, 'pics3.parser.Mpo');

  /** @type {!Array.<!pics3.parser.Mpo.Image>} */
  this.images_ = [];

  /** @type {Error} */
  this.error_;
};
var Mpo = pics3.parser.Mpo;
goog.inherits(Mpo, pics3.parser.BaseParser);

/** @type {!Array.<number>} */
Mpo.FORMAT_IDENTIFIER = goog.array.concat(util.strToCodeArray('MPF'), [0x00]);

/** @type {!Array.<number>} */
Mpo.VERSION = util.strToCodeArray('0100');

/** @type {number} */
Mpo.IMAGE_DATA_FORMAT_JPEG = 0;

/** @type {!Array.<number>} */
Mpo.TYPE_CODE_DISPARITY = [0x02, 0x00, 0x02];

/** @type {!Array.<number>} */
Mpo.FUJIFILM_MAKERNOTE_IDENTIFIER = util.strToCodeArray('FUJIFILM');

/** @type {!goog.debug.Logger} */
Mpo.prototype.logger_ = goog.debug.Logger.getLogger('pics3.parser.Mpo');

/**
 * @param {ArrayBuffer} data
 * @param {boolean=} opt_throwErrors
 * @return {boolean}
 */
Mpo.prototype.parse = function(data, opt_throwErrors) {
  var startTime = goog.now();
  if (opt_throwErrors) {
    this.parseInternal(data);
  } else {
    try {
      this.parseInternal(data);
    } catch (e) {
      if (!pics3.parser.parseError.is(e)) {
        throw e;
      }
      this.error_ = e;
      return false;
    }
  }
  this.logger_.fine('Parsed in ' + (goog.now() - startTime) + 'ms');
  return true;
};

/** @return {!Array.<pics3.parser.Mpo.Image>} */
Mpo.prototype.getImages = function() {
  return this.images_;
};

/** @return {?pics3.parser.Rational} */
Mpo.prototype.getParallax = function() {
  if (this.images_.length == 2) {
    var fujifilmMakernote = this.images_[1].getFujifilmMakernote();
    if (fujifilmMakernote) {
      return fujifilmMakernote.getParallax();
    }
  }
  return null;
};

/** @return {Error} */
Mpo.prototype.getError = function() {
  return this.error_;
};

/** @param {ArrayBuffer} data */
Mpo.prototype.parseInternal = function(data) {
  this.assertEquals(0, this.images_.length, 'Expected no found images yet');
  this.images_.push(new Mpo.Image(0));
  var reader = new pics3.parser.DataReader(data);
  this.images_[0].parse(reader.clone());

  var mpoIfd = this.images_[0].getMpoIfd();
  this.assert(!!mpoIfd, 'Expected to find an mpo ifd for 3d image');
  var imageInfos = mpoIfd.getImageInfos();
  this.assertEquals(2, imageInfos.length, 'Expected two image infos');
  this.images_[0].setByteLength(imageInfos[1].dataOffset);

  this.images_.push(new Mpo.Image(1));
  this.images_[1].parse(reader.subReader(imageInfos[1].dataOffset,
      imageInfos[1].byteLength));

  this.assertEquals(imageInfos[0].byteLength, this.images_[0].getByteLength(),
      'Expected image 0 byte length');
  this.assertEquals(imageInfos[1].byteLength, this.images_[1].getByteLength(),
      'Expected image 1 byte length');
};

/** @override */
Mpo.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};

/**
 * @extends {pics3.parser.BaseParser}
 * @constructor
 */
Mpo.Image = function(index) {
  goog.base(this, 'pics3.parser.Mpo.Image');

  /** @type {number} */
  this.index_ = index;

  /** @type {pics3.parser.DataReader} */
  this.reader_;

  /** @type {pics3.parser.Exif} */
  this.exif_;

  /** @type {pics3.parser.Mpo.Ifd} */
  this.mpoIfd_;

  /** @type {pics3.parser.Mpo.FujifilmMakernote} */
  this.fujifilmMakernote_;
};
goog.inherits(Mpo.Image, pics3.parser.BaseParser);

/** @type {pics3.parser.DataUrl} */
Mpo.Image.prototype.dataUrl_;

Mpo.Image.prototype.parse = function(reader) {
  this.reader_ = reader.clone();

  reader.setBigEndian(true);
  var startOfImage = reader.readBytes(2);
  this.assertArraysEqual(Exif.START_OF_IMAGE, startOfImage, 'Expected SOI');
  while (!reader.isEmpty()) {
    var possibleAppMarker = reader.peekBytes(2);
    if (!Exif.isAppMarker(possibleAppMarker)) {
      break;
    }
    this.parseAppSection_(reader);
  }
};

Mpo.Image.prototype.getMpoIfd = function() {
  return this.mpoIfd_;
};

/** @return {pics3.parser.Mpo.FujifilmMakernote} */
Mpo.Image.prototype.getFujifilmMakernote = function() {
  return this.fujifilmMakernote_;
};

Mpo.Image.prototype.getByteLength = function() {
  return this.reader_.getByteLength();
};

Mpo.Image.prototype.setByteLength = function(byteLength) {
  this.reader_ = this.reader_.subReader(0, byteLength);
};

/** @return {!pics3.parser.DataUrl} */
Mpo.Image.prototype.toDataUrl = function() {
  if (!this.dataUrl_) {
    this.dataUrl_ = pics3.parser.DataUrl.fromUint8Array(
        'image/jpeg', this.reader_.getUint8Array());
  }
  return this.dataUrl_;
};

/** @param {pics3.parser.DataReader} reader */
Mpo.Image.prototype.parseAppSection_ = function(reader) {
  var appMarker = reader.peekBytes(2);
  this.assert(Exif.isAppMarker(appMarker),
      'App section should start with app marker');
  if (goog.array.equals(Exif.AppMarker.APP1, appMarker)) {
    this.parseApp1Section_(reader);
  } else if (goog.array.equals(Exif.AppMarker.APP2, appMarker)) {
    this.parseApp2Section_(reader);
  } else {
    // Skip over this app section.
    reader.readBytes(2);
    this.assert(reader.isBigEndian(), 'Expected a big endian reader');
    var sectionLength = reader.readUint16();
    this.assert(sectionLength >= 2, 'App section length should be >= 2 but ' +
        'was: ' + sectionLength);
    var sectionRemaining = sectionLength - 2;
    reader.readBytes(sectionRemaining);
  }
};

/**
 * @param {pics3.parser.DataReader} reader
 */
Mpo.Image.prototype.parseApp1Section_ = function(reader) {
  var appMarker = reader.readBytes(2);
  this.assertArraysEqual(Exif.AppMarker.APP1, appMarker,
      'Expected APP1 marker'); 
  // Skip over this app section.
  this.assert(reader.isBigEndian(), 'Expected a big endian reader');
  var sectionLength = reader.readUint16();
  this.assert(sectionLength >= 2, 'App section length should be >= 2 but ' +
      'was: ' + sectionLength);
  var sectionRemaining = sectionLength - 2;
  var formatIdentifier = reader.peekBytes(6);
  if (goog.array.equals(Exif.EXIF_FORMAT_IDENTIFIER,
      formatIdentifier)) {
    this.assert(!this.exif_, 'Expected at most one exif block');
    this.exif_ = new Exif();
    this.exif_.parse(reader.subReader(0, sectionRemaining));
    if (this.exif_.hasMakernoteBuffer()) {
      this.parseMakernote_(this.exif_.getMakernoteBuffer().clone());
    }
  }
  reader.readBytes(sectionRemaining);
};

/**
 * @param {pics3.parser.DataReader} reader
 */
Mpo.Image.prototype.parseApp2Section_ = function(reader) {
  var appMarker = reader.readBytes(2);
  this.assertArraysEqual(Exif.AppMarker.APP2, appMarker,
      'Expected APP2 marker'); 
  this.assert(reader.isBigEndian(), 'Expected a big endian reader');
  var sectionLength = reader.readUint16();
  this.assert(sectionLength >= 2, 'App section length should be >= 2 but ' +
      'was: ' + sectionLength);
  var sectionRemaining = sectionLength - 2;
  var formatIdentifier = reader.peekBytes(4);
  if (goog.array.equals(Mpo.FORMAT_IDENTIFIER,
      formatIdentifier) && this.index_ == 0) {
    this.assert(!this.mpoIfd_, 'Expected at most one mpo ifd');
    this.mpoIfd_ = new Mpo.Ifd();
    this.mpoIfd_.parse(reader.subReader(0, sectionRemaining));
  }
  reader.readBytes(sectionRemaining);
};

/** @param {pics3.parser.DataReader} reader */
Mpo.Image.prototype.parseMakernote_ = function(reader) {
  var makernoteIdentifier = reader.peekBytes(8);
  if (goog.array.equals(Mpo.FUJIFILM_MAKERNOTE_IDENTIFIER,
      makernoteIdentifier)) {
    this.assert(!this.fujifilmMakernote_,
        'Expected at most one fujifilm makernote');
    this.fujifilmMakernote_ = new Mpo.FujifilmMakernote();
    this.fujifilmMakernote_.parse(reader);
  }
};

/**
 * @extends {pics3.parser.BaseParser}
 * @constructor
 */
Mpo.Ifd = function() {
  goog.base(this, 'pics3.parser.Mpo.Ifd');

  /** @type {Array.<Object>} */
  this.imageInfos_ = [];
};
goog.inherits(Mpo.Ifd, pics3.parser.BaseParser);

/** @enum {number} */
Mpo.Ifd.TagId = {
  VERSION: 45056,
  IMAGE_COUNT: 45057,
  ENTRY: 45058
};

/** @type {?number} */
Mpo.Ifd.prototype.baseOffset_;

/** @type {?number} */
Mpo.Ifd.prototype.baseOffsetAbsolute_;

/** @type {?number} */
Mpo.Ifd.prototype.imageCount_;

/** @param {!pics3.parser.DataReader} reader */
Mpo.Ifd.prototype.parse = function(reader) {
  var formatIdentifier = reader.readBytes(4);
  this.assertArraysEqual(Mpo.FORMAT_IDENTIFIER,
      formatIdentifier, 'Expected MPF IDF format');
  this.baseOffset_ = reader.getOffset();
  this.baseOffsetAbsolute_ = reader.getAbsoluteOffset();
  var endianTag = reader.readBytes(4);
  this.assert(Exif.isEndianTag(endianTag), 'Expected endian tag');
  reader.setBigEndian(goog.array.equals(Exif.EndianTag.BIG, endianTag));

  var offsetToIfd = reader.readUint32();
  this.assertEquals(8, offsetToIfd, 'Expected first offset value');
  this.assertEquals(reader.getOffset() - this.baseOffset_, offsetToIfd,
      'Expected first IFD to follow directly');
  var ifdParser = new pics3.parser.Ifd(true, this.baseOffset_);
  ifdParser.parse(reader.clone());

  ifdParser.getAndAssertKey(Mpo.Ifd.TagId.VERSION,
      pics3.parser.Ifd.TagType.UNDEFINED, 4, Mpo.VERSION);

  var imageCountKey = ifdParser.getAndAssertKey(
      Mpo.Ifd.TagId.IMAGE_COUNT, pics3.parser.Ifd.TagType.LONG, 1);
  this.imageCount_ = imageCountKey.payloadUint32;
  this.assertEquals(2, this.imageCount_, 'Expected stereoscopic image');

  var mpEntryKey = ifdParser.getAndAssertKey(Mpo.Ifd.TagId.ENTRY,
      pics3.parser.Ifd.TagType.UNDEFINED, 16 * this.imageCount_);
  var mpEntryOffset = mpEntryKey.payloadUint32;
  this.assert(mpEntryOffset > reader.getOffset() - this.baseOffset_,
      'Expect mp entry offset to be upcoming.');
  reader.seek(this.baseOffset_ + mpEntryOffset);
  for (var i = 0; i < this.imageCount_; i++) {
    var imageInfoData = this.parseMpEntry_(reader);
    if (i == 0) {
      this.assertEquals(0, imageInfoData.imageDataOffset,
          'First image should have no offset');
    } else {
      imageInfoData.imageDataOffset += this.baseOffsetAbsolute_;
    }
    this.imageInfos_.push(new Mpo.Ifd.ImageInfo(
        imageInfoData.imageSize, imageInfoData.imageDataOffset));
  }
};

Mpo.Ifd.prototype.getImageInfos = function() {
  return this.imageInfos_;
};

Mpo.Ifd.prototype.parseMpEntry_ = function(reader) {
  var startOffset = reader.getOffset();
  var attribData = reader.readBytes(4);
  if (!reader.isBigEndian()) {
    Array.prototype.reverse.call(attribData);
  }
  var dependentParentImageFlag = (attribData[0] & (1 << 7)) != 0;
  var dependentChildImageFlag = (attribData[0] & (1 << 6)) != 0;
  var representativeImageFlag = (attribData[0] & (1 << 5)) != 0;
  var imageDataFormat = attribData[0] & 0x7
  this.assertEquals(Mpo.IMAGE_DATA_FORMAT_JPEG, imageDataFormat,
      'Expected jpeg image');
  var typeCode = [attribData[1], attribData[2], attribData[3]];
  this.assertArraysEqual(Mpo.TYPE_CODE_DISPARITY, typeCode,
      'Expected disparity type code');
  var imageSize = reader.readUint32();
  var imageDataOffset = reader.readUint32();
  var dependentImage1EntryNumber = reader.readUint16();
  var dependentImage2EntryNumber = reader.readUint16();
  this.assertEquals(startOffset + 16, reader.getOffset(),
      'Expected exactly 16 bytes to be read for mp entry');
  return {
    imageSize: imageSize,
    imageDataOffset: imageDataOffset
  };
};

/** @constructor */
Mpo.Ifd.ImageInfo = function(byteLength, dataOffset) {
  /** @type {number} */
  this.byteLength = byteLength;

  /** @type {number} */
  this.dataOffset = dataOffset;
};

/**
 * @extends {pics3.parser.BaseParser}
 * @constructor
 */
Mpo.FujifilmMakernote = function() {
  goog.base(this, 'pics3.parser.Mpo.FujifilmMakernote');
};
goog.inherits(Mpo.FujifilmMakernote, pics3.parser.BaseParser);

/** @enum {number} */
Mpo.FujifilmMakernote.TagId = {
  PARALLAX: 45585
};

/** @type {pics3.parser.Ifd} */
Mpo.FujifilmMakernote.prototype.ifd_;

/** @type {pics3.parser.Rational} */
Mpo.FujifilmMakernote.prototype.parallax_ = null;

/** @param {!pics3.parser.DataReader} reader */
Mpo.FujifilmMakernote.prototype.parse = function(reader) {
  reader = reader.subReader(0);
  var makernoteIdentifier = reader.readBytes(8);
  this.assertArraysEqual(Mpo.FUJIFILM_MAKERNOTE_IDENTIFIER,
      makernoteIdentifier, 'Expected fujifilm makernote');
  reader.setBigEndian(false);  // Fujifilm IFD is little endian.
  var ifdOffset = reader.readUint32();
  this.assertEquals(ifdOffset, reader.getOffset(),
      'Expected fujifilm makernote ifd to directly follow');
  this.ifd_ = new pics3.parser.Ifd(false, 0);
  this.ifd_.parse(reader);
  if (this.ifd_.hasKey(Mpo.FujifilmMakernote.TagId.PARALLAX)) {
    this.parallax_ = this.ifd_.getSRationalKey(reader,
        Mpo.FujifilmMakernote.TagId.PARALLAX);
  }
};

/** @return {?pics3.parser.Rational} */
Mpo.FujifilmMakernote.prototype.getParallax = function() {
  return this.parallax_;
};

});