// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.PicasaAlbum');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.string');
goog.require('pics3.Photo');
goog.require('pics3.PicasaApi');
goog.require('pics3.loader.Album');
goog.require('pics3.loader.AlbumResult');
goog.require('pics3.loader.PicasaPhoto');


/**
 * @param {!pics3.AppContext} appContext
 * @param {!pics3.PicasaAlbumId} id
 * @param {string=} opt_name
 * @extends {pics3.loader.Album}
 * @constructor
 */
pics3.loader.PicasaAlbum = function(appContext, id, opt_name) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!pics3.PicasaApi} */
  this.picasaApi_ = pics3.PicasaApi.get(this.appContext_);

  /** @type {!pics3.PicasaAlbumId} */
  this.id_ = id;

  /** @type {?string} */
  this.name_ = opt_name || null;

  /** @type {goog.events.EventHandler} */
  this.eventHandler = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler);
};
goog.inherits(pics3.loader.PicasaAlbum, pics3.loader.Album);

/** @override */
pics3.loader.PicasaAlbum.prototype.loadAsync = function() {
  return this.picasaApi_.loadAlbum(this.id_).addCallback(function(resp) {
    var photos = [];
    goog.array.forEach(resp['feed']['entry'], function(entry) {
      var loader = pics3.loader.PicasaPhoto.fromMetadata(this.appContext_,
          entry);
      var photo = new pics3.Photo(this.appContext_, loader.getPhotoId(),
          loader);
      photos.push(photo);
    }, this);
    this.name_ = resp['feed']['title']['$t'] || this.name_;
    return new pics3.loader.AlbumResult(photos, this.name_);
  }, this);
};
