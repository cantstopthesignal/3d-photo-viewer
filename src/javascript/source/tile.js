// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.source.Tile');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('pics3.Component');
goog.require('pics3.Spinner');


/**
 * @param {!pics3.AppContext} appContext
 * @param {string} iconClassName
 * @constructor
 * @extends {pics3.Component}
 */
pics3.source.Tile = function(appContext, iconClassName) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext = appContext;

  /** @type {string} */
  this.iconClassName_ = iconClassName;

  /** @type {!pics3.Spinner} */
  this.spinner = new pics3.Spinner(true, 28);
};
goog.inherits(pics3.source.Tile, pics3.Component);

/** @enum {string} */
pics3.source.Tile.EventType = {
  SELECT: goog.events.getUniqueId('select'),
  SELECTABLE_CHANGED: goog.events.getUniqueId('selectablechanged')
};

/** @type {pics3.Album} */
pics3.source.Tile.prototype.album;

/** @type {Element} */
pics3.source.Tile.prototype.noteEl;

/** @type {boolean} */
pics3.source.Tile.prototype.selected = false;

/** @type {boolean} */
pics3.source.Tile.prototype.selectable_ = true;

pics3.source.Tile.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'source-tile', 'selectable');

  this.spinner.render(this.el);

  this.noteEl = document.createElement('div');
  goog.dom.classes.add(this.noteEl, 'note');
  this.el.appendChild(this.noteEl);

  this.eventHandler.
      listen(this.album, pics3.Album.EventType.CHANGED,
          this.handleAlbumChanged).
      listen(this.el, goog.events.EventType.CLICK, this.handleClick_);
  this.updateNote();
};

/** @return {!pics3.Album} */
pics3.source.Tile.prototype.getAlbum = function() {
  return goog.asserts.assertObject(this.album);
};

/** @param {boolean} selected */
pics3.source.Tile.prototype.setSelected = function(selected) {
  this.selected = selected;
  goog.dom.classes.enable(this.el, 'selected', this.selected);
};

pics3.source.Tile.prototype.select = function() {
  this.dispatchEvent(pics3.source.Tile.EventType.SELECT);
};

/** @param {boolean} selectable */
pics3.source.Tile.prototype.setSelectable = function(selectable) {
  if (this.selectable_ != selectable) {
    this.selectable_ = selectable;
    goog.dom.classes.enable(this.el, 'selectable', this.selectable_);
    this.dispatchEvent(pics3.source.Tile.EventType.SELECTABLE_CHANGED);
  }
};

/** @return {boolean} */
pics3.source.Tile.prototype.isSelectable = function() {
  return this.selectable_;
};

pics3.source.Tile.prototype.handleClick_ = function() {
  this.select();
};

pics3.source.Tile.prototype.handleAlbumChanged = function() {
  this.updateNote();
};

pics3.source.Tile.prototype.updateNote = function() {
  var noteText = this.getNoteText();
  var noteHtml = this.getLogoHtml_() + ' ' + goog.string.htmlEscape(noteText);
  this.noteEl.innerHTML = noteHtml;
};

/** @return {string} */
pics3.source.Tile.prototype.getNoteText =  function() {
  if (this.album.getLength() > 1) {
    /** @desc Number of photos loaded */
    var MSG_N_PHOTOS = goog.getMsg('{$count} photos',
        {count: this.album.getLength()});
    return MSG_N_PHOTOS;
  } else if (this.album.getLength() == 1) {
    /** @desc Number of photos loaded */
    var MSG_1_PHOTO = goog.getMsg('1 photo');
    return MSG_1_PHOTO;
  } else {
    /** @desc Number of photos loaded */
    var MSG_0_PHOTOS = goog.getMsg('0 photos');
    return MSG_0_PHOTOS;
  }
};

/** @return {string} */
pics3.source.Tile.prototype.getLogoHtml_ = function() {
  return '<div class="source-tile-logo ' + this.iconClassName_ + '"></div>';
};
