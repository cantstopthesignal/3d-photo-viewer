// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.history.GoogleDriveHandler');

goog.require('goog.debug.Logger');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('pics3.GoogleClient');
goog.require('pics3.GoogleDriveApi');
goog.require('pics3.MediaManager');
goog.require('pics3.Photo');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.Service');
goog.require('pics3.history.GoogleDriveFilesToken');
goog.require('pics3.history.Handler');
goog.require('pics3.history.Token');
goog.require('pics3.loader.GoogleDriveFile');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {pics3.history.Handler}
 */
pics3.history.GoogleDriveHandler = function(appContext) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!pics3.GoogleClient} */
  this.googleClient_ = pics3.GoogleClient.get(this.appContext_);

  /** @type {!pics3.GoogleDriveApi} */
  this.googleDriveApi_ = pics3.GoogleDriveApi.get(this.appContext_);
};
goog.inherits(pics3.history.GoogleDriveHandler, pics3.history.Handler);

/** @type {string} */
pics3.history.GoogleDriveHandler.STATE_PARAM = 'state';

/** @type {goog.debug.Logger} */
pics3.history.GoogleDriveHandler.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.history.GoogleDriveHandler');

/** @override */
pics3.history.GoogleDriveHandler.prototype.processUri = function(uri) {
  if (uri.getParameterValue(pics3.history.GoogleDriveHandler.STATE_PARAM)) {
    return this.processStateUri_(uri);
  } else if (uri.getParameterValue(pics3.history.GoogleDriveFilesToken.PARAM)) {
    return pics3.history.GoogleDriveFilesToken.fromUri(uri);
  }
  return null;
};

/**
 * @param {!goog.Uri} uri
 * @return {pics3.history.Token}
 */
pics3.history.GoogleDriveHandler.prototype.processStateUri_ = function(uri) {
  var stateValueJson = goog.asserts.assertString(uri.getParameterValue(
      pics3.history.GoogleDriveHandler.STATE_PARAM));
  try {
    var state = goog.json.parse(stateValueJson);
  } catch (e) {
    this.logger_.warning('Invalid state string: ' + stateValueJson);
    return null;
  }

  var fileIdStrs = state['ids'] || [];
  if (state['action'] == 'open' && fileIdStrs.length) {
    var fileIds = goog.array.map(fileIdStrs, function(fileId) {
      return new pics3.PhotoId(fileId);
    });
    return new pics3.history.GoogleDriveFilesToken(fileIds);
  }
  return null;
};

/** @override */
pics3.history.GoogleDriveHandler.prototype.handleToken = function(token) {
  goog.asserts.assert(token instanceof pics3.history.GoogleDriveFilesToken);
  var fileIds = token.getFileIds();
  var currentFileId = token.getCurrentFileId();
  this.logger_.info('Open ' + fileIds.length + ' files from Google Drive');
  this.googleClient_.addRequiredScopes(
      pics3.GoogleClient.GOOGLE_DRIVE_SCOPES);
  this.googleClient_.getAuthDeferred().addCallback(function() {
    this.googleDriveApi_.loadAsync().addCallback(function() {
      var fileIdStrs = goog.array.map(fileIds, function(fileId) {
        return fileId.id;
      });
      var loadFiles = this.googleDriveApi_.newLoadFiles(fileIdStrs).
          setLoadMetadata(true);
      loadFiles.load().addCallback(goog.partial(
          this.openFilesWithMetadata_, currentFileId), this);
    }, this);
  }, this);
};

/**
 * @param {?pics3.PhotoId} currentFileId
 * @param {!pics3.GoogleDriveApi.LoadFiles} loadFiles
 */
pics3.history.GoogleDriveHandler.prototype.openFilesWithMetadata_ = function(
    currentFileId, loadFiles) {
  var photos = [];
  goog.array.forEach(loadFiles.getArray(), function(loadFile) {
    var loader = pics3.loader.GoogleDriveFile.fromMetadata(
        this.appContext_, loadFile.getMetadata());
    if (pics3.photoMimeType.isSupported(loader.getMimeType())) {
      photos.push(new pics3.Photo(this.appContext_, loader.getPhotoId(),
          loader));
    } else {
      this.logger_.warning('Unsupported MimeType opened: ' +
          loader.getMimeType());
    }
  }, this);

  var mediaManager = pics3.MediaManager.get(this.appContext_);
  var album = mediaManager.getSourceAlbum(
      pics3.MediaManager.Source.GOOGLE_DRIVE);
  album.addAll(photos);
  if (currentFileId) {
    mediaManager.openPhoto(album, currentFileId);
  } else {
    mediaManager.openAlbum(album);
  }
};
