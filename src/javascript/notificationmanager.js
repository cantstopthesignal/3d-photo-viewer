// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.NotificationManager');

goog.require('pics3.Component');
goog.require('pics3.Service');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');


/**
 * @param {!pics3.AppBar} appBar
 * @constructor
 * @extends {pics3.Component}
 * @implements {pics3.Service}
 */
pics3.NotificationManager = function(appBar) {
  goog.base(this);

  /** @type {!pics3.AppBar} */
  this.appBar_ = appBar;
};
goog.inherits(pics3.NotificationManager, pics3.Component);

pics3.NotificationManager.SERVICE_ID = 's' + goog.getUid(
    pics3.NotificationManager);

/**
 * @param {!pics3.AppContext} appContext
 * @return {!pics3.NotificationManager}
 */
pics3.NotificationManager.get = function(appContext) {
  return /** @type {!pics3.NotificationManager} */ (goog.asserts.assertObject(
      appContext.get(pics3.NotificationManager.SERVICE_ID)));
};

/** @type {number} */
pics3.NotificationManager.DEFAULT_SHOW_DURATION_MS_ = 5000;

/** @type {number} */
pics3.NotificationManager.prototype.showTimeoutId_;

/** @param {!pics3.AppContext} appContext */
pics3.NotificationManager.prototype.register = function(appContext) {
  appContext.register(pics3.NotificationManager.SERVICE_ID, this);
};

pics3.NotificationManager.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'notification');
};

/** @override */
pics3.NotificationManager.prototype.disposeInternal = function() {
  this.clearShowTimeout_();
  goog.base(this, 'disposeInternal');
};

/**
 * @param {string} message
 * @param {number=} opt_duration
 */
pics3.NotificationManager.prototype.show = function(message, opt_duration) {
  if (!this.el) {
    this.createDom();
  }
  goog.asserts.assert(this.el);
  var parentEl = document.body;
  parentEl.appendChild(this.el);

  goog.dom.setTextContent(this.el, message);
  this.clearShowTimeout_();
  this.showTimeoutId_ = window.setTimeout(goog.bind(this.hide, this),
      opt_duration || pics3.NotificationManager.DEFAULT_SHOW_DURATION_MS_);

  this.reposition();
};

pics3.NotificationManager.prototype.hide = function() {
  this.clearShowTimeout_();
  goog.dom.removeNode(this.el);
};

pics3.NotificationManager.prototype.reposition = function() {
  var width = this.el.offsetWidth;
  var height = this.el.offsetHeight;
  if (width > this.appBar_.el.offsetWidth / 2) {
    goog.style.setStyle(this.el, 'top', this.appBar_.el.offsetHeight + 'px');
    goog.style.setStyle(this.el, 'marginTop', '');
  } else {
    goog.style.setStyle(this.el, 'top', (this.appBar_.el.offsetHeight / 2) +
        'px');
    goog.style.setStyle(this.el, 'marginTop', -(height/2) + 'px');
  }
  goog.style.setStyle(this.el, 'left', '50%');
  goog.style.setStyle(this.el, 'marginLeft', -(width/2) + 'px');
};

pics3.NotificationManager.prototype.clearShowTimeout_ = function() {
  if (this.showTimeoutId_) {
    window.clearTimeout(this.showTimeoutId_);
    delete this.showTimeoutId_;
  }
};
