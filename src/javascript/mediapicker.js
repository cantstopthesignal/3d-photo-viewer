// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.MediaPicker');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventType');
goog.require('pics3.BlobPhotoLoader');
goog.require('pics3.Button');
goog.require('pics3.Component');
goog.require('pics3.Photo');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {pics3.Component}
 */
pics3.MediaPicker = function(appContext) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;
};
goog.inherits(pics3.MediaPicker, pics3.Component);

/** @enum {string} */
pics3.MediaPicker.EventType = {
  PHOTO_LIST_CHANGED: goog.events.getUniqueId('photolistchanged')
};

/** @type {Element} */
pics3.MediaPicker.prototype.buttonEl_;

/** @type {pics3.Button} */
pics3.MediaPicker.prototype.uploadButton_;

/** @type {boolean} */
pics3.MediaPicker.prototype.expanded_ = true;

pics3.MediaPicker.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'media-picker');

  this.uploadButton_ = new pics3.Button('Upload');
  this.registerDisposable(this.uploadButton_);
  this.uploadButton_.render(this.el);

  this.buttonEl_ = document.createElement('div');
  goog.dom.classes.add(this.buttonEl_, 'app-bar-button', 'media-picker-button',
      'active');
  this.buttonEl_.appendChild(document.createTextNode('Select Media'));

  this.eventHandler.listen(this.uploadButton_.el, goog.events.EventType.CLICK,
      this.handleUploadClick_, false);
};

pics3.MediaPicker.prototype.renderButton = function(parentEl) {
  parentEl.appendChild(this.buttonEl_);
};

/** @return {boolean} */
pics3.MediaPicker.prototype.isExpanded = function() {
  return this.expanded_;
};

/** @override */
pics3.MediaPicker.prototype.disposeInternal = function() {
  goog.dom.removeNode(this.buttonEl_);
  delete this.buttonEl_;
  goog.base(this, 'disposeInternal');
};

pics3.MediaPicker.prototype.handleUploadClick_ = function() {
  var fileEl = document.createElement('input');
  fileEl.setAttribute('type', 'file');
  fileEl.setAttribute('multiple', 'true');
  goog.events.listenOnce(fileEl, goog.events.EventType.CHANGE,
      goog.bind(this.handleUploadFiles_, this, fileEl), false);
  fileEl.click();
};

/** @param {goog.events.BrowserEvent} e */
pics3.MediaPicker.prototype.handleUploadFiles_ = function(fileEl, e) {
  if (fileEl.files.length) {
    var mediaManager = pics3.MediaManager.get(this.appContext_);
    var uploadPhotoList = mediaManager.getUploadPhotoList();
    goog.array.forEach(fileEl.files, function(file) {
      var photoLoader = new pics3.BlobPhotoLoader(file);
      var photo = new pics3.Photo(photoLoader);
      uploadPhotoList.add(photo);
    });
    this.dispatchEvent(new pics3.MediaPicker.PhotoListChangedEvent(
        uploadPhotoList));
  }
};

/**
 * @constructor
 * @extends {goog.events.Event}
 */
pics3.MediaPicker.PhotoListChangedEvent = function(photoList) {
  goog.base(this, pics3.MediaPicker.EventType.PHOTO_LIST_CHANGED);

  /** @type {pics3.PhotoList} */
  this.photoList = photoList;
};
goog.inherits(pics3.MediaPicker.PhotoListChangedEvent, goog.events.Event);
