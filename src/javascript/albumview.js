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
goog.require('pics3.Filmstrip');
goog.require('pics3.PhotoView');
goog.require('pics3.Spinner');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {pics3.Component}
 */
pics3.AlbumView = function(appContext) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!Object.<number,!pics3.PhotoView>} */
  this.photoViewsMap_ = {};

  /** @type {!pics3.Spinner} */
  this.spinner_ = new pics3.Spinner(true, 48);

  this.filmstrip_ = new pics3.Filmstrip();

  /** @type {!Array.<!Element>} */
  this.navArrowEls_ = [];

  /** @type {!goog.events.EventHandler} */
  this.albumEventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.albumEventHandler_);
};
goog.inherits(pics3.AlbumView, pics3.Component);

/** @enum {string} */
pics3.AlbumView.EventType = {
  SWITCH_PHOTO: goog.events.getUniqueId('switchphoto')
};

/** @type {number} */
pics3.AlbumView.MAX_PREFETCH_COUNT = 4;

/** @type {goog.debug.Logger} */
pics3.AlbumView.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.AlbumView');

/** @type {pics3.Album} */
pics3.AlbumView.prototype.album_;

/** @type {number} */
pics3.AlbumView.prototype.photoIndex_ = 0;

/** @type {number} */
pics3.AlbumView.prototype.photoPrefechIntervalId_;

/** @type {?pics3.PhotoId} */
pics3.AlbumView.prototype.selectPhotoOnLoad_;

pics3.AlbumView.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'album-view');
  this.el.tabIndex = 0;

  this.spinner_.render(this.el);
  this.spinner_.setFloatingStyle(true);

  this.filmstrip_.render(this.el);

  for (var i = 0; i < 2; i++) {
    var navArrowEl = document.createElement('div');
    goog.dom.classes.add(navArrowEl, 'album-nav-arrow');
    goog.dom.classes.add(navArrowEl, i == 0 ? 'left' : 'right');
    var underlay1El = document.createElement('div');
    goog.dom.classes.add(underlay1El, 'underlay1');
    navArrowEl.appendChild(underlay1El);
    var underlay2El = document.createElement('div');
    goog.dom.classes.add(underlay2El, 'underlay2');
    navArrowEl.appendChild(underlay2El);
    var overlayEl = document.createElement('div');
    goog.dom.classes.add(overlayEl, 'overlay');
    navArrowEl.appendChild(overlayEl);
    goog.style.setStyle(navArrowEl, 'visibility', 'hidden');
    this.navArrowEls_.push(navArrowEl);
    this.el.appendChild(navArrowEl);
  }

  this.eventHandler.
      listen(this.el, goog.events.EventType.KEYDOWN, this.handleKeyDown_).
      listen(this.filmstrip_, pics3.Filmstrip.EventType.SELECT_PHOTO,
          this.handleFilmstripSelectPhoto_).
      listen(this.navArrowEls_[0], goog.events.EventType.CLICK, this.navLeft_).
      listen(this.navArrowEls_[1], goog.events.EventType.CLICK, this.navRight_);
};

/** @param {pics3.Album} album */
pics3.AlbumView.prototype.setAlbum = function(album) {
  this.focus();
  if (album == this.album_) {
    return;
  }
  this.albumEventHandler_.removeAll();
  this.album_ = album;
  this.photoIndex_ = 0;
  goog.disposeAll(goog.object.getValues(this.photoViewsMap_));
  this.photoViewsMap_ = {};
  this.cancelPhotoPrefetch_();
  delete this.selectPhotoOnLoad_;
  var spinEntry = this.spinner_.spin(100);
  this.filmstrip_.setAlbum(album);
  this.album_.loadAsync().addBoth(function() {
        spinEntry.release();
      }).addCallback(this.handleAlbumLoad_, this);
  this.albumEventHandler_.listen(album, pics3.Album.EventType.CHANGED,
      this.handleAlbumChanged_);
};

/** @return {pics3.Album} */
pics3.AlbumView.prototype.getAlbum = function() {
  return this.album_;
};

/** @return {?pics3.Photo} */
pics3.AlbumView.prototype.getDisplayedPhoto = function() {
  if (this.album_ && this.photoIndex_ >= 0 && this.photoIndex_ <
      this.album_.getLength()) {
    return this.album_.get(this.photoIndex_);
  }
  return null;
};

