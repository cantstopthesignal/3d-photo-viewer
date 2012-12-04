// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.main');

goog.require('goog.asserts');
goog.require('goog.debug.Console');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('pics3.App');
goog.require('pics3.BrowserVersionWarning');

// To appease closure missing types warnings.
goog.require('goog.debug.ErrorHandler');


goog.scope(function() {

var main = pics3.main;

/** @type {pics3.BrowserVersionWarning} */
main.browserWarning_;

/** @type {pics3.App} */
main.app_;

main.start = function() {
  goog.asserts.assert(!main.app_);
  main.browserWarning_ = new pics3.BrowserVersionWarning();
  main.browserWarning_.start();
  main.app_ = new pics3.App();
  main.app_.start();
};

main.dispose = function() {
  goog.dispose(main.browserWarning_);
  goog.dispose(main.app_);
  goog.events.unlistenByKey(main.windowLoadListenerKey_);
};

main.loadInline = function() {
};

main.handleWindowLoad = function() {
  goog.debug.Console.autoInstall();
  main.start();
};

main.windowLoadListenerKey_ = goog.events.listen(window,
    goog.events.EventType.LOAD, main.handleWindowLoad);
main.loadInline();

});
