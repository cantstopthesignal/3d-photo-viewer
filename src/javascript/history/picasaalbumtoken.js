// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.history.PicasaAlbumToken');

goog.require('goog.Uri');
goog.require('goog.asserts');
goog.require('pics3.history.Token');


/**
 * @param {!pics3.PicasaAlbumId} albumId
 * @param {pics3.PhotoId=} opt_photoId
 * @constructor
 * @extends {pics3.history.Token}
 */
pics3.history.PicasaAlbumToken = function(albumId, opt_photoId) {
  goog.base(this);

  /** @type {!pics3.PicasaAlbumId} */
  this.albumId_ = albumId;

  /** @type {?pics3.PhotoId} */
  this.photoId_ = opt_photoId || null;
};
goog.inherits(pics3.history.PicasaAlbumToken, pics3.history.Token);

/** @type {string} */
pics3.history.PicasaAlbumToken.PARAM = 'googleplusalbum';

/** @type {string} */
pics3.history.PicasaAlbumToken.PHOTO_PARAM = 'photo';

/**
 * @param {goog.Uri} uri
 * @return {?pics3.history.PicasaAlbumToken}
 */
pics3.history.PicasaAlbumToken.fromUri = function(uri) {
  var value = uri.getParameterValue(pics3.history.PicasaAlbumToken.PARAM);
  var photoValue = uri.getParameterValue(pics3.history.PicasaAlbumToken.
      PHOTO_PARAM) || undefined;
  if (!value) {
    return null;
  }
  var pieces = value.split('/');
  if (pieces.length < 2) {
    return null;
  }
  var userId = pieces[0];
  if (!userId) {
    return null;
  }
  var album = pieces[1] || undefined;
  var albumId = pieces[2] || undefined;
  var authKey = pieces[3] || undefined;
  if (!album && !albumId) {
    return null;
  }
  var photoId = photoValue ? new pics3.PhotoId(goog.asserts.assertString(
      photoValue)) : undefined;
  return new pics3.history.PicasaAlbumToken(
      new pics3.PicasaAlbumId(userId, album, albumId, authKey), photoId);
};

/** @return {!pics3.PicasaAlbumId} */
pics3.history.PicasaAlbumToken.prototype.getAlbumId = function() {
  return this.albumId_;
};

/** @return {?pics3.PhotoId} */
pics3.history.PicasaAlbumToken.prototype.getPhotoId = function() {
  return this.photoId_;
};

/** @override */
pics3.history.PicasaAlbumToken.prototype.addToUri = function(uri) {
  var paramValueArray = [
      this.albumId_.userId,
      this.albumId_.album,
      this.albumId_.albumId,
      this.albumId_.authKey
      ];
  for (var i = 3; i >= 1; i--) {
    if (!paramValueArray[i]) {
      paramValueArray.splice(i, 1);
    } else {
      break;
    }
  }
  uri.setParameterValue(pics3.history.PicasaAlbumToken.PARAM,
      paramValueArray.join('/'));
  if (this.photoId_) {
    uri.setParameterValue(pics3.history.PicasaAlbumToken.PHOTO_PARAM,
        this.photoId_.id);
  }
};
