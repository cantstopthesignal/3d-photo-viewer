// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.PicasaPhoto');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.string');
goog.require('pics3.Photo');
goog.require('pics3.PhotoId');
goog.require('pics3.PicasaApi');
goog.require('pics3.loader.File');
goog.require('pics3.loader.FileResult');


/**
 * @param {!pics3.AppContext} appContext
 * @param {string} id
 * @param {string} mimeType
 * @param {string} name
 * @extends {pics3.loader.File}
 * @constructor
 */
pics3.loader.PicasaPhoto = function(appContext, id, mimeType, name) {
  goog.base(this);

  /** @type {!pics3.PicasaApi} */
  this.picasaApi_ = pics3.PicasaApi.get(appContext);

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
goog.inherits(pics3.loader.PicasaPhoto, pics3.loader.File);

/**
 * @param {!pics3.AppContext} appContext
 * @param {Object} metadata
 */
pics3.loader.PicasaPhoto.fromMetadata = function(appContext, metadata) {
  var id = goog.asserts.assertString(metadata['gphoto$id']['$t']);
  var content = goog.asserts.assertObject(metadata['content']);
  var mimeType = goog.asserts.assertString(content['type']);
  var name = goog.asserts.assertString(metadata['title']['$t']);
  var loader = new pics3.loader.PicasaPhoto(appContext, id, mimeType, name);
  loader.setDownloadUrl_(pics3.loader.PicasaPhoto.makeDownloadUrl_(
      content['src']));
  return loader;
};

/**
 * @param {string} contentUrl
 * @return {string}
 */
pics3.loader.PicasaPhoto.makeDownloadUrl_ = function(contentUrl) {
  var lastSlash = contentUrl.lastIndexOf('/');
  return contentUrl.substr(0, lastSlash) + '/d' + contentUrl.substr(lastSlash);
};

/** @type {string} */
pics3.loader.PicasaPhoto.prototype.downloadUrl_;

/** @param {string} downloadUrl */
pics3.loader.PicasaPhoto.prototype.setDownloadUrl_ = function(downloadUrl) {
  this.downloadUrl_ = downloadUrl;
};

/** @return {pics3.PhotoId} */
pics3.loader.PicasaPhoto.prototype.getPhotoId = function() {
  return new pics3.PhotoId(this.id_);
};

/** @override */
pics3.loader.PicasaPhoto.prototype.loadAsync = function() {
  var loadPhoto = this.picasaApi_.newLoadPhoto(this.downloadUrl_);
  this.eventHandler.listen(loadPhoto, pics3.loader.EventType.PROGRESS,
      this.handleProgress_);
  return loadPhoto.load().addCallback(function(loadPhoto) {
      return new pics3.loader.FileResult(
          loadPhoto.getDataBuffer(), this.mimeType_, this.name_);
  }, this);
};

/** @param {pics3.loader.ProgressEvent} e */
pics3.loader.PicasaPhoto.prototype.handleProgress_ = function(e) {
  this.dispatchEvent(e);
};
