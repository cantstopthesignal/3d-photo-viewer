// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.Component');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.events.EventTarget');
goog.require('goog.style');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.Component = function() {
  goog.base(this);

  /** @type {goog.events.EventHandler} */
  this.eventHandler = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler);
};
goog.inherits(pics3.Component, goog.events.EventTarget);

/** @type {Element} */
pics3.Component.prototype.el;

pics3.Component.prototype.createDom = function() {
  goog.asserts.assert(!this.el);
  this.el = document.createElement('div');
};

pics3.Component.prototype.render = function(parentEl) {
  if (!this.el) {
    this.createDom();
  }
  parentEl.appendChild(this.el);
};

/**
 * @param {string} className
 * @return {!goog.array.ArrayLike}
 */
pics3.Component.prototype.getElementsByClass = function(className) {
  return goog.dom.getElementsByClass(className, this.el);
};

/**
 * @param {string} className
 * @return {Element}
 */
pics3.Component.prototype.getElementByClass = function(className) {
  return goog.dom.getElementByClass(className, this.el);
};

/** @override */
pics3.Component.prototype.disposeInternal = function() {
  goog.dom.removeNode(this.el);
  delete this.el;
  goog.base(this, 'disposeInternal');
};
