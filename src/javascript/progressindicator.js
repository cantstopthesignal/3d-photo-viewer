// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.ProgressIndicator');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.style');
goog.require('pics3.Component');


/**
 * @constructor
 * @extends {pics3.Component}
 */
pics3.ProgressIndicator = function() {
  goog.base(this);
};
goog.inherits(pics3.ProgressIndicator, pics3.Component);

/** @type {Element} */
pics3.ProgressIndicator.prototype.fillEl_;

pics3.ProgressIndicator.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'progress');

  this.fillEl_ = document.createElement('div');
  goog.dom.classes.add(this.fillEl_, 'fill');
  this.el.appendChild(this.fillEl_);
};

/**
 * @param {number} pos
 * @param {number} total
 */
pics3.ProgressIndicator.prototype.setState = function(pos, total) {
  if (!this.el) {
    this.createDom();
  }
  if (total <= 0) {
    return;
  }
  var maxWidthPixels = (this.el.offsetWidth || 200) - 6;
  var posPixels = Math.ceil(Math.max(0, Math.min(1, pos / total)) *
      maxWidthPixels);
  posPixels = Math.max(14, posPixels);
  goog.style.setWidth(this.fillEl_, posPixels + 'px');
};
