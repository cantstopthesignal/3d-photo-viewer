// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.PicasaApi');

goog.require('goog.async.Deferred');
goog.require('goog.async.DeferredList');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('pics3.ErrorCode');
goog.require('pics3.ErrorMessage');
goog.require('pics3.GoogleClient');
goog.require('pics3.Service');


/**
 * @constructor
 * @param {!pics3.AppContext} appContext
 * @extends {goog.events.EventTarget}
 * @implements {pics3.Service}
 */
pics3.PicasaApi = function(appContext) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!pics3.GoogleClient} */
  this.googleClient_ = pics3.GoogleClient.get(this.appContext_);
};
goog.inherits(pics3.PicasaApi, goog.events.EventTarget);

pics3.PicasaApi.SERVICE_ID = 's' + goog.getUid(pics3.PicasaApi);

/** @desc Unexpected picasa api error */
pics3.PicasaApi.MSG_PICASA_UNEXPECTED_ERROR = goog.getMsg(
    'Unexpected error in Picasa api.');

/** @desc Album load error */
pics3.PicasaApi.MSG_PICASA_ALBUM_LOAD_ERROR = goog.getMsg(
    'Error loading album.');

/** @desc Album not found error */
pics3.PicasaApi.MSG_PICASA_ALBUM_NOT_FOUND_ERROR = goog.getMsg(
    'Google+ album not found.  You may not have permission to see it.');

/** @desc Photo data load error */
pics3.PicasaApi.MSG_PICASA_PHOTO_DATA_LOAD_ERROR = goog.getMsg(
    'Error loading photo data.');

/** @desc Photo not found error */
pics3.PicasaApi.MSG_PICASA_PHOTO_NOT_FOUND_ERROR = goog.getMsg(
    'Google+ photo not found.');

/** @enum {string} */
pics3.PicasaApi.ErrorMessage = {
  UNEXPECTED: pics3.PicasaApi.MSG_PICASA_UNEXPECTED_ERROR,
  ALBUM_LOAD: pics3.PicasaApi.MSG_PICASA_ALBUM_LOAD_ERROR,
  ALBUM_NOT_FOUND: pics3.PicasaApi.MSG_PICASA_ALBUM_NOT_FOUND_ERROR,
  PHOTO_DATA_LOAD: pics3.PicasaApi.MSG_PICASA_PHOTO_DATA_LOAD_ERROR,
  PHOTO_NOT_FOUND: pics3.PicasaApi.MSG_PICASA_PHOTO_NOT_FOUND_ERROR
};

/**
 * @param {!pics3.AppContext} appContext
 * @return {!pics3.PicasaApi}
 */
pics3.PicasaApi.get = function(appContext) {
  return /** @type {!pics3.PicasaApi} */ (goog.asserts.assertObject(
      appContext.get(pics3.PicasaApi.SERVICE_ID)));
};

/** @type {goog.debug.Logger} */
pics3.PicasaApi.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.PicasaApi');

/** @param {!pics3.AppContext} appContext */
pics3.PicasaApi.prototype.register = function(appContext) {
  appContext.register(pics3.PicasaApi.SERVICE_ID, this);
};

/** @return {goog.async.Deferred} */
pics3.PicasaApi.prototype.loadAsync = function() {
  return this.googleClient_.loadAsync();
};

/** @return {!pics3.GoogleClient} */
pics3.PicasaApi.prototype.getGoogleClient = function() {
  return this.googleClient_;
};

/**
 * @param {string} downloadUrl
 * @return {!pics3.PicasaApi.LoadPhoto}
 */
pics3.PicasaApi.prototype.newLoadPhoto = function(downloadUrl) {
  return new pics3.PicasaApi.LoadPhoto(this, downloadUrl);
}

/**
 * @param {pics3.PicasaAlbumId} albumId
 * @return {goog.async.Deferred} producing {Object}
 */
