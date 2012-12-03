// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.Photo');

goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('pics3.parser.DataUrl');
goog.require('pics3.parser.Mpo');


/**
 * @param {!pics3.loader.File} loader
 * @extends {goog.Disposable}
 * @constructor
 */
pics3.Photo = function(loader) {
  /** @type {number} */
  this.id_ = pics3.Photo.nextId_++;

  /** @type {!pics3.loader.File} */
  this.loader_ = loader;
  this.registerDisposable(this.loader_);

  /** @type {pics3.Photo.State} */
  this.state_ = pics3.Photo.State.PENDING;
};
goog.inherits(pics3.Photo, goog.Disposable);

/** @enum {string} */
pics3.Photo.State = {
  PENDING: 'PENDING',
  LOADING: 'LOADING',
  ERROR: 'ERROR',
  LOADED: 'LOADED'
};

/** @enum {string} */
pics3.Photo.MimeType = {
  MPO: 'image/mpo',
  JPG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif'
};

/** @type {number} */
pics3.Photo.nextId_ = 1;

/**
 * @param {string} mimeType
 * @return {boolean}
 */
pics3.Photo.isSupportedMimeType = function(mimeType) {
  return goog.object.containsValue(pics3.Photo.MimeType, mimeType);
};

/** @type {goog.debug.Logger} */
pics3.Photo.prototype.logger_ = goog.debug.Logger.getLogger('pics3.Photo');

/** @type {ArrayBuffer} */
pics3.Photo.prototype.buffer_;

/** @type {?string} */
pics3.Photo.prototype.mimeType_;

/** @type {?string} */
pics3.Photo.prototype.name_;

/** @type {pics3.parser.Mpo} */
pics3.Photo.prototype.mpo_;

/** @type {Error} */
pics3.Photo.prototype.error_;

/** @type {goog.async.Deferred} */
pics3.Photo.prototype.loadDeferred_;

/** @return {number} */
pics3.Photo.prototype.getId = function() {
  return this.id_;
};

/** @return {!pics3.Photo.State} */
pics3.Photo.prototype.getState = function() {
  return this.state_;
};

/**
 * @param {...pics3.Photo.State} var_args
 * @return {boolean}
 */
pics3.Photo.prototype.stateIn = function(var_args) {
  return goog.array.some(arguments, function(state) {
    return this.state_ == state;
  }, this);
};

/** @return {boolean} */
pics3.Photo.prototype.hasMimeType = function() {
  return !!this.mimeType_;
};

/** @return {?string} */
pics3.Photo.prototype.getMimeType = function() {
  return this.mimeType_;
};

/** @return {Error} */
pics3.Photo.prototype.getError = function() {
  return this.error_;
};

/** @return {number} */
pics3.Photo.prototype.getImageCount = function() {
  goog.asserts.assert(this.state_ == pics3.Photo.State.LOADED);
  if (this.mimeType_ == pics3.Photo.MimeType.MPO) {
    return this.mpo_.getImages().length;
  }
  return 1;
};

/**
 * @param {number} index
 * @return {string}
 */
pics3.Photo.prototype.getImageDataUrl = function(index) {
  goog.asserts.assert(this.state_ == pics3.Photo.State.LOADED);
  goog.asserts.assert(index < this.getImageCount());
  goog.asserts.assertString(this.mimeType_);
  if (this.mimeType_ == pics3.Photo.MimeType.MPO) {
    return this.mpo_.getImages()[index].toDataUrl();
  }
  return pics3.parser.DataUrl.fromUint8Array(
      this.mimeType_, new Uint8Array(this.buffer_));
};

/** @return {!goog.async.Deferred} */
pics3.Photo.prototype.loadAsync = function() {
  if (!this.loadDeferred_) {
    goog.asserts.assert(this.state_ == pics3.Photo.State.PENDING);
    this.state_ = pics3.Photo.State.LOADING;
    this.loadDeferred_ = this.loader_.loadAsync().addCallback(
        /** @param {!pics3.loader.FileResult} result */
        function(result) {
          this.buffer_ = result.buffer;
          this.mimeType_ = result.mimeType;
          this.name_ = result.name;
        }, this).
        addCallback(this.parseMpoAsync_, this).
        addCallback(function() {
          this.state_ = pics3.Photo.State.LOADED;
        }, this).addErrback(function(err) {
          this.error_ = err;
          this.state_ = pics3.Photo.State.ERROR;
        }, this);
  }
  return this.loadDeferred_.branch();
};

pics3.Photo.prototype.parseMpoAsync_ = function() {
  goog.asserts.assert(!this.mpo_);
  goog.asserts.assert(this.buffer_ instanceof ArrayBuffer);
  if (!this.isPossible3dPhoto_()) {
    return;
  }
  this.mpo_ = new pics3.parser.Mpo();
  var deferred = new goog.async.Deferred();
  if (this.mpo_.parse(this.buffer_)) {
    this.mimeType_ = pics3.Photo.MimeType.MPO;
    deferred.callback(null);
  } else {
    if (!this.hasMimeType() || this.getMimeType() == pics3.Photo.MimeType.MPO) {
      this.logger_.warning('Could not parse likely mpo file');
      deferred.errback(this.mpo_.getError());
    } else {
      this.logger_.warning('Photo with mimeType ' + this.getMimeType() +
          ' does not appear to be an mpo file: ' + this.mpo_.getError());
      deferred.callback(null);
    }
  }
  return deferred;
};

/** @return {boolean} */
pics3.Photo.prototype.isPossible3dPhoto_ = function() {
  if (!this.hasMimeType()) {
    return true;
  }
  if (this.getMimeType() == pics3.Photo.MimeType.MPO) {
    return true;
  }
  if (this.getMimeType() == pics3.Photo.MimeType.JPG && this.name_) {
    var nameLower = this.name_.toLowerCase();
    if (goog.string.endsWith(nameLower, '.mpo') ||
        nameLower.indexOf('.mpo.') >= 0) {
      return true;
    }
  }
  return false;
};
