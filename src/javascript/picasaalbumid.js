// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.PicasaAlbumId');

goog.require('goog.Uri');
goog.require('goog.asserts');


/**
 * @param {string} userId
 * @param {string=} opt_album
 * @param {string=} opt_albumId
 * @constructor
 */
pics3.PicasaAlbumId = function(userId, opt_album, opt_albumId) {
  /** @type {string} */
  this.userId = goog.asserts.assertString(userId);

  /** @type {?string} */
  this.album = opt_albumId ? null : opt_album || null;

  /** @type {?string} */
  this.albumId = opt_albumId || null;
};

/**
 * @param {string} url
 * @return {?pics3.PicasaAlbumId}
 */
pics3.PicasaAlbumId.fromUrl = function(url) {
  return pics3.PicasaAlbumId.fromUrlAndId(url);
};

/**
 * @param {string} url
 * @param {string=} opt_albumId
 * @return {?pics3.PicasaAlbumId}
 */
pics3.PicasaAlbumId.fromUrlAndId = function(url, opt_albumId) {
  var uri = new goog.Uri(url);
  var album;
  var userId;
  var albumId = opt_albumId;
  var pathPieces = uri.getPath().substr(1).split('/');
  function isNumeric(str) {
    return new RegExp("^[0-9]+$").test(str);
  }
  if (uri.getDomain() == 'picasaweb.google.com' && pathPieces.length >= 2) {
    userId = pathPieces[0];
    album = pathPieces[1];
  } else if (uri.getDomain() == 'plus.google.com' && pathPieces.length >= 4) {
    if (pathPieces[0].toLowerCase() == 'photos' &&
        pathPieces[2].toLowerCase() == 'albums') {
      userId = pathPieces[1];
      album = pathPieces[3];
    }
  }
  if (!userId || !isNumeric(userId)) {
    return null;
  }
  if (isNumeric(album) && !albumId) {
    albumId = pathPieces[1];
  }
  if (!albumId && !album) {
    return null;
  }
  return new pics3.PicasaAlbumId(userId, album, albumId);
};
