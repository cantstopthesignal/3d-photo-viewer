// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.source.Tile');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('pics3.Component');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {pics3.Component}
 */
pics3.source.Tile = function(appContext) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext = appContext;
};
goog.inherits(pics3.source.Tile, pics3.Component);

/** @enum {string} */
pics3.source.Tile.EventType = {
  SELECT: goog.events.getUniqueId('select')
};

/** @desc Add more button caption */
pics3.source.Tile.MSG_ADD_MORE = goog.getMsg('View more');

/** @type {boolean} */
pics3.source.Tile.prototype.selected = false;

pics3.source.Tile.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'source-tile');
};

/** @return {!pics3.PhotoList} */
pics3.source.Tile.prototype.getPhotoList = goog.abstractMethod;

/** @param {boolean} selected */
pics3.source.Tile.prototype.setSelected = function(selected) {
  this.selected = selected;
  goog.dom.classes.enable(this.el, 'selected', this.selected);
};
