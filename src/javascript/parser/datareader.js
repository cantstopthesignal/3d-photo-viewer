// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.DataReader');


/**
 * @param {ArrayBuffer} buffer
 * @param {number=} opt_baseByteOffset
 * @param {number=} opt_byteLength
 * @param {boolean=} opt_bigEndian
 * @constructor
 */
pics3.parser.DataReader = function(buffer, opt_baseByteOffset, opt_byteLength,
    opt_bigEndian) {
  this.baseOffset_ = opt_baseByteOffset || 0;
  this.byteLength_ = opt_byteLength || buffer.byteLength - this.baseOffset_;
  this.array_ = new Uint8Array(buffer, this.baseOffset_, this.byteLength_);
  this.view_ = new DataView(buffer, this.baseOffset_, this.byteLength_);
  this.offset_ = 0;
  this.bigEndian_ = opt_bigEndian || false;
};

pics3.parser.DataReader.prototype.isEmpty = function() {
  return this.offset_ >= this.byteLength_;
};

pics3.parser.DataReader.prototype.setBigEndian = function(bigEndian) {
  this.bigEndian_ = bigEndian;
};

pics3.parser.DataReader.prototype.isBigEndian = function() {
  return this.bigEndian_;
};

pics3.parser.DataReader.prototype.getAbsoluteOffset = function() {
  return this.baseOffset_ + this.offset_;
};

pics3.parser.DataReader.prototype.getOffset = function() {
  return this.offset_;
};

pics3.parser.DataReader.prototype.getByteLength = function() {
  return this.byteLength_;
};

pics3.parser.DataReader.prototype.getUint8Array = function() {
  return this.array_;
};

pics3.parser.DataReader.prototype.clone = function() {
  var reader = new pics3.parser.DataReader(this.array_.buffer,
      this.baseOffset_, this.byteLength_, this.bigEndian_);
  reader.seek(this.offset_);
  return reader;
};

pics3.parser.DataReader.prototype.subReader = function(offset, byteCount) {
  if (offset + this.offset_ + byteCount > this.byteLength_) {
    throw new Error('SubReader past end of DataReader buffer');
  }
  var reader = new pics3.parser.DataReader(this.array_.buffer,
      this.baseOffset_ + this.offset_ + offset, byteCount, this.bigEndian_);
  return reader;
};

pics3.parser.DataReader.prototype.seek = function(bytePosition) {
  if (bytePosition < 0) {
    throw new Error('Seek before beginning of DataReader buffer');
  }
  if (bytePosition >= this.byteLength_) {
    throw new Error('Seek past end of DataReader buffer');
  }
  this.offset_ = bytePosition;
};

pics3.parser.DataReader.prototype.peekBytes = function(length) {
  this.assert_(length > 0, 'peekBytes: length should be > 0 but was ' + length);
  var subArray = this.array_.subarray(this.offset_, this.offset_ + length);
  this.assert_(length == subArray.length,
      'peekBytes: subarray length should equal length but ' +
      length + ' != ' + subArray.length);
  return subArray;
};

pics3.parser.DataReader.prototype.readBytes = function(length) {
  var subArray = this.peekBytes(length);
  this.offset_ += length;
  return subArray;
};

pics3.parser.DataReader.prototype.readUint8 = function() {
  var value = this.view_.getUint8(this.offset_);
  this.offset_ += 1;
  return value;
};

pics3.parser.DataReader.prototype.readUint16 = function() {
  var value = this.view_.getUint16(this.offset_, !this.bigEndian_);
  this.offset_ += 2;
  return value;
};

pics3.parser.DataReader.prototype.readUint32 = function() {
  var value = this.view_.getUint32(this.offset_, !this.bigEndian_);
  this.offset_ += 4;
  return value;
};

/**
 * @param {boolean} cond
 * @param {string} msg
 */
pics3.parser.DataReader.prototype.assert_ = function(cond, msg) {
  if (!cond) {
    throw new Error('pics3.parser.DataReader: ' + msg);
  }
};
