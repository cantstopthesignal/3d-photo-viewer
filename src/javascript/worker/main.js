// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.worker.main');

goog.require('goog.asserts');
goog.require('goog.events');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('pics3.worker.Worker');
goog.require('pics3.worker.WorkerLogger');

// To appease closure missing types warnings.
goog.require('goog.debug.ErrorHandler');


goog.scope(function() {

var main = pics3.worker.main;

/** @type {pics3.worker.Worker} */
main.worker_;

main.start = function() {
  goog.asserts.assert(!main.worker_);
  main.worker_ = new pics3.worker.Worker();
  main.worker_.start();
};

main.dispose = function() {
  goog.dispose(main.worker_);
};

pics3.worker.WorkerLogger.install();
main.start();

});