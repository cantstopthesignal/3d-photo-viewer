// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.source.Picker');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventType');
goog.require('pics3.Button');
goog.require('pics3.Component');
goog.require('pics3.MediaManager');
goog.require('pics3.Photo');
goog.require('pics3.source.AlbumTile');
goog.require('pics3.source.GoogleDriveTile');
goog.require('pics3.source.PicasaTile');
goog.require('pics3.source.UploadTile');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {pics3.Component}
 */
pics3.source.Picker = function(appContext) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!Array.<!pics3.source.Tile>} */
  this.tiles_ = [];

  this.tiles_.push(new pics3.source.UploadTile(this.appContext_));
  this.tiles_.push(new pics3.source.PicasaTile(this.appContext_));
  this.tiles_.push(new pics3.source.GoogleDriveTile(this.appContext_));

  var mediaManager = pics3.MediaManager.get(this.appContext_);

  this.eventHandler.listen(mediaManager, pics3.MediaManager.EventType.
      ALBUMS_ADDED, this.handleAlbumsAdded_);
};
goog.inherits(pics3.source.Picker, pics3.Component);

/** @type {Element} */
pics3.source.Picker.prototype.buttonEl_;

/** @type {boolean} */
pics3.source.Picker.prototype.expanded_ = true;

pics3.source.Picker.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'source-picker');

  this.buttonEl_ = document.createElement('div');
  goog.dom.classes.add(this.buttonEl_, 'app-bar-button', 'source-picker-button',
      'active');
  this.buttonEl_.appendChild(document.createTextNode('Select Media'));

  goog.array.forEach(this.tiles_, function(tile) {
    tile.render(this.el);
    this.registerListenersForTile_(tile);
  }, this);
};

pics3.source.Picker.prototype.renderButton = function(parentEl) {
  parentEl.appendChild(this.buttonEl_);
};

/** @return {boolean} */
pics3.source.Picker.prototype.isExpanded = function() {
  return this.expanded_;
};

/** @override */
pics3.source.Picker.prototype.disposeInternal = function() {
  goog.dom.removeNode(this.buttonEl_);
  delete this.buttonEl_;
  goog.base(this, 'disposeInternal');
};

/** @param {!pics3.Album} album */
pics3.source.Picker.prototype.getTileForAlbum = function(album) {
  return goog.array.find(this.tiles_, function(tile) {
    return tile.getAlbum() == album;
  }, this);
};

/** @param {!pics3.source.Tile} tile */
pics3.source.Picker.prototype.registerListenersForTile_ = function(tile) {
  this.eventHandler.
      listen(tile, pics3.source.Tile.EventType.SELECT,
          this.handleTileSelect_).
      listen(tile, pics3.source.Tile.EventType.SELECTABLE_CHANGED,
          this.handleTileSelectableChanged_);
};

/** @param {!pics3.MediaManager.AlbumsAddedEvent} e */
pics3.source.Picker.prototype.handleAlbumsAdded_ = function(e) {
  if (!e.albums.length) {
    return;
  }
  var firstTile;
  goog.array.forEach(e.albums, function(album) {
    var tile = new pics3.source.AlbumTile(this.appContext_, album);
    this.tiles_.push(tile);
    if (this.el) {
      tile.render(this.el);
      this.registerListenersForTile_(tile);
    }
    if (!firstTile) {
      firstTile = tile;
    }
  }, this);
  this.sortTiles_();
  firstTile.select();
};

pics3.source.Picker.prototype.sortTiles_ = function() {
  goog.array.stableSort(this.tiles_, function(a, b) {
    return (a.isSelectable() ? 1 : 0) - (b.isSelectable() ? 1 : 0);
  });
  if (this.el) {
    goog.array.forEach(this.tiles_, function(tile) {
      this.el.appendChild(tile.el);
    }, this);
  }
};

/** @param {goog.events.Event} e */
pics3.source.Picker.prototype.handleTileSelect_ = function(e) {
  goog.asserts.assertInstanceof(e.target, pics3.source.Tile);
  var selectedTile = /** @type {pics3.source.Tile} */ (e.target);
  goog.array.forEach(this.tiles_, function(tile) {
    if (tile != selectedTile) {
      tile.setSelected(false);
    }
  });
  selectedTile.setSelected(true);
  this.dispatchEvent(e);
};

/** @param {goog.events.Event} e */
pics3.source.Picker.prototype.handleTileSelectableChanged_ = function(e) {
  this.sortTiles_();
};
