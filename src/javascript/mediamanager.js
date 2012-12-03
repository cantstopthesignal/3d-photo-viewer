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
  ALBUMS_ADDED: goog.events.getUniqueId('albumsadded')
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

/** @param {!Array.<!pics3.Album>} albums */
pics3.MediaManager.prototype.addAllAlbums = function(albums) {
  goog.array.extend(this.albums_, albums);
  if (albums.length) {
    this.dispatchEvent(new pics3.MediaManager.AlbumsAddedEvent(albums));
  }
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
