// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.MediaManager');

goog.require('goog.asserts');
goog.require('goog.debug.Logger');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('pics3.Album');
goog.require('pics3.Service');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 * @implements {pics3.Service}
 */
pics3.MediaManager = function() {
  goog.base(this);

  /** @type {!Object.<!pics3.MediaManager.Source,!pics3.Album>} */
  this.sourceAlbumMap_ = {};

  /** @type {!Array.<!pics3.Album>} */
  this.albums_ = [];
};
goog.inherits(pics3.MediaManager, goog.events.EventTarget);

pics3.MediaManager.SERVICE_ID = 's' + goog.getUid(pics3.MediaManager);

/** @enum {string} */
pics3.MediaManager.Source = {
  UPLOAD: 'UPLOAD',
  GOOGLE_DRIVE: 'GOOGLE_DRIVE',
  PICASA: 'PICASA'
};

/** @enum {string} */
pics3.MediaManager.EventType = {
  ALBUMS_ADDED: goog.events.getUniqueId('albumsadded'),
  ALBUM_OPENED: goog.events.getUniqueId('albumopened'),
  PHOTO_OPENED: goog.events.getUniqueId('photoopened')
};

/**
 * @param {!pics3.AppContext} appContext
 * @return {!pics3.MediaManager}
 */
pics3.MediaManager.get = function(appContext) {
  return /** @type {!pics3.MediaManager} */ (goog.asserts.assertObject(
      appContext.get(pics3.MediaManager.SERVICE_ID)));
};

/** @type {goog.debug.Logger} */
pics3.MediaManager.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.MediaManager');

/** @param {!pics3.AppContext} appContext */
pics3.MediaManager.prototype.register = function(appContext) {
  appContext.register(pics3.MediaManager.SERVICE_ID, this);
};

/**
 * @param {pics3.MediaManager.Source} source
 * @return {!pics3.Album}
 */
pics3.MediaManager.prototype.getSourceAlbum = function(source) {
  var album = this.sourceAlbumMap_[source];
  if (!album) {
    album = new pics3.Album();
    this.sourceAlbumMap_[source] = album;
    this.albums_.push(album);
  }
  return album;
};

/**
 * @param {?pics3.AlbumId} albumId
 * @return {?pics3.Album}
 */
pics3.MediaManager.prototype.getAlbumById = function(albumId) {
  if (!albumId) {
    return null;
  }
  return /** @type {?pics3.Album} */ (goog.array.find(this.albums_,
      function(album) {
    return albumId.equals(album.getAlbumId());
  }));
};

/** @param {!Array.<!pics3.Album>} albums */
pics3.MediaManager.prototype.addAllAlbums = function(albums) {
  var newAlbums = [];
  goog.array.forEach(albums, function(album) {
    var existingAlbum = this.getAlbumById(album.getAlbumId());
    if (!existingAlbum) {
      newAlbums.push(album);
    }
  }, this);
  goog.array.extend(this.albums_, newAlbums);
  if (newAlbums) {
    this.dispatchEvent(new pics3.MediaManager.AlbumsAddedEvent(albums));
  }
};

/** @param {!pics3.Album} album */
pics3.MediaManager.prototype.openAlbum = function(album) {
  goog.asserts.assert(goog.array.contains(this.albums_, album));
  this.dispatchEvent(new pics3.MediaManager.AlbumOpenedEvent(album));
};

/**
 * @param {!pics3.Album} album
 * @param {!pics3.PhotoId} photoId
 */
pics3.MediaManager.prototype.openPhoto = function(album, photoId) {
  goog.asserts.assert(goog.array.contains(this.albums_, album));
  this.dispatchEvent(new pics3.MediaManager.PhotoOpenedEvent(album, photoId));
};

/**
 * @param {!pics3.Album} album
 * @param {pics3.PhotoId=} opt_photoId
 * @return {pics3.history.Token}
 */
pics3.MediaManager.prototype.getHistoryTokenForAlbum = function(album,
    opt_photoId) {
  var albumId = album.getAlbumId();
  if (albumId) {
    goog.asserts.assert(albumId instanceof pics3.PicasaAlbumId);
    return new pics3.history.PicasaAlbumToken(
        /** @type {!pics3.PicasaAlbumId} */ (albumId), opt_photoId);
  }
  if (album == this.getSourceAlbum(pics3.MediaManager.Source.GOOGLE_DRIVE)) {
    return new pics3.history.GoogleDriveFilesToken(album.getPhotoIds(),
        opt_photoId);
  }
  return null;
};

/** @override */
pics3.MediaManager.prototype.disposeInternal = function() {
  goog.disposeAll(this.albums_);
  this.sourceAlbumMap_ = {};
  this.albums_ = [];
  goog.base(this, 'disposeInternal');
};

/**
 * @param {!Array.<!pics3.Album>} albums
 * @constructor
 * @extends {goog.events.Event}
 */
pics3.MediaManager.AlbumsAddedEvent = function(albums) {
  goog.base(this, pics3.MediaManager.EventType.ALBUMS_ADDED);

  /** @type {!Array.<!pics3.Album>} */
  this.albums = albums;
};
goog.inherits(pics3.MediaManager.AlbumsAddedEvent, goog.events.Event);

/**
 * @param {!pics3.Album} album
 * @constructor
 * @extends {goog.events.Event}
 */
pics3.MediaManager.AlbumOpenedEvent = function(album) {
  goog.base(this, pics3.MediaManager.EventType.ALBUM_OPENED);

  /** @type {!pics3.Album} */
  this.album = album;
};
goog.inherits(pics3.MediaManager.AlbumOpenedEvent, goog.events.Event);

/**
 * @param {!pics3.Album} album
 * @param {!pics3.PhotoId} photoId
 * @constructor
 * @extends {goog.events.Event}
 */
pics3.MediaManager.PhotoOpenedEvent = function(album, photoId) {
  goog.base(this, pics3.MediaManager.EventType.PHOTO_OPENED);

  /** @type {!pics3.Album} */
  this.album = album;

  /** @type {!pics3.PhotoId} */
  this.photoId = photoId;
};
goog.inherits(pics3.MediaManager.PhotoOpenedEvent, goog.events.Event);