/** @param {!pics3.PhotoId} photoId */
pics3.AlbumView.prototype.selectPhoto = function(photoId) {
  if (!this.album_) {
    return;
  }
  if (this.album_.getState() == pics3.Album.State.LOADED) {
    this.displayPhotoById_(photoId);
  } else {
    this.selectPhotoOnLoad_ = photoId;
  }
};

pics3.AlbumView.prototype.handleAlbumLoad_ = function() {
  this.resizeContent_();
  if (!this.album_.getLength()) {
    return;
  }
  if (this.selectPhotoOnLoad_) {
    this.displayPhotoById_(this.selectPhotoOnLoad_);
    delete this.selectPhotoOnLoad_;
  } else {
    this.displayPhotoByIndex_(0);
  }
  this.startPhotoPrefetch_();
};

pics3.AlbumView.prototype.handleAlbumChanged_ = function() {
  this.updateNav_();
  this.resizeContent_();
};

pics3.AlbumView.prototype.startPhotoPrefetch_ = function() {
  this.prefetchPhotoIndex_ = this.photoIndex_;
  if (!this.photoPrefechIntervalId_) {
    this.photoPrefechIntervalId_ = window.setInterval(
        goog.bind(this.maybePrefetchPhoto_, this), 100);
  }
};

pics3.AlbumView.prototype.cancelPhotoPrefetch_ = function() {
  if (this.photoPrefechIntervalId_) {
    window.clearInterval(this.photoPrefechIntervalId_);
    delete this.photoPrefechIntervalId_;
  }
};

pics3.AlbumView.prototype.maybePrefetchPhoto_ = function() {
  if (!this.album_.stateIn(pics3.Album.State.LOADED) ||
      !this.album_.getLength()) {
    return;
  }
  var iter = 0;
  var index = this.photoIndex_;
  index = (index < this.album_.getLength() ? index : 0);
  while (iter < pics3.AlbumView.MAX_PREFETCH_COUNT) {
    var photo = this.album_.get(index);
    if (photo.getState() == pics3.Photo.State.PENDING) {
      this.logger_.info('Prefetch photo ' + index);
      photo.loadAsync();
      return;
    } else if (photo.getState() == pics3.Photo.State.LOADING) {
      return;
    }
    index = (index + 1) % this.album_.getLength();
    iter++;
  }
};

/**
 * @param {number} index
 * @return {boolean} whether a new photo was displayed.
 */
pics3.AlbumView.prototype.displayPhotoByIndex_ = function(index) {
  var photoView = this.getPhotoViewByIndex_(index);
  goog.object.forEach(this.photoViewsMap_, function(photoView) {
    if (photoView.el && photoView.el.parentNode) {
      goog.dom.removeNode(photoView.el);
    }
  });
  var changed = this.photoIndex_ != index;
  this.photoIndex_ = index;
  var photo = this.album_.get(this.photoIndex_);
  this.filmstrip_.selectThumbnail(photo);
  if (!photoView.el) {
    photoView.render(this.el);
    photoView.start();
  } else {
    this.el.appendChild(photoView.el);
  }
  this.resizePhotoView_();
  this.updateNav_();
  return changed;
};

/**
 * @param {!pics3.PhotoId} photoId
 * @return {boolean} whether a new photo was displayed.
 */
pics3.AlbumView.prototype.displayPhotoById_ = function(photoId) {
  var photoIndex = this.album_.getPhotoIndexById(photoId);
  if (photoIndex < 0) {
    photoIndex = 0;
  }
  return this.displayPhotoByIndex_(photoIndex);
};

/**
 * @param {number} photoUniqueId
 * @return {boolean} whether a new photo was displayed.
 */
pics3.AlbumView.prototype.displayPhotoByUniqueId_ = function(photoUniqueId) {
  var photoIndex = this.album_.getPhotoIndexByUniqueId(photoUniqueId);
  if (photoIndex < 0) {
    photoIndex = 0;
  }
  return this.displayPhotoByIndex_(photoIndex);
};

/** @return {?pics3.PhotoView} */
pics3.AlbumView.prototype.getCurrentPhotoView_ = function() {
  if (this.album_ && this.album_.getLength()) {
    return this.getPhotoViewByIndex_(this.photoIndex_);
  }
  return null;
};

