// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.GoogleDriveActionHandler');

goog.require('goog.debug.Logger');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('pics3.Photo');
goog.require('pics3.GoogleClient');
goog.require('pics3.GoogleDriveApi');
goog.require('pics3.MediaManager');
goog.require('pics3.Service');
goog.require('pics3.loader.GoogleDriveFile');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.GoogleDriveActionHandler = function(appContext) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!pics3.GoogleClient} */
  this.googleClient_ = pics3.GoogleClient.get(this.appContext_);

  /** @type {!pics3.GoogleDriveApi} */
  this.googleDriveApi_ = pics3.GoogleDriveApi.get(this.appContext_);
};
goog.inherits(pics3.GoogleDriveActionHandler, goog.events.EventTarget);

/** @enum {string} */
pics3.GoogleDriveActionHandler.EventType = {
  OPENED_FILES: goog.events.getUniqueId('openedfiles')
};

/** @type {goog.debug.Logger} */
pics3.GoogleDriveActionHandler.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.GoogleDriveActionHandler');

/** @type {Object} */
pics3.GoogleDriveActionHandler.prototype.state_;

/**
 * @param {goog.Uri} uri
 * @return {?goog.Uri} new uri stripped of google drive params.
 */
pics3.GoogleDriveActionHandler.prototype.processUri = function(uri) {
  var stateValueJson = uri.getParameterValue('state');
  if (stateValueJson) {
    try {
      var state = goog.json.parse(stateValueJson);
    } catch (e) {
      this.logger_.warning('Invalid Google Drive state string ' +
          stateValueJson);
      return null;
    }
    this.state_ = state;
    var newUri = uri.clone();
    newUri.removeParameter('code');
    newUri.removeParameter('state');
    // TODO: consider stripping/reformatting url
    return null;
  }
  return null;
};

pics3.GoogleDriveActionHandler.prototype.handleActions = function() {
  if (this.state_ && this.state_['action'] == 'open') {
    var fileIds = this.state_['ids'] || [];
    this.logger_.info('Open ' + fileIds.length + ' files from Google Drive');
    this.googleClient_.setAuthRequired(true);
    this.googleClient_.getAuthDeferred().addCallback(function() {
      this.googleDriveApi_.loadAsync().addCallback(function() {
        var loadFiles = this.googleDriveApi_.newLoadFiles(fileIds).
            setLoadMetadata(true);
        loadFiles.load().addCallback(this.openFilesWithMetadata_, this);
      }, this);
    }, this);
  }
};

/** @param {!pics3.GoogleDriveApi.LoadFiles} loadFiles */
pics3.GoogleDriveActionHandler.prototype.openFilesWithMetadata_ = function(
    loadFiles) {
  var photos = [];
  goog.array.forEach(loadFiles.getArray(), function(loadFile) {
    var loader = pics3.loader.GoogleDriveFile.fromMetadata(
        this.appContext_, loadFile.getMetadata());
    if (pics3.Photo.isSupportedMimeType(loader.getMimeType())) {
      photos.push(new pics3.Photo(loader));
    } else {
      this.logger_.warning('Unsupported MimeType opened: ' +
          loader.getMimeType());
    }
  }, this);

  var mediaManager = pics3.MediaManager.get(this.appContext_);
  var album = mediaManager.getSourceAlbum(
      pics3.MediaManager.Source.GOOGLE_DRIVE);
  album.addAll(photos);
  this.dispatchEvent(pics3.GoogleDriveActionHandler.EventType.OPENED_FILES);
};
