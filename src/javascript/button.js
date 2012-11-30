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

  this.setCaption(caption);
};
goog.inherits(pics3.Button, pics3.Component);

/** @type {Node} */
pics3.Button.prototype.captionEl_;

pics3.Button.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'button');

  this.el.appendChild(this.captionEl_);
};

/** @param {string|Node} caption */
pics3.Button.prototype.setCaption = function(caption) {
  if (this.el) {
    goog.dom.removeChildren(this.el);
  }
  if (goog.isString(caption)) {
    caption = document.createTextNode(caption);
  }
  this.captionEl_ = caption;
  if (this.el) {
    this.el.appendChild(this.captionEl_);
  }
};

/** @param {string} captionHtml */
pics3.Button.prototype.setCaptionHtml = function(captionHtml) {
  if (this.captionEl_.nodeType == 3) {
    var newCaptionEl = document.createElement('span');
    goog.dom.replaceNode(newCaptionEl, this.captionEl_);
    this.captionEl_ = newCaptionEl;
  }
  this.captionEl_.innerHTML = captionHtml;
};
