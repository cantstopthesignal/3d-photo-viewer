// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.BrowserVersionWarning');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.userAgent');
goog.require('pics3.Dialog');


/**
 * @constructor
 */
pics3.BrowserVersionWarning = function() {
};

/** @type {pics3.BrowserVersionWarning.Dialog} */
pics3.BrowserVersionWarning.prototype.dialog_;

pics3.BrowserVersionWarning.prototype.start = function() {
  if (this.isBrowserSupported_()) {
    return;
  }
  this.dialog_ = new pics3.BrowserVersionWarning.Dialog();
  this.dialog_.show();
};

/** @return {boolean} */
pics3.BrowserVersionWarning.prototype.isBrowserSupported_ = function() {
  if (goog.userAgent.MOBILE) {
    return false;
  }
  if (goog.userAgent.WEBKIT &&
      goog.string.compareVersions(goog.userAgent.VERSION, '537.10') >= 0) {
    return true;
  }
  if (goog.userAgent.GECKO && 
      goog.string.compareVersions(goog.userAgent.VERSION, '12') >= 0) {
    return true;
  }
  return false;
};

/**
 * @constructor
 * @extends {pics3.Dialog}
 */
pics3.BrowserVersionWarning.Dialog = function() {
  goog.base(this);
  this.setCloseOnBodyClick(true);
};
goog.inherits(pics3.BrowserVersionWarning.Dialog, pics3.Dialog);

pics3.BrowserVersionWarning.Dialog.prototype.createDom = function() {
  goog.base(this, 'createDom');
  var contentNode = document.createTextNode("Your browser may not " +
      "be supported by this tool yet.  Tested browsers include the " +
      "latest versions of Firefox and Chrome for desktop computers.");
  this.el.appendChild(contentNode);
  var buttonEl = document.createElement('div');
  buttonEl.className = 'button';
  buttonEl.appendChild(document.createTextNode('Ignore this warning'));
  this.el.appendChild(buttonEl);
  this.el.style.zIndex = 30;
  buttonEl.onclick = goog.bind(this.hide, this);
};
