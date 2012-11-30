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
goog.require('pics3.Photo');
goog.require('pics3.source.GoogleDriveTile');
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

  this.tiles_.push(new pics3.source.UploadTile(appContext));
  this.tiles_.push(new pics3.source.GoogleDriveTile(appContext));
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
    this.eventHandler.
        listen(tile, pics3.source.Tile.EventType.SELECT,
            this.handleTileSelect_);
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
