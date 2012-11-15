// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.Dialog');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.style');
goog.require('pics3.Component');

/**
 * @constructor
 * @extends {pics3.Component}
 */
pics3.Dialog = function() {
  goog.base(this);
};
goog.inherits(pics3.Dialog, pics3.Component);

pics3.Dialog.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'dialog');
};

/** @param {Element=} opt_parentEl */
pics3.Dialog.prototype.show = function(opt_parentEl) {
  if (!this.el) {
    this.createDom();
  }
  goog.asserts.assert(this.el);
  var parentEl = opt_parentEl || document.body;
  parentEl.appendChild(this.el);
  this.reposition();
};

pics3.Dialog.prototype.hide = function() {
  goog.dom.removeNode(this.el);
};

pics3.Dialog.prototype.reposition = function() {
  this.el.style.marginLeft = -(this.el.offsetWidth/2) + 'px';
  this.el.style.marginTop = -(this.el.offsetHeight/2) + 'px';
};
