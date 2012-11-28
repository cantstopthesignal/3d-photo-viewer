// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.AlbumView');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.object');
goog.require('pics3.Component');
goog.require('pics3.PhotoView');


/**
 * @constructor
 * @extends {pics3.Component}
 */
pics3.AlbumView = function() {
  goog.base(this);

  /** @type {!Object.<number,!pics3.PhotoView>} */
  this.photoViewsMap_ = {};
};
goog.inherits(pics3.AlbumView, pics3.Component);

/** @type {pics3.PhotoList} */
pics3.AlbumView.prototype.photoList_;

/** @type {number} */
pics3.AlbumView.prototype.photoIndex_ = 0;

pics3.AlbumView.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'album-view');
  this.el.tabIndex = 0;

  this.eventHandler.listen(this.el, goog.events.EventType.KEYDOWN,
      this.handleKeyDown_);
};

/** @param {pics3.PhotoList} photoList */
pics3.AlbumView.prototype.setPhotoList = function(photoList) {
  if (photoList == this.photoList_) {
    return;
  }
  this.photoList_ = photoList;
  this.photoIndex_ = 0;
  goog.disposeAll(goog.object.getValues(this.photoViewsMap_));
  this.photoViewsMap_ = {};
  if (!this.photoList_.getLength()) {
    return;
  }
  this.displayPhotoByIndex_(0);
};

/** @param {number} index */
pics3.AlbumView.prototype.displayPhotoByIndex_ = function(index) {
  var photoView = this.getPhotoViewByIndex_(index);
  goog.object.forEach(this.photoViewsMap_, function(photoView) {
    if (photoView.el && photoView.el.parentNode) {
      goog.dom.removeNode(photoView.el);
    }
  });
  this.photoIndex_ = index;
  // Note: this could cause reentrance of render: problem?
  photoView.render(this.el);
  this.resizePhotoView_();
};

/** @return {?pics3.PhotoView} */
pics3.AlbumView.prototype.getCurrentPhotoView_ = function() {
  if (this.photoList_ && this.photoList_.getLength()) {
    return this.getPhotoViewByIndex_(this.photoIndex_);
  }
  return null;
};

/** @param {number} index */
pics3.AlbumView.prototype.getPhotoViewByIndex_ = function(index) {
  goog.asserts.assert(index >= 0 && index < this.photoList_.getLength());
  var photo = this.photoList_.get(index);
  var photoView = this.photoViewsMap_[photo.getId()];
  if (!photoView) {
    photoView = new pics3.PhotoView(photo);
    this.photoViewsMap_[photo.getId()] = photoView;
  }
  return photoView;
};

pics3.AlbumView.prototype.focus = function() {
  this.el.focus();
};

pics3.AlbumView.prototype.resize = function(opt_width, opt_height) {
  var width = opt_width || this.el.parentNode.offsetWidth;
  var height = opt_height || this.el.parentNode.offsetHeight;
  goog.style.setBorderBoxSize(this.el,
      new goog.math.Size(width, height));
  this.resizePhotoView_();
};

pics3.AlbumView.prototype.resizePhotoView_ = function() {
  var photoView = this.getCurrentPhotoView_();
  if (photoView) {
    photoView.resize(this.el.offsetWidth, this.el.offsetHeight);
  }
};

/** @param {goog.events.BrowserEvent} e */
pics3.AlbumView.prototype.handleKeyDown_ = function(e) {
  if (e.keyCode == goog.events.KeyCodes.LEFT) {
    if (this.photoIndex_ > 0) {
      this.displayPhotoByIndex_(this.photoIndex_ - 1);
    }
  } else if (e.keyCode == goog.events.KeyCodes.RIGHT) {
    if (this.photoIndex_ + 1 < this.photoList_.getLength()) {
      this.displayPhotoByIndex_(this.photoIndex_ + 1);
    }
  }
};

/** @override */
pics3.AlbumView.prototype.disposeInternal = function() {
  goog.disposeAll(goog.object.getValues(this.photoViewsMap_));
  this.photoViewsMap_ = {};
  goog.base(this, 'disposeInternal');
};
