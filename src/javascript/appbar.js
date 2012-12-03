// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.AppBar');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('pics3.AppBarMainMenu');
goog.require('pics3.Component');


/**
 * @constructor
 * @extends {pics3.Component}
 */
pics3.AppBar = function() {
  goog.base(this);

  /** @type {pics3.AppBarMainMenu} */
  this.mainMenu_ = new pics3.AppBarMainMenu();
  this.registerDisposable(this.mainMenu_);
};
goog.inherits(pics3.AppBar, pics3.Component);

pics3.AppBar.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'app-bar');

  var appIconEl = document.createElement('div');
  goog.dom.classes.add(appIconEl, 'app-icon', 'app-bar-icon');
  appIconEl.appendChild(document.createElement('div'));
  goog.dom.classes.add(appIconEl.firstChild, 'inner');
  this.el.appendChild(appIconEl);

  this.mainMenu_.render(this.el);
};

pics3.AppBar.prototype.getMainMenu = function() {
  return this.mainMenu_;
};
