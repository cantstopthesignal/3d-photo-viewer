// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.GoogleDriveActionHandler');

goog.require('goog.debug.Logger');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('pics3.Photo');
goog.require('pics3.GoogleDriveApi');
goog.require('pics3.MediaManager');
goog.require('pics3.Service');
goog.require('pics3.loader.GoogleDrivePhoto');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.GoogleDriveActionHandler = function(appContext) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

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
    this.googleDriveApi_.loadAsync().addCallback(function() {
      this.googleDriveApi_.loadFileMetadatas(fileIds).addCallback(
          this.openFilesWithMetadata_, this);
    }, this);
  }
};

/** @param {!Array.<!Object>} fileMetadatas */
pics3.GoogleDriveActionHandler.prototype.openFilesWithMetadata_ = function(
    fileMetadatas) {
  var photos = [];
  goog.array.forEach(fileMetadatas, function(fileMetadata) {
    var id = goog.asserts.assertString(fileMetadata['id']);
    var mimeType = goog.asserts.assertString(fileMetadata['mimeType']);
    var name = goog.asserts.assertString(fileMetadata['title']);
    if (pics3.Photo.isSupportedMimeType(mimeType)) {
      var loader = new pics3.loader.GoogleDrivePhoto(this.appContext_, id,
          mimeType, name);
      photos.push(new pics3.Photo(loader));
    } else {
      this.logger_.warning('Unsupported MimeType opened: ' + mimeType);
    }
  }, this);

  var mediaManager = pics3.MediaManager.get(this.appContext_);
  var photoList = mediaManager.getPhotoList(
      pics3.MediaManager.Source.GOOGLE_DRIVE);
  photoList.addAll(photos);
  this.dispatchEvent(pics3.GoogleDriveActionHandler.EventType.OPENED_FILES);
};
