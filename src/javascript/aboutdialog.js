// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.AboutDialog');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.style');
goog.require('pics3.Dialog');


/**
 * @param {!Element} contentEl
 * @constructor
 * @extends {pics3.Dialog}
 */
pics3.AboutDialog = function(contentEl) {
  goog.base(this);
  this.setCloseOnBodyClick(true);

  /** @type {!Element} */
  this.contentEl_ = contentEl;
  goog.dom.removeNode(this.contentEl_);
};
goog.inherits(pics3.AboutDialog, pics3.Dialog);

/** @type {Element} */
pics3.AboutDialog.prototype.buttonEl_;

pics3.AboutDialog.prototype.createDom = function() {
  goog.base(this, 'createDom');
  this.el.appendChild(this.contentEl_);
};

pics3.AboutDialog.prototype.renderButton = function(parentEl) {
  if (!this.buttonEl_) {
    this.buttonEl_ = document.createElement('div');
    goog.dom.classes.add(this.buttonEl_, 'app-bar-button');
    this.buttonEl_.appendChild(document.createTextNode('About'));

    this.eventHandler.listen(this.buttonEl_, goog.events.EventType.CLICK,
        this.handleButtonClick_);
  }
  parentEl.appendChild(this.buttonEl_);
};

pics3.AboutDialog.prototype.handleButtonClick_ = function() {
  this.show();
};

/** @override */
pics3.AboutDialog.prototype.disposeInternal = function() {
  goog.dom.removeNode(this.buttonEl_);
  delete this.buttonEl_;
  goog.base(this, 'disposeInternal');
};
