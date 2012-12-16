// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.history.Manager');

goog.require('goog.Uri');
goog.require('goog.asserts');
goog.require('goog.debug.Logger');
goog.require('goog.events.Event');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('pics3.Album');
goog.require('pics3.Service');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 * @implements {pics3.Service}
 */
pics3.history.Manager = function() {
  goog.base(this);

  /** @type {!Array.<!pics3.history.Handler>} */
  this.handlers_ = [];

  /** @type {goog.events.EventHandler} */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);
};
goog.inherits(pics3.history.Manager, goog.events.EventTarget);

pics3.history.Manager.SERVICE_ID = 's' + goog.getUid(pics3.history.Manager);

/** @enum {string} */
pics3.history.Manager.EventType = {
  NAVIGATE: goog.events.getUniqueId('navigate')
};

/** @type {!Array.<string>} */
pics3.history.Manager.PRESERVED_QUERY_PARAMS = [
    'jsmode',
    'Debug'
    ];

/**
 * @param {!pics3.AppContext} appContext
 * @return {!pics3.history.Manager}
 */
pics3.history.Manager.get = function(appContext) {
  return /** @type {!pics3.history.Manager} */ (goog.asserts.assertObject(
      appContext.get(pics3.history.Manager.SERVICE_ID)));
};

/** @type {goog.debug.Logger} */
pics3.history.Manager.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.history.Manager');

/** @type {boolean} */
pics3.history.Manager.prototype.locked_ = false;

/** @param {!pics3.AppContext} appContext */
pics3.history.Manager.prototype.register = function(appContext) {
  appContext.register(pics3.history.Manager.SERVICE_ID, this);
};

/** @param {!pics3.history.Handler} handler */
pics3.history.Manager.prototype.registerHandler = function(handler) {
  this.registerDisposable(handler);
  this.handlers_.push(handler);
};

pics3.history.Manager.prototype.start = function() {
  this.eventHandler_.listen(window, goog.events.EventType.POPSTATE,
      this.handleWindowPopState_);
  var uri = new goog.Uri(window.location.href);
  var tokenResult = this.getTokenFromUri_(uri);
  if (tokenResult) {
    this.replaceWithToken_(tokenResult.token);
  }
};

/**
 * @param {!pics3.history.Token} token
 */
pics3.history.Manager.prototype.pushToken = function(token) {
  if (this.locked_) {
    return;
  }
  var currentUri = new goog.Uri(window.location.href);
  var newUri = this.makeNewUriForToken_(currentUri, token);
  if (newUri.toString() != currentUri.toString()) {
    window.history.pushState({}, document.title, this.uriToString_(newUri));
  }
};

pics3.history.Manager.prototype.lock = function() {
  this.locked_ = true;
};

pics3.history.Manager.prototype.unlock = function() {
  this.locked_ = false;
};

/**
 * @param {!pics3.history.Token} token
 */
pics3.history.Manager.prototype.replaceWithToken_ = function(token) {
  if (this.locked_) {
    return;
  }
  var currentUri = new goog.Uri(window.location.href);
  var newUri = this.makeNewUriForToken_(currentUri, token);
  window.history.replaceState({}, document.title, this.uriToString_(newUri));
};

/** @return {pics3.history.Manager.TokenResult} */
pics3.history.Manager.prototype.getTokenFromUri_ = function(uri) {
  for (var i = 0; i < this.handlers_.length; i++) {
    var handler = this.handlers_[i];
    var token = handler.processUri(uri);
    if (token) {
      return new pics3.history.Manager.TokenResult(handler, token);
    }
  }
  return null;
};

/**
 * @param {!goog.Uri} uri
 * @return {string}
 */
pics3.history.Manager.prototype.uriToString_ = function(uri) {
  var query = uri.getEncodedQuery();
  query = query.replace(new RegExp('%2F', 'g'), '/');
  uri = uri.clone();
  uri.setQueryData(new goog.Uri.QueryData(query));
  return uri.toString();
};

pics3.history.Manager.prototype.handleWindowPopState_ = function() {
  var uri = new goog.Uri(window.location.href);
  var tokenResult = this.getTokenFromUri_(uri);
  if (tokenResult) {
    tokenResult.handler.handleToken(tokenResult.token);
  }
};

/**
 * @param {!goog.Uri} currentUri
 * @param {!pics3.history.Token} token
 * @return {!goog.Uri}
 */
pics3.history.Manager.prototype.makeNewUriForToken_ = function(currentUri,
    token) {
  var newUri = currentUri.clone();
  var queryData = newUri.getQueryData();
  queryData.clear();
  goog.array.forEach(pics3.history.Manager.PRESERVED_QUERY_PARAMS,
      function(paramName) {
    var paramValue = currentUri.getParameterValue(paramName);
    if (goog.isDefAndNotNull(paramValue)) {
      newUri.setParameterValue(paramName, paramValue);
    }
  });
  token.addToUri(newUri);
  return newUri;
};

/**
 * @param {!pics3.history.Handler} handler
 * @param {!pics3.history.Token} token
 * @constructor
 */
pics3.history.Manager.TokenResult = function(handler, token) {
  /** @type {!pics3.history.Handler} */
  this.handler = handler;

  /** @type {!pics3.history.Token} */
  this.token = token;
};
