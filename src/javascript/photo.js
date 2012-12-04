// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.Photo');

goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('pics3.ImageProcessor');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.parser.DataUrl');
goog.require('pics3.parser.Mpo');


/**
 * @param {!pics3.AppContext} appContext
 * @param {!pics3.loader.File} loader
 * @extends {goog.Disposable}
 * @constructor
 */
pics3.Photo = function(appContext, loader) {
  /** @type {number} */
  this.id_ = pics3.Photo.nextId_++;

  /** @type {!pics3.loader.File} */
  this.loader_ = loader;
  this.registerDisposable(this.loader_);

  /** @type {!pics3.ImageProcessor} */
  this.imageProcessor_ = pics3.ImageProcessor.get(appContext);

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

/** @type {number} */
pics3.Photo.nextId_ = 1;

/** @type {goog.debug.Logger} */
pics3.Photo.prototype.logger_ = goog.debug.Logger.getLogger('pics3.Photo');

/** @type {ArrayBuffer} */
pics3.Photo.prototype.buffer_;

/** @type {?string} */
pics3.Photo.prototype.mimeType_;

/** @type {?string} */
pics3.Photo.prototype.name_;

/** @type {Array.<!pics3.parser.DataUrl>} */
pics3.Photo.prototype.imageDataUrls_;

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
  if (this.mimeType_ == pics3.PhotoMimeType.MPO) {
    return this.imageDataUrls_.length;
  }
  return 1;
};

/**
 * @param {number} index
 * @return {pics3.parser.DataUrl}
 */
pics3.Photo.prototype.getImageDataUrl = function(index) {
  goog.asserts.assert(this.state_ == pics3.Photo.State.LOADED);
  goog.asserts.assert(index < this.getImageCount());
  goog.asserts.assertString(this.mimeType_);
  return this.imageDataUrls_[index];
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
        addCallback(this.parseImageAsync_, this).
        addCallback(function() {
          this.state_ = pics3.Photo.State.LOADED;
        }, this).addErrback(function(err) {
          this.error_ = err;
          this.state_ = pics3.Photo.State.ERROR;
        }, this);
  }
  return this.loadDeferred_.branch();
};

pics3.Photo.prototype.parseImageAsync_ = function() {
  goog.asserts.assert(!this.imageDataUrls_);
  goog.asserts.assert(this.buffer_ instanceof ArrayBuffer);
  return this.imageProcessor_.parseImageAsync(
      this.mimeType_, this.name_, this.buffer_).addCallback(
      /** @param {pics3.parser.ImageResult} result */
      function(result) {
        this.mimeType_ = result.mimeType;
        this.imageDataUrls_ = result.imageDataUrls;
      }, this);
};
