// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.GoogleDriveFile');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.string');
goog.require('pics3.GoogleDriveApi');
goog.require('pics3.loader.File');
goog.require('pics3.loader.FileResult');
goog.require('pics3.loader.ProgressEvent');


/**
 * @param {!pics3.AppContext} appContext
 * @param {string} id
 * @param {string} mimeType
 * @param {string} name
 * @extends {pics3.loader.File}
 * @constructor
 */
pics3.loader.GoogleDriveFile = function(appContext, id, mimeType, name) {
  goog.base(this);

  /** @type {!pics3.GoogleDriveApi} */
  this.driveApi_ = pics3.GoogleDriveApi.get(appContext);

  /** @type {string} */
  this.id_ = id;

  /** @type {string} */
  this.mimeType_ = mimeType;

  /** @type {string} */
  this.name_ = name;

  /** @type {goog.events.EventHandler} */
  this.eventHandler = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler);
};
goog.inherits(pics3.loader.GoogleDriveFile, pics3.loader.File);

/**
 * @param {!pics3.AppContext} appContext
 * @param {Object} metadata
 */
pics3.loader.GoogleDriveFile.fromMetadata = function(appContext, metadata) {
  var id = goog.asserts.assertString(metadata['id']);
  var mimeType = goog.asserts.assertString(metadata['mimeType']);
  var name = goog.asserts.assertString(metadata['title']);
  var loader = new pics3.loader.GoogleDriveFile(appContext, id, mimeType, name);
  loader.setDownloadUrl_(metadata['downloadUrl']);
  return loader;
};

/** @type {string} */
pics3.loader.GoogleDriveFile.prototype.downloadUrl_;

/** @param {string} downloadUrl */
pics3.loader.GoogleDriveFile.prototype.setDownloadUrl_ = function(downloadUrl) {
  this.downloadUrl_ = downloadUrl;
};

/** @return {string} */
pics3.loader.GoogleDriveFile.prototype.getMimeType = function() {
  return this.mimeType_;
};

/** @override */
pics3.loader.GoogleDriveFile.prototype.loadAsync = function() {
  var loadFile = this.driveApi_.newLoadFile(this.id_).
      setDownloadUrl(this.downloadUrl_).
      setLoadData(true);
  this.eventHandler.listen(loadFile, pics3.loader.EventType.PROGRESS,
      this.handleProgress_);
  return loadFile.load().addCallback(function(loadFile) {
    return new pics3.loader.FileResult(
        loadFile.getDataBuffer(), this.mimeType_, this.name_);
  }, this);
};

/** @param {pics3.loader.ProgressEvent} e */
pics3.loader.GoogleDriveFile.prototype.handleProgress_ = function(e) {
  this.dispatchEvent(e);
};
