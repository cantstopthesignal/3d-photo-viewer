// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.GoogleDriveFolder');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.string');
goog.require('pics3.GoogleDriveApi');
goog.require('pics3.Photo');
goog.require('pics3.loader.Album');
goog.require('pics3.loader.AlbumResult');
goog.require('pics3.loader.PicasaPhoto');


/**
 * @param {!pics3.AppContext} appContext
 * @param {!pics3.GoogleDriveFolderAlbumId} id
 * @param {string=} opt_name
 * @extends {pics3.loader.Album}
 * @constructor
 */
pics3.loader.GoogleDriveFolder = function(appContext, id, opt_name) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!pics3.GoogleDriveApi} */
  this.googleDriveApi_ = pics3.GoogleDriveApi.get(this.appContext_);

  /** @type {!pics3.GoogleDriveFolderAlbumId} */
  this.id_ = id;

  /** @type {?string} */
  this.name_ = opt_name || null;

  /** @type {goog.events.EventHandler} */
  this.eventHandler = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler);
};
goog.inherits(pics3.loader.GoogleDriveFolder, pics3.loader.Album);

/** @type {goog.debug.Logger} */
pics3.loader.GoogleDriveFolder.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.loader.GoogleDriveFolder');

/** @override */
pics3.loader.GoogleDriveFolder.prototype.loadAsync = function() {
  return this.googleDriveApi_.loadFolder(this.id_.id).addCallback(function(resp) {
    var fileIdStrs = goog.array.map(resp['items'], function(item) {
      return item['id'];
    });
    fileIdStrs.push(this.id_.id);
    var loadFiles = this.googleDriveApi_.newLoadFiles(fileIdStrs).
        setLoadMetadata(true);
    return loadFiles.load().addCallback(function() {
      var albumName = 'Unknown Folder';
      var photos = [];
      var loadFilesArray = loadFiles.getArray();
      loadFilesArray.sort(function(a, b) {
        var aTitle = a.getMetadata()['title'];
        var bTitle = b.getMetadata()['title'];
        if (aTitle > bTitle) {
          return 1;
        } else if (aTitle < bTitle) {
          return -1;
        }
        return 0;
      });
      goog.array.forEach(loadFilesArray, function(loadFile) {
        var metadata = loadFile.getMetadata();
        if (metadata['id'] == this.id_.id) {
          albumName = metadata['title'];
          return;
        }
        var loader = pics3.loader.GoogleDriveFile.fromMetadata(
            this.appContext_, metadata);
        if (pics3.photoMimeType.isSupported(loader.getMimeType())) {
          var photo = new pics3.Photo(this.appContext_, loader.getPhotoId(),
              loader);
          photo.addThumbnails(pics3.loader.GoogleDriveFile.
              getThumbnailsFromMetadata(metadata));
          photos.push(photo);
        } else {
          this.logger_.warning('Unsupported MimeType opened: ' +
              loader.getMimeType());
        }
      }, this);
      return new pics3.loader.AlbumResult(photos, albumName);
    }, this);
  }, this);
};
