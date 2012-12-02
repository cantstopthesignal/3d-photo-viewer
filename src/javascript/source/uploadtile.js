// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.source.UploadTile');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('pics3.MediaManager');
goog.require('pics3.Photo');
goog.require('pics3.loader.BlobFile');
goog.require('pics3.source.Tile');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {pics3.source.Tile}
 */
pics3.source.UploadTile = function(appContext) {
  goog.base(this, appContext);

  var mediaManager = pics3.MediaManager.get(this.appContext);

  /** @type {!pics3.PhotoList} */
  this.photoList_ = mediaManager.getPhotoList(pics3.MediaManager.Source.UPLOAD);

  this.eventHandler.listen(this.photoList_, pics3.PhotoList.EventType.CHANGED,
      this.handlePhotoListChanged_);
};
goog.inherits(pics3.source.UploadTile, pics3.source.Tile);

/** @desc Load from my computer button caption */
pics3.source.UploadTile.MSG_LOAD_FIRST = goog.getMsg('View from My Computer');

/** @type {pics3.Button} */
pics3.source.UploadTile.prototype.button_;

/** @type {Element} */
pics3.source.UploadTile.prototype.noteEl_;

pics3.source.UploadTile.prototype.createDom = function() {
  goog.base(this, 'createDom');

  this.noteEl_ = document.createElement('div');
  goog.dom.classes.add(this.noteEl_, 'note');
  goog.style.showElement(this.noteEl_, false);
  this.el.appendChild(this.noteEl_);

  this.button_ = new pics3.Button(pics3.source.UploadTile.MSG_LOAD_FIRST);
  this.registerDisposable(this.button_);
  this.button_.render(this.el);

  this.eventHandler.
      listen(this.button_.el, goog.events.EventType.CLICK,
          this.handleUploadClick_).
      listen(this.el, goog.events.EventType.CLICK, this.handleClick_);
};

/** @override */
pics3.source.UploadTile.prototype.getPhotoList = function() {
  return this.photoList_;
};

pics3.source.UploadTile.prototype.handlePhotoListChanged_ = function() {
  if (this.photoList_.getLength() > 0) {
    goog.style.showElement(this.noteEl_, true);

    if (this.photoList_.getLength() > 1) {
      /** @desc Number of photos loaded from My Computer */
      var MSG_N_PHOTOS_MY_COMPUTER = goog.getMsg(
          '{$count} photos from My Computer',
          {count: this.photoList_.getLength()});
      goog.dom.setTextContent(this.noteEl_, MSG_N_PHOTOS_MY_COMPUTER);
    } else {
      /** @desc Number of photos loaded from My Computer */
      var MSG_1_PHOTO_MY_COMPUTER = goog.getMsg(
          '1 photo from My Computer');
      goog.dom.setTextContent(this.noteEl_, MSG_1_PHOTO_MY_COMPUTER);
    }

    this.button_.setCaption(pics3.source.Tile.MSG_ADD_MORE);
  } else {
    goog.style.showElement(this.noteEl_, false);
    this.button_.setCaption(pics3.source.UploadTile.MSG_LOAD_FIRST);
  }
};

pics3.source.UploadTile.prototype.handleClick_ = function() {
  this.select();
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
      var photo = new pics3.Photo(photoLoader);
      this.photoList_.add(photo);
    }, this);
    this.select();
  }
};
