// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.GoogleDrivePhoto');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.string');
goog.require('pics3.GoogleDriveApi');
goog.require('pics3.loader.Photo');
goog.require('pics3.Photo');


/**
 * @param {!pics3.AppContext} appContext
 * @param {string} id
 * @param {string} mimeType
 * @param {string} name
 * @extends {pics3.loader.Photo}
 * @constructor
 */
pics3.loader.GoogleDrivePhoto = function(appContext, id, mimeType, name) {
  goog.base(this);

  /** @type {!pics3.GoogleDriveApi} */
  this.driveApi_ = pics3.GoogleDriveApi.get(appContext);

  /** @type {string} */
  this.id_ = id;

  /** @type {string} */
  this.mimeType_ = mimeType;

  /** @type {string} */
  this.name_ = name;

  if (goog.string.endsWith(this.name_.toLowerCase(), '.mpo')) {
    this.mimeType_ = '';
  }

  /** @type {goog.events.EventHandler} */
  this.eventHandler = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler);
};
goog.inherits(pics3.loader.GoogleDrivePhoto, pics3.loader.Photo);

/** @override */
pics3.loader.GoogleDrivePhoto.prototype.loadAsync = function() {
  return this.driveApi_.loadFile(this.id_).addCallback(
      /** @param {pics3.GoogleDriveApi.LoadFileResult} result */
      function(result) {
        return new pics3.Photo.LoadResult(
            result.buffer, this.mimeType_, this.name_);
      }, this);
};
