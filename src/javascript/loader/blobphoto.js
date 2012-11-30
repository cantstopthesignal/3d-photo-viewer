// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.BlobPhoto');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('pics3.loader.Photo');


/**
 * @param {!Blob} blob
 * @extends {pics3.loader.Photo}
 * @constructor
 */
pics3.loader.BlobPhoto = function(blob) {
  goog.base(this);

  /** @type {!Blob} */
  this.blob_ = blob;

  /** @type {goog.events.EventHandler} */
  this.eventHandler = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler);
};
goog.inherits(pics3.loader.BlobPhoto, pics3.loader.Photo);

/** @override */
pics3.loader.BlobPhoto.prototype.loadAsync = function() {
  var fileReader = new FileReader();
  var deferred = new goog.async.Deferred();

  this.eventHandler.listen(fileReader, 'load', function(e) {
    var photoData = new pics3.Photo.LoadResult(fileReader.result,
        this.blob_.type, this.blob_.name);
    deferred.callback(photoData);
  });
  this.eventHandler.listen(fileReader, 'error', function(e) {
    deferred.errback(fileReader.error);
  });
  fileReader.readAsArrayBuffer(this.blob_);
  return deferred;
};
