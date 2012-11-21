// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.AppBarMainMenu');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('pics3.Component');
goog.require('pics3.Spinner');


/**
 * @constructor
 * @extends {pics3.Component}
 */
pics3.AppBarMainMenu = function() {
  goog.base(this);
};
goog.inherits(pics3.AppBarMainMenu, pics3.Component);

/** @type {Element} */
pics3.AppBarMainMenu.prototype.titleEl_;

pics3.AppBarMainMenu.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'app-bar-main-menu');

  this.titleEl_ = document.createElement('div');
  goog.dom.classes.add(this.titleEl_, 'title');
  this.el.appendChild(this.titleEl_);
};

/** @param {string} title */
pics3.AppBarMainMenu.prototype.setTitle = function(title) {
  goog.dom.setTextContent(this.titleEl_, title);
};
