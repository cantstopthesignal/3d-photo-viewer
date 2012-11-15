// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.main');

goog.require('pics3.App');
goog.require('goog.asserts');
goog.require('goog.debug.Console');
goog.require('goog.events');
goog.require('goog.events.EventType');

// To appease closure missing types warnings.
goog.require('goog.debug.ErrorHandler');


/** @type {pics3.App} */
pics3.main.app_;

pics3.main.start = function() {
  goog.asserts.assert(!pics3.main.app_);
  pics3.main.app_ = new pics3.App();
  pics3.main.app_.start();
};

pics3.main.dispose = function() {
  goog.dispose(pics3.main.app_);
  goog.events.unlistenByKey(pics3.main.windowLoadListenerKey_);
};

pics3.main.loadInline = function() {
};

pics3.main.handleWindowLoad = function() {
  goog.debug.Console.autoInstall();
  pics3.main.start();
};

pics3.main.windowLoadListenerKey_ = goog.events.listen(window,
    goog.events.EventType.LOAD, pics3.main.handleWindowLoad);
pics3.main.loadInline();
