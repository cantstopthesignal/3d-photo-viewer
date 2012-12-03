// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.source.ButtonTile');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('pics3.Component');
goog.require('pics3.source.Tile');


/**
 * @param {!pics3.AppContext} appContext
 * @param {string} iconClassName
 * @constructor
 * @extends {pics3.source.Tile}
 */
pics3.source.ButtonTile = function(appContext, iconClassName) {
  goog.base(this, appContext, iconClassName);
};
goog.inherits(pics3.source.ButtonTile, pics3.source.Tile);

/** @desc Add more button caption */
pics3.source.ButtonTile.MSG_ADD_MORE = goog.getMsg('View more');

/** @type {pics3.Button} */
pics3.source.ButtonTile.prototype.button;

pics3.source.ButtonTile.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.style.showElement(this.noteEl, false);
  this.setSelectable(false);

  this.button = new pics3.Button('');
  this.registerDisposable(this.button);
  this.button.setCaptionHtml(this.getOpenFirstCaptionHtml());
  this.button.render(this.el);
};

pics3.source.ButtonTile.prototype.handleAlbumChanged = function() {
  goog.base(this, 'handleAlbumChanged');
  if (this.album.getLength() > 0) {
    goog.style.showElement(this.noteEl, true);
    this.button.setCaption(pics3.source.ButtonTile.MSG_ADD_MORE);
    this.setSelectable(true);
  } else {
    goog.style.showElement(this.noteEl, false);
    this.button.setCaptionHtml(this.getOpenFirstCaptionHtml());
    this.setSelectable(false);
  }
};

/** @return {string} */
pics3.source.ButtonTile.prototype.getOpenFirstCaptionHtml = goog.abstractMethod;
