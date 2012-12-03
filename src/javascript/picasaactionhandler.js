// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.PicasaActionHandler');

goog.require('goog.Uri');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('pics3.GoogleClient');
goog.require('pics3.Photo');
goog.require('pics3.PicasaApi');
goog.require('pics3.MediaManager');
goog.require('pics3.Service');
goog.require('pics3.loader.PicasaAlbum');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.PicasaActionHandler = function(appContext) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!pics3.PicasaApi} */
  this.picasaApi_ = pics3.PicasaApi.get(this.appContext_);

  /** @type {!pics3.MediaManager} */
  this.mediaManager_ = pics3.MediaManager.get(this.appContext_);

  /** @type {!pics3.GoogleClient} */
  this.googleClient_ = pics3.GoogleClient.get(this.appContext_);

  /** @type {!Array.<!pics3.PicasaAlbumId>} */
  this.albumIds_ = [];
};
goog.inherits(pics3.PicasaActionHandler, goog.events.EventTarget);

/** @enum {string} */
pics3.PicasaActionHandler.EventType = {
  OPENED_ALBUMS: goog.events.getUniqueId('openedalbums')
};

/** @type {goog.debug.Logger} */
pics3.PicasaActionHandler.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.PicasaActionHandler');

/**
 * @param {goog.Uri} uri
 * @return {?goog.Uri} new uri stripped of google drive params.
 */
pics3.PicasaActionHandler.prototype.processUri = function(uri) {
  var albumUrls = uri.getParameterValues('album');
  var unprocessedAlbumUrls = [];
  goog.array.forEach(albumUrls, function(albumUrl) {
    var albumUri = new goog.Uri(albumUrl);
    var albumId = pics3.PicasaAlbumId.fromUrl(albumUrl);
    if (!albumId) {
      this.logger_.warning('Invalid album url ' + albumUrl);
      unprocessedAlbumUrls.push(albumId);
      return;
    }
    this.albumIds_.push(albumId);
  }, this);
  if (this.albumIds_.length) {
    var newUri = uri.clone();
    newUri.setParameterValues('album', unprocessedAlbumUrls);
    // TODO: consider stripping/reformatting url
    return null;
  }
  return null;
};

pics3.PicasaActionHandler.prototype.handleActions = function() {
  if (this.albumIds_.length) {
    this.logger_.info('Open ' + this.albumIds_.length + ' albums from Picasa');
    this.googleClient_.setAuthRequired(true);
    this.googleClient_.getAuthDeferred().addCallback(function() {
      this.picasaApi_.loadAsync().addCallback(function() {
        var albums = goog.array.map(this.albumIds_, function(albumId) {
          var loader = new pics3.loader.PicasaAlbum(this.appContext_, albumId);
          return new pics3.Album(loader);
        }, this);
        this.mediaManager_.addAllAlbums(albums);
      }, this);
    }, this);
  }
};
