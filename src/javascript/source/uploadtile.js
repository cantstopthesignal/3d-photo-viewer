// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.source.UploadTile');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('pics3.MediaManager');
goog.require('pics3.Photo');
goog.require('pics3.loader.BlobFile');
goog.require('pics3.source.ButtonTile');
goog.require('pics3.source.Tile');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {pics3.source.ButtonTile}
 */
pics3.source.UploadTile = function(appContext) {
  goog.base(this, appContext, 'my-computer-logo');

  var mediaManager = pics3.MediaManager.get(this.appContext);

  /** @type {!pics3.Album} */
  this.album = mediaManager.getSourceAlbum(pics3.MediaManager.Source.UPLOAD);
};
goog.inherits(pics3.source.UploadTile, pics3.source.ButtonTile);

pics3.source.UploadTile.prototype.createDom = function() {
  goog.base(this, 'createDom');

  this.eventHandler.
      listen(this.button.el, goog.events.EventType.CLICK,
          this.handleUploadClick_);
};

/** @param {goog.events.BrowserEvent} e */
pics3.source.UploadTile.prototype.handleUploadClick_ = function(e) {
  e.stopPropagation();
  var fileEl = document.createElement('input');
  fileEl.setAttribute('type', 'file');
  fileEl.setAttribute('multiple', 'true');
  goog.events.listenOnce(fileEl, goog.events.EventType.CHANGE,
      goog.bind(this.handleUploadFiles_, this, fileEl), false);
  fileEl.click();
};

/** @param {goog.events.BrowserEvent} e */
pics3.source.UploadTile.prototype.handleUploadFiles_ = function(fileEl, e) {
  if (fileEl.files.length) {
    goog.array.forEach(fileEl.files, function(file) {
      var photoLoader = new pics3.loader.BlobFile(file);
      var photo = new pics3.Photo(this.appContext, null, photoLoader);
      this.album.add(photo);
    }, this);
    this.select();
  }
};

/** @override */
pics3.source.UploadTile.prototype.getOpenFirstCaptionHtml = function() {
  /** @desc Load from my computer button caption */
  var MSG_LOAD_FIRST_COMPUTER = goog.getMsg('{$logoHtml} My Computer',
      {logoHtml: this.getLogoHtml_()});
  return MSG_LOAD_FIRST_COMPUTER;
};
