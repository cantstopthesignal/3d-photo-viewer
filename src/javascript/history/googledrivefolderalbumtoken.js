// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.history.GoogleDriveFolderAlbumToken');

goog.require('goog.Uri');
goog.require('goog.asserts');
goog.require('pics3.history.Token');


/**
 * @param {!pics3.GoogleDriveFolderAlbumId} albumId
 * @param {pics3.PhotoId=} opt_photoId
 * @constructor
 * @extends {pics3.history.Token}
 */
pics3.history.GoogleDriveFolderAlbumToken = function(albumId, opt_photoId) {
  goog.base(this);

  /** @type {!pics3.GoogleDriveFolderAlbumId} */
  this.albumId_ = albumId;

  /** @type {?pics3.PhotoId} */
  this.photoId_ = opt_photoId || null;
};
goog.inherits(pics3.history.GoogleDriveFolderAlbumToken, pics3.history.Token);

/** @type {string} */
pics3.history.GoogleDriveFolderAlbumToken.PARAM = 'googledrivefolder';

/** @type {string} */
pics3.history.GoogleDriveFolderAlbumToken.PHOTO_PARAM = 'photo';

/**
 * @param {goog.Uri} uri
 * @return {?pics3.history.GoogleDriveFolderAlbumToken}
 */
pics3.history.GoogleDriveFolderAlbumToken.fromUri = function(uri) {
  var value = uri.getParameterValue(pics3.history.GoogleDriveFolderAlbumToken.PARAM);
  var photoValue = uri.getParameterValue(pics3.history.GoogleDriveFolderAlbumToken.
      PHOTO_PARAM) || undefined;
  if (!value) {
    return null;
  }
  var albumId = value;
  if (!albumId) {
    return null;
  }
  var photoId = photoValue ? new pics3.PhotoId(goog.asserts.assertString(
      photoValue)) : undefined;
  return new pics3.history.GoogleDriveFolderAlbumToken(
      new pics3.GoogleDriveFolderAlbumId(albumId), photoId);
};

/** @return {!pics3.GoogleDriveFolderAlbumId} */
pics3.history.GoogleDriveFolderAlbumToken.prototype.getAlbumId = function() {
  return this.albumId_;
};

/** @return {?pics3.PhotoId} */
pics3.history.GoogleDriveFolderAlbumToken.prototype.getPhotoId = function() {
  return this.photoId_;
};

/** @override */
pics3.history.GoogleDriveFolderAlbumToken.prototype.addToUri = function(uri) {
  uri.setParameterValue(pics3.history.GoogleDriveFolderAlbumToken.PARAM,
      this.albumId_.id);
  if (this.photoId_) {
    uri.setParameterValue(pics3.history.GoogleDriveFolderAlbumToken.PHOTO_PARAM,
        this.photoId_.id);
  }
};