pics3.PicasaApi.prototype.loadAlbum = function(albumId) {
  var albumUri = new goog.Uri('https://picasaweb.google.com/data/feed/api/' +
      'user/' + albumId.userId + (albumId.albumId ? '/albumid/' +
          albumId.albumId : '/album/' + albumId.album));
  albumUri.setParameterValue('alt', 'json');
  albumUri.setParameterValue('v', '2');
  if (albumId.authKey) {
    albumUri.setParameterValue('authkey', albumId.authKey);
  }

  var relayUri = new goog.Uri('/picasarelay');
  relayUri.setParameterValue('url', albumUri.toString());
  relayUri.setParameterValue('method', 'get');
  relayUri.setParameterValue('header', 'Authorization=OAuth ' +
      this.googleClient_.getOAuthToken());

  var xhr = new XMLHttpRequest();
  xhr.open('GET', relayUri.toString());

  var d = new goog.async.Deferred();
  var eventHandler = new goog.events.EventHandler(this);
  function handleLoad() {
    if (xhr.status == 200) {
      var responseText = goog.asserts.assertString(xhr.responseText);
      var error;
      try {
        var resp = goog.json.parse(responseText);
      } catch (e) {
        error = e;
        error.code = pics3.ErrorCode.UNEXPECTED;
      }
      if (error) {
        this.reportError(error);
        d.errback(error);
      } else {
        goog.asserts.assert(resp);
        goog.asserts.assert(resp['feed']);
        this.logger_.info('Album loaded');
        d.callback(resp);
      }
    } else {
      var error = Error('Error loading album: Xhr response error: ' +
          xhr.status + ': ' + xhr.statusText);
      var errorMessage;
      if (xhr.status == 404) {
        error.code = pics3.ErrorCode.NOT_FOUND;
        errorMessage = pics3.PicasaApi.ErrorMessage.ALBUM_NOT_FOUND;
      } else {
        error.code = pics3.ErrorCode.UNEXPECTED;
      }
      this.reportError(error, errorMessage);
      d.errback(error);
    }
    goog.dispose(eventHandler);
  }
  function handleError(e) {
    var error = Error('Error loading album: Xhr network error');
    error.code = pics3.ErrorCode.NETWORK;
    this.reportError(error);
    d.errback(error);
    goog.dispose(eventHandler);
  }
  eventHandler.
      listen(xhr, goog.events.EventType.LOAD, handleLoad).
      listen(xhr, goog.events.EventType.ERROR, handleError);
  xhr.send();
  return d;
};

/**
 * @param {Error} error
 * @param {string=} opt_message
 */
pics3.PicasaApi.prototype.reportError = function(error, opt_message) {
  var errorMessage = opt_message;
  if (!errorMessage) {
    if (error.code == pics3.ErrorCode.NETWORK) {
      errorMessage = pics3.ErrorMessage.NETWORK;
    } else {
      errorMessage = pics3.PicasaApi.ErrorMessage.UNEXPECTED;
    }
  }
  this.logger_.severe(error.toString(), error);
  var notificationManager = pics3.NotificationManager.get(this.appContext_);
  notificationManager.show(errorMessage);
};

/**
 * @param {!pics3.PicasaApi} api
 * @param {string} downloadUrl
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.PicasaApi.LoadPhoto = function(api, downloadUrl) {
  goog.base(this);

  /** @type {!pics3.PicasaApi} */
  this.api_ = api;

  /** @type {string} */
  this.downloadUrl_ = downloadUrl;
};
goog.inherits(pics3.PicasaApi.LoadPhoto, goog.events.EventTarget);

/** @type {goog.debug.Logger} */
pics3.PicasaApi.LoadPhoto.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.PicasaApi.LoadPhoto');

/** @type {ArrayBuffer} */
pics3.PicasaApi.LoadPhoto.prototype.dataBuffer_;

/** @return {ArrayBuffer} */
pics3.PicasaApi.LoadPhoto.prototype.getDataBuffer = function() {
  return this.dataBuffer_;
};

/** @return {!goog.async.Deferred} producing this */
pics3.PicasaApi.LoadPhoto.prototype.load = function() {
  goog.asserts.assert(this.downloadUrl_ && this.downloadUrl_.length);

  var relayUri = new goog.Uri('/picasarelay');
  relayUri.setParameterValue('url', this.downloadUrl_);
  relayUri.setParameterValue('method', 'get');

  var xhr = new XMLHttpRequest();
  xhr.open('GET', relayUri.toString());
  xhr.responseType = 'arraybuffer';

  var d = new goog.async.Deferred();
  var eventHandler = new goog.events.EventHandler(this);
  function handleLoad() {
    if (xhr.status == 200) {
      goog.asserts.assert(xhr.response instanceof ArrayBuffer);
      this.logger_.info('Photo data loaded');
      this.dataBuffer_ = xhr.response;
      d.callback(this);
    } else {
      var error = Error('Error loading photo: Xhr response error: ' +
          xhr.status + ': ' + xhr.statusText);
      var errorMessage;
      if (xhr.status == 404) {
        error.code = pics3.ErrorCode.NOT_FOUND;
        errorMessage = pics3.PicasaApi.ErrorMessage.PHOTO_DATA_LOAD;
      } else {
        error.code = pics3.ErrorCode.UNEXPECTED;
      }
      this.api_.reportError(error, errorMessage);
      d.errback(error);
    }
    goog.dispose(eventHandler);
  }
  function handleError(e) {
    var error = Error('Error loading photo: Xhr network error');
    error.code = pics3.ErrorCode.NETWORK;
    this.api_.reportError(error);
    d.errback(error);
    goog.dispose(eventHandler);
  }
  function handleProgress(e) {
    var browserEvent = e.getBrowserEvent();
    if (browserEvent.lengthComputable) {
      this.dispatchEvent(new pics3.loader.ProgressEvent(
          browserEvent.loaded, browserEvent.total));
    }
  }
  eventHandler.
     listen(xhr, goog.events.EventType.LOAD, handleLoad).
     listen(xhr, 'progress', handleProgress).
     listen(xhr, goog.events.EventType.ERROR, handleError);
  xhr.send();
  return d;
};
