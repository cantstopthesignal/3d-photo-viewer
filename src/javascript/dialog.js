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

/** @type {boolean} */
pics3.Dialog.prototype.closeOnBodyClick_ = false;

/** @type {?number} */
pics3.Dialog.prototype.bodyClickListenerKey_;

pics3.Dialog.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'dialog');
};

/** @override */
pics3.Dialog.prototype.disposeInternal = function() {
  goog.events.unlistenByKey(this.bodyClickListenerKey_);
  goog.base(this, 'disposeInternal');
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
  if (this.closeOnBodyClick_) {
    window.setTimeout(goog.bind(function() {
      this.bodyClickListenerKey_ = goog.events.listen(document.body,
          goog.events.EventType.CLICK, this.handleBodyClick_, false, this);
    }, this), 0);
  }
};

pics3.Dialog.prototype.hide = function() {
  goog.dom.removeNode(this.el);
  if (this.bodyClickListenerKey_) {
    goog.events.unlistenByKey(this.bodyClickListenerKey_);
    delete this.bodyClickListenerKey_;
  }
};

/** @param {boolean} closeOnBodyClick */
pics3.Dialog.prototype.setCloseOnBodyClick = function(closeOnBodyClick) {
  this.closeOnBodyClick_ = closeOnBodyClick;
};

pics3.Dialog.prototype.reposition = function() {
  this.el.style.marginLeft = -(this.el.offsetWidth/2) + 'px';
  this.el.style.marginTop = -(this.el.offsetHeight/2) + 'px';
};

/** @param {goog.events.BrowserEvent} e */
pics3.Dialog.prototype.handleBodyClick_ = function(e) {
  if (!goog.dom.contains(this.el, e.target)) {
    this.hide();
  }
};
