// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.Album');

goog.require('goog.asserts');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventTarget');


/**
 * @param {pics3.AlbumId=} opt_albumId
 * @param {pics3.loader.Album=} opt_loader
 * @extends {goog.events.EventTarget}
 * @constructor
 */
pics3.Album = function(opt_albumId, opt_loader) {
  goog.base(this);

  /** @type {?pics3.AlbumId} */
  this.albumId_ = opt_albumId || null;

  /** @type {?pics3.loader.Album} */
  this.loader_ = opt_loader || null;
  if (this.loader_) {
    this.registerDisposable(this.loader_);
  }

  /** @type {pics3.Album.State} */
  this.state_ = this.loader_ ? pics3.Album.State.PENDING :
      pics3.Album.State.LOADED;

  /** @type {!Array.<!pics3.Photo>} */
  this.photos = [];

  /** @type {!goog.async.Deferred} */
  this.loadDeferred_ = new goog.async.Deferred();
};
goog.inherits(pics3.Album, goog.events.EventTarget);

/** @enum {string} */
pics3.Album.State = {
  PENDING: 'PENDING',
  LOADING: 'LOADING',
  ERROR: 'ERROR',
  LOADED: 'LOADED'
};

/** @enum {string} */
pics3.Album.EventType = {
  CHANGED: goog.events.getUniqueId('changed'),
  STATE_CHANGED: goog.events.getUniqueId('statechanged')
};

/** @type {goog.debug.Logger} */
pics3.Album.prototype.logger_ = goog.debug.Logger.getLogger('pics3.Album');

/** @type {string} */
pics3.Album.prototype.name_;

/** @type {Error} */
pics3.Album.prototype.error_;

/** @return {!pics3.Album.State} */
pics3.Album.prototype.getState = function() {
  return this.state_;
};

/** @return {string} */
pics3.Album.prototype.getName = function() {
  return this.name_;
};

/** @return {?pics3.AlbumId} */
pics3.Album.prototype.getAlbumId = function() {
  return this.albumId_;
};

/** @return {!Array.<!pics3.PhotoId>} */
pics3.Album.prototype.getPhotoIds = function() {
  return goog.array.map(this.photos, function(photo) {
    return photo.getId();
  });
};

/** @return {!goog.async.Deferred} */
pics3.Album.prototype.getLoadDeferred = function() {
  return this.loadDeferred_;
};

/**
 * @param {...pics3.Album.State} var_args
 * @return {boolean}
 */
pics3.Album.prototype.stateIn = function(var_args) {
  return goog.array.some(arguments, function(state) {
    return this.state_ == state;
  }, this);
};

/** @return {Error} */
pics3.Album.prototype.getError = function() {
  return this.error_;
};

/** @param {!pics3.Photo} photo */
pics3.Album.prototype.add = function(photo) {
  var id = photo.getId();
  if (id && this.getPhotoById(id)) {
    return;
  }
  if (this.getPhotoByUniqueId(photo.getUniqueId())) {
    return;
  }
  this.photos.push(photo);
  this.dispatchEvent(pics3.Album.EventType.CHANGED);
};

/** @param {!Array.<!pics3.Photo>} photos */
pics3.Album.prototype.addAll = function(photos) {
  var newPhotos = [];
  goog.array.forEach(photos, function(photo) {
    var id = photo.getId();
    if (id && this.getPhotoById(id)) {
      return;
    }
    if (this.getPhotoByUniqueId(photo.getUniqueId())) {
      return;
    }
    newPhotos.push(photo);
  }, this);
  if (!newPhotos) {
    return;
  }
  goog.array.extend(this.photos, newPhotos);
  this.dispatchEvent(pics3.Album.EventType.CHANGED);
};

/**
 * @param {!pics3.PhotoId} id
 * @return {?pics3.Photo}
 */
pics3.Album.prototype.getPhotoById = function(id) {
  var index = this.getPhotoIndexById(id);
  if (index >= 0) {
    return this.photos[index];
  }
  return null;
};

/**
 * @param {number} uniqueId
 * @return {?pics3.Photo}
 */
pics3.Album.prototype.getPhotoByUniqueId = function(uniqueId) {
  var index = this.getPhotoIndexByUniqueId(uniqueId);
  if (index >= 0) {
    return this.photos[index];
  }
  return null;
};

//TODO: Make fast
/**
 * @param {!pics3.PhotoId} id
 * @return {number}
 */
pics3.Album.prototype.getPhotoIndexById = function(id) {
  return goog.array.findIndex(this.photos,
      function(photo) {
    return photo.getId() && photo.getId().equals(id);
  });
};

//TODO: Make fast
/**
 * @param {number} uniqueId
 * @return {number}
 */
pics3.Album.prototype.getPhotoIndexByUniqueId = function(uniqueId) {
  return goog.array.findIndex(this.photos,
      function(photo) {
    return photo.getUniqueId() == uniqueId;
  });
};

/** @return {number} */
pics3.Album.prototype.getLength = function() {
  return this.photos.length;
};

/**
 * @param {number} index
 * @return {!pics3.Photo}
 */
pics3.Album.prototype.get = function(index) {
  goog.asserts.assert(index < this.photos.length && index >= 0);
  return this.photos[index];
};

/** @return {!goog.async.Deferred} */
pics3.Album.prototype.loadAsync = function() {
  if (!this.loader_ && !this.loadDeferred_.hasFired()) {
    this.loadDeferred_.callback(null);
  }
  if (this.state_ == pics3.Album.State.PENDING) {
    this.setState_(pics3.Album.State.LOADING);
    this.loader_.loadAsync().addCallback(
        /** @param {!pics3.loader.AlbumResult} result */
        function(result) {
          this.addAll(result.photos);
          this.name_ = result.name;
        }, this).
        addCallback(function() {
          this.setState_(pics3.Photo.State.LOADED);
          this.loadDeferred_.callback(null);
        }, this).addErrback(function(err) {
          this.error_ = err;
          this.setState_(pics3.Photo.State.ERROR);
          this.loadDeferred_.errback(err);
        }, this);
  }
  return this.loadDeferred_.branch();
};

/** @param {pics3.Album.State} state */
pics3.Album.prototype.setState_ = function(state) {
  this.state_ = state;
  this.dispatchEvent(pics3.Album.EventType.STATE_CHANGED);
};

/** @override */
pics3.Album.prototype.disposeInternal = function() {
  goog.disposeAll(this.photos);
  this.photos = [];
  goog.base(this, 'disposeInternal');
};
