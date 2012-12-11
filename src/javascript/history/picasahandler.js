// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.history.PicasaHandler');

goog.require('goog.Uri');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('pics3.GoogleClient');
goog.require('pics3.Photo');
goog.require('pics3.PicasaApi');
goog.require('pics3.MediaManager');
goog.require('pics3.Service');
goog.require('pics3.history.Handler');
goog.require('pics3.history.PicasaAlbumToken');
goog.require('pics3.loader.PicasaAlbum');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {pics3.history.Handler}
 */
pics3.history.PicasaHandler = function(appContext) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!pics3.PicasaApi} */
  this.picasaApi_ = pics3.PicasaApi.get(this.appContext_);

  /** @type {!pics3.MediaManager} */
  this.mediaManager_ = pics3.MediaManager.get(this.appContext_);

  /** @type {!pics3.GoogleClient} */
  this.googleClient_ = pics3.GoogleClient.get(this.appContext_);
};
goog.inherits(pics3.history.PicasaHandler, pics3.history.Handler);

/** @type {string} */
pics3.history.PicasaHandler.ALBUM_PARAM = 'album';

/** @type {goog.debug.Logger} */
pics3.history.PicasaHandler.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.history.PicasaHandler');

/** @override */
pics3.history.PicasaHandler.prototype.processUri = function(uri) {
  if (uri.getParameterValue(pics3.history.PicasaHandler.ALBUM_PARAM)) {
    return this.processAlbumUri_(uri);
  } else if (uri.getParameterValue(pics3.history.PicasaAlbumToken.PARAM)) {
    return pics3.history.PicasaAlbumToken.fromUri(uri);
  }
  return null;
};

/**
 * @param {!goog.Uri} uri
 * @return {pics3.history.Token}
 */
pics3.history.PicasaHandler.prototype.processAlbumUri_ = function(uri) {
  var albumUrl = goog.asserts.assertString(uri.getParameterValue('album'));
  var albumUri = new goog.Uri(albumUrl);
  var albumId = pics3.PicasaAlbumId.fromUrl(albumUrl);
  if (!albumId) {
    this.logger_.warning('Invalid album url ' + albumUrl);
    return null;
  }
  return new pics3.history.PicasaAlbumToken(albumId);
};

/** @override */
pics3.history.PicasaHandler.prototype.handleToken = function(token) {
  goog.asserts.assert(token instanceof pics3.history.PicasaAlbumToken);
  this.logger_.info('Open album from Picasa');
  this.googleClient_.addRequiredScopes(pics3.GoogleClient.PICASA_SCOPES);
  this.googleClient_.getAuthDeferred().addCallback(function() {
    this.picasaApi_.loadAsync().addCallback(function() {
      var albumId = token.getAlbumId();
      var photoId = token.getPhotoId();
      var album = this.mediaManager_.getAlbumById(albumId);
      if (!album) {
        var loader = new pics3.loader.PicasaAlbum(this.appContext_, albumId);
        album = new pics3.Album(albumId, loader);
        this.mediaManager_.addAllAlbums([album]);
      }
      if (photoId) {
        this.mediaManager_.openPhoto(album, photoId);
      } else {
        this.mediaManager_.openAlbum(album);
      }
    }, this);
  }, this);
};
