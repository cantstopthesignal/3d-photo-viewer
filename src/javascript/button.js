// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.Button');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.style');
goog.require('pics3.Component');


/**
 * @constructor
 * @param {string|Node} caption
 * @extends {pics3.Component}
 */
pics3.Button = function(caption) {
  goog.base(this);

  if (goog.isString(caption)) {
    caption = document.createTextNode(caption);
  }

  /** @type {Node} */
  this.captionEl_ = caption;
};
goog.inherits(pics3.Button, pics3.Component);

pics3.Button.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'button');

  this.el.appendChild(this.captionEl_);
};
