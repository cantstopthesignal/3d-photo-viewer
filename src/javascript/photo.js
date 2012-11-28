// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.Photo');

goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('pics3.parser.DataUrl');
goog.require('pics3.parser.Mpo');


/**
 * @param {!pics3.PhotoLoader} loader
 * @extends {goog.Disposable}
 * @constructor
 */
pics3.Photo = function(loader) {
  /** @type {number} */
  this.id_ = pics3.Photo.nextId_++;

  /** @type {!pics3.PhotoLoader} */
  this.loader_ = loader;
  this.registerDisposable(this.loader_);

  /** @type {pics3.Photo.State} */
  this.state_ = pics3.Photo.State.PENDING;
};
goog.inherits(pics3.Photo, goog.Disposable);

/**
 * @param {!ArrayBuffer} buffer
 * @param {string=} opt_type
 * @param {string=} opt_name
 * @constructor
 */
pics3.Photo.LoadResult = function(buffer, opt_type, opt_name) {
  /** @type {!ArrayBuffer} */
  this.buffer = buffer;

  /** @type {?string} */
  this.type = opt_type || null;

  /** @type {?string} */
  this.name = opt_name || null;
};

/** @enum {string} */
pics3.Photo.State = {
  PENDING: 'PENDING',
  LOADING: 'LOADING',
  ERROR: 'ERROR',
  LOADED: 'LOADED'
};

/** @enum {string} */
pics3.Photo.Type = {
  MPO: 'image/mpo',
  JPG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif'
};

/** @type {number} */
pics3.Photo.nextId_ = 1;

/** @type {ArrayBuffer} */
pics3.Photo.prototype.buffer_;

/** @type {?string} */
pics3.Photo.prototype.type_;

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
pics3.Photo.prototype.hasType = function() {
  return !!this.type_;
};

/** @return {?string} */
pics3.Photo.prototype.getType = function() {
  return this.type_;
};

/** @return {Error} */
pics3.Photo.prototype.getError = function() {
  return this.error_;
};

/** @return {number} */
pics3.Photo.prototype.getImageCount = function() {
  goog.asserts.assert(this.state_ == pics3.Photo.State.LOADED);
  if (this.type_ == pics3.Photo.Type.MPO) {
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
  goog.asserts.assertString(this.type_);
  if (this.type_ == pics3.Photo.Type.MPO) {
    return this.mpo_.getImages()[index].toDataUrl();
  }
  return pics3.parser.DataUrl.fromUint8Array(
      this.type_, new Uint8Array(this.buffer_));
};

/** @return {!goog.async.Deferred} */
pics3.Photo.prototype.loadAsync = function() {
  if (!this.loadDeferred_) {
    goog.asserts.assert(this.state_ == pics3.Photo.State.PENDING);
    this.state_ = pics3.Photo.State.LOADING;
    this.loadDeferred_ = this.loader_.loadAsync().addCallback(function(result) {
          this.buffer_ = result.buffer;
          this.type_ = result.type;
          this.name_ = result.name;
        }, this).
        addCallback(this.parseMpoAsync_, this).
        addCallback(function() {
          this.state_ = pics3.Photo.State.LOADED;
          delete this.loadDeferred_;
        }, this).addErrback(function(err) {
          this.error_ = err;
          this.state_ = pics3.Photo.State.ERROR;
          delete this.loadDeferred_;
        }, this);
  } else {
    goog.asserts.assert(this.state_ == pics3.Photo.State.LOADING);
  }
  return this.loadDeferred_.branch();
};

pics3.Photo.prototype.parseMpoAsync_ = function() {
  goog.asserts.assert(!this.mpo_);
  goog.asserts.assert(this.buffer_ instanceof ArrayBuffer);
  if (this.hasType() && this.getType() != pics3.Photo.Type.MPO) {
    return;
  }
  this.mpo_ = new pics3.parser.Mpo();
  var deferred = new goog.async.Deferred();
  if (this.mpo_.parse(this.buffer_)) {
    this.type_ = pics3.Photo.Type.MPO;
    deferred.callback(null);
  } else {
    deferred.errback(this.mpo_.getError());
  }
  return deferred;
};
