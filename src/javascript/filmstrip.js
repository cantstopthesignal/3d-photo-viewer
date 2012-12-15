// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.Filmstrip');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('goog.events.KeyCodes');
goog.require('goog.object');
goog.require('pics3.Component');


/**
 * @constructor
 * @extends {pics3.Component}
 */
pics3.Filmstrip = function() {
  goog.base(this);

  /** @type {!Object.<!Element>} */
  this.thumbnailElMap_ = {};

  /** @type {!goog.events.EventHandler} */
  this.albumEventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.albumEventHandler_);
};
goog.inherits(pics3.Filmstrip, pics3.Component);

/** @enum {string} */
pics3.Filmstrip.EventType = {
  SELECT_PHOTO: goog.events.getUniqueId('selectphoto')
};

/** @type {string} */
pics3.Filmstrip.PHOTO_ID_ATTRIBUTE_ = 'pics3_photoid';

/** @type {string} */
pics3.Filmstrip.PHOTO_UNIQUE_ID_ATTRIBUTE_ = 'pics3_photouniqueid';

/** @type {goog.debug.Logger} */
pics3.Filmstrip.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.Filmstrip');

/** @type {pics3.Album} */
pics3.Filmstrip.prototype.album_;

/** @type {Element} */
pics3.Filmstrip.prototype.selectedThumbnailEl_;

pics3.Filmstrip.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'film-strip');
  this.el.tabIndex = 0;
  this.eventHandler.listen(this.el, goog.events.EventType.CLICK,
      this.handleClick_);
};

/** @param {pics3.Album} album */
pics3.Filmstrip.prototype.setAlbum = function(album) {
  if (album == this.album_) {
    return;
  }
  this.albumEventHandler_.removeAll();
  this.album_ = album;
  this.album_.loadAsync().addCallback(this.handleAlbumLoad_, this);
  this.albumEventHandler_.listen(album, pics3.Album.EventType.CHANGED,
      this.handleAlbumChanged_);
};

/** @param {pics3.Photo} photo */
pics3.Filmstrip.prototype.selectThumbnail = function(photo) {
  if (this.selectedThumbnailEl_) {
    goog.dom.classes.remove(this.selectedThumbnailEl_, 'selected');
  }
  this.selectedThumbnailEl_ = this.thumbnailElMap_[photo.getUniqueId()];
  if (this.selectedThumbnailEl_) {
    goog.dom.classes.add(this.selectedThumbnailEl_, 'selected');
  }
};

pics3.Filmstrip.prototype.handleAlbumLoad_ = function() {
  if (!this.album_.getLength()) {
    return;
  }
  this.el.innerHTML = '';
  this.thumbnailElMap_ = {};
  this.handleAlbumChanged_();
  this.resizeThumbnails_();
};

pics3.Filmstrip.prototype.handleAlbumChanged_ = function() {
  var thumbnailEls = goog.array.clone(this.getElementsByClass(
      'film-strip-thumbnail'));
  var index = 0;
  while (true) {
    var thumbnailEl = thumbnailEls[index];
    var photo = index < this.album_.getLength() ? this.album_.get(index) : null;
    if (!photo && !thumbnailEl) {
      break;
    }
    var thumbnailId = thumbnailEl ? parseInt(thumbnailEl[
        pics3.Filmstrip.PHOTO_UNIQUE_ID_ATTRIBUTE_], 10) : null;
    if (!photo) {
      goog.dom.removeNode(thumbnailEl);
      delete this.thumbnailElMap_[thumbnailId];
      index++;
      continue;
    }
    if (!thumbnailEl || thumbnailId != photo.getUniqueId()) {
      var newThumbnailEl = this.createThumbnailElement_(photo);
      this.thumbnailElMap_[photo.getUniqueId()] = newThumbnailEl;
      if (thumbnailEl) {
        this.el.insertBefore(newThumbnailEl, thumbnailEl);
      } else {
        this.el.appendChild(newThumbnailEl);
      }
      thumbnailEls.splice(index, 0, newThumbnailEl);
    }
    index++;
  }
};

/** @param {goog.events.BrowserEvent} e */
pics3.Filmstrip.prototype.handleClick_ = function(e) {
  var thumbnailEl = e.target;
  while (thumbnailEl && thumbnailEl.parentNode != this.el) {
    thumbnailEl = thumbnailEl.parentNode;
  }
  if (!thumbnailEl) {
    return;
  }
  var photoUniqueIdStr = thumbnailEl[
      pics3.Filmstrip.PHOTO_UNIQUE_ID_ATTRIBUTE_];
  if (photoUniqueIdStr) {
    this.dispatchEvent(new pics3.Filmstrip.SelectPhotoEvent(
        parseInt(photoUniqueIdStr, 10)));
  }
};

/**
 * @param {!pics3.Photo} photo
 * @return {!Element}
 */
pics3.Filmstrip.prototype.createThumbnailElement_ = function(photo) {
  var thumbnail = photo.getThumbnail(150, 100);
  var thumbnailEl = document.createElement('div');
  goog.dom.classes.add(thumbnailEl, 'film-strip-thumbnail');
  if (thumbnail) {
    goog.style.setStyle(thumbnailEl, 'backgroundImage',
        'url(' + thumbnail.imgUrl + ')');
  } else {
    goog.dom.classes.add(thumbnailEl, 'missing');
    var innerEl = document.createElement('div');
    goog.dom.classes.add(innerEl, 'inner');
    thumbnailEl.appendChild(innerEl);
  }
  thumbnailEl[pics3.Filmstrip.PHOTO_UNIQUE_ID_ATTRIBUTE_] = photo.getUniqueId();
  return thumbnailEl;
};

pics3.Filmstrip.prototype.resize = function(opt_width, opt_height) {
  var width = opt_width || this.el.parentNode.offsetWidth;
  var height = opt_height || this.el.parentNode.offsetHeight;
  goog.style.setBorderBoxSize(this.el,
      new goog.math.Size(width, height));
  this.resizeThumbnails_();
};

pics3.Filmstrip.prototype.resizeThumbnails_ = function() {
  var height = this.el.offsetHeight - 20;
  goog.object.forEach(this.thumbnailElMap_, function(thumbnailEl) {
    goog.style.setSize(thumbnailEl, Math.ceil(height * 1.5), height);
  });
};

/** @override */
pics3.Filmstrip.prototype.disposeInternal = function() {
  delete this.thumbnailElMap_;
  goog.base(this, 'disposeInternal');
};

/**
 * @param {number} photoUniqueId
 * @constructor
 * @extends {goog.events.Event}
 */
pics3.Filmstrip.SelectPhotoEvent = function(photoUniqueId) {
  goog.base(this, pics3.Filmstrip.EventType.SELECT_PHOTO);

  /** @type {number} */
  this.photoUniqueId = photoUniqueId;
};
goog.inherits(pics3.Filmstrip.SelectPhotoEvent, goog.events.Event);