/** @param {number} index */
pics3.AlbumView.prototype.getPhotoViewByIndex_ = function(index) {
  goog.asserts.assert(index >= 0 && index < this.album_.getLength());
  var photo = this.album_.get(index);
  var photoView = this.photoViewsMap_[photo.getUniqueId()];
  if (!photoView) {
    photoView = new pics3.PhotoView(this.appContext_, photo);
    this.photoViewsMap_[photo.getUniqueId()] = photoView;
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
  this.resizeContent_();
};

pics3.AlbumView.prototype.resizeContent_ = function() {
  var width = this.el.offsetWidth;
  var height = this.el.offsetHeight;
  goog.style.setPosition(this.spinner_.el,
      (width - this.spinner_.getSize()) / 2,
      (height - this.spinner_.getSize()) / 2);
  var showFilmstrip = this.album_ && this.album_.getState() ==
      pics3.Album.State.LOADED && this.album_.getLength() > 1;
  var filmstripHeight = showFilmstrip ? Math.min(120,
      Math.max(80, height * 1/4)) : 0;
  goog.style.setStyle(this.filmstrip_.el, 'visibility', showFilmstrip ? '' :
      'hidden');
  this.filmstrip_.resize(width, filmstripHeight);
  goog.style.setPosition(this.filmstrip_.el, 0, height - filmstripHeight);
  this.resizePhotoView_();

  for (var i = 0; i < 2; i++) {
    var navArrowEl = this.navArrowEls_[i];
    goog.style.setPosition(navArrowEl,
        i == 0 ? 0 : width - navArrowEl.offsetWidth,
        (height - navArrowEl.offsetHeight) / 2);
  }
};

pics3.AlbumView.prototype.resizePhotoView_ = function() {
  var photoView = this.getCurrentPhotoView_();
  if (photoView && photoView.el) {
    var filmstripHeight = this.filmstrip_.el.offsetHeight;
    photoView.resize(this.el.offsetWidth, this.el.offsetHeight -
        filmstripHeight);
  }
};

pics3.AlbumView.prototype.updateNav_ = function() {
  goog.style.setStyle(this.navArrowEls_[0], 'visibility',
      this.photoIndex_ > 0 ? '' : 'hidden');
  var albumLength = this.album_ ? this.album_.getLength() : 0;
  goog.style.setStyle(this.navArrowEls_[1], 'visibility',
      this.photoIndex_ < albumLength - 1 ? '' : 'hidden');
};

/** @param {pics3.Filmstrip.SelectPhotoEvent} e */
pics3.AlbumView.prototype.handleFilmstripSelectPhoto_ = function(e) {
  if (this.displayPhotoByUniqueId_(e.photoUniqueId)) {
    this.dispatchEvent(pics3.AlbumView.EventType.SWITCH_PHOTO);
  }
};

/** @param {goog.events.BrowserEvent} e */
pics3.AlbumView.prototype.handleKeyDown_ = function(e) {
  if (e.keyCode == goog.events.KeyCodes.LEFT) {
    this.navLeft_();
  } else if (e.keyCode == goog.events.KeyCodes.RIGHT) {
    this.navRight_();
  }
};

pics3.AlbumView.prototype.navLeft_ = function() {
  if (this.album_ && this.photoIndex_ > 0) {
    if (this.displayPhotoByIndex_(this.photoIndex_ - 1)) {
      this.dispatchEvent(pics3.AlbumView.EventType.SWITCH_PHOTO);
    }
  }
};

pics3.AlbumView.prototype.navRight_ = function() {
  if (this.album_ && this.photoIndex_ + 1 < this.album_.getLength()) {
    if (this.displayPhotoByIndex_(this.photoIndex_ + 1)) {
      this.dispatchEvent(pics3.AlbumView.EventType.SWITCH_PHOTO);
    }
  }
};

/** @override */
pics3.AlbumView.prototype.disposeInternal = function() {
  goog.disposeAll(goog.object.getValues(this.photoViewsMap_));
  this.photoViewsMap_ = {};
  this.cancelPhotoPrefetch_();
  goog.base(this, 'disposeInternal');
};
