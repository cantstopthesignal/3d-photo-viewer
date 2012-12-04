// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.PicasaApi');

goog.require('goog.async.Deferred');
goog.require('goog.async.DeferredList');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('pics3.Service');


/**
 * @constructor
 * @param {!pics3.GoogleClient} googleClient
 * @extends {goog.events.EventTarget}
 * @implements {pics3.Service}
 */
pics3.PicasaApi = function(googleClient) {
  goog.base(this);

  /** @type {!pics3.GoogleClient} */
  this.googleClient_ = googleClient;
};
goog.inherits(pics3.PicasaApi, goog.events.EventTarget);

pics3.PicasaApi.SERVICE_ID = 's' + goog.getUid(pics3.PicasaApi);

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

  var deferred = new goog.async.Deferred();
  var eventHandler = new goog.events.EventHandler(this);
  function handleLoad() {
    var resp = goog.json.parse(xhr.responseText);
    goog.asserts.assert(resp);
    goog.asserts.assert(resp['feed']);
    this.logger_.info('Album loaded');
    deferred.callback(resp);
    goog.dispose(eventHandler);
  }
  function handleError(e) {
    this.logger_.severe('Error loading album: ' + e, e);
    deferred.errback(e);
    goog.dispose(eventHandler);
  }
  eventHandler.
      listen(xhr, goog.events.EventType.LOAD, handleLoad).
      listen(xhr, goog.events.EventType.ERROR, handleError);
  xhr.send();
  return deferred;
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

  var relayUrl = '/picasarelay?url=' + encodeURIComponent(this.downloadUrl_) +
      '&method=get';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', relayUrl);
  xhr.responseType = 'arraybuffer';

  var deferred = new goog.async.Deferred();
  var eventHandler = new goog.events.EventHandler(this);
  function handleLoad() {
    goog.asserts.assert(xhr.response instanceof ArrayBuffer);
    this.logger_.info('Photo data loaded');
    this.dataBuffer_ = xhr.response;
    deferred.callback(this);
    goog.dispose(eventHandler);
  }
  function handleError(e) {
    this.logger_.severe('Error loading photo: ' + e, e);
    deferred.errback(e);
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
  return deferred;
};

/**
 * @param {pics3.PicasaAlbumId} albumId
 * @return {goog.async.Deferred} producing {Object}
 */
pics3.PicasaApi.prototype.loadAlbumDirect = function(albumId) {
  var url = 'https://picasaweb.google.com/data/feed/api/user/' +
      albumId.userId + (albumId.albumId ? '/albumid/' + albumId.albumId :
        '/album/' + albumId.album) + '?alt=json&v=2';

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.setRequestHeader('Authorization', 'OAuth ' +
      this.googleClient_.getOAuthToken());

  var deferred = new goog.async.Deferred();
  var eventHandler = new goog.events.EventHandler(this);
  function handleLoad() {
    var resp = goog.json.parse(xhr.responseText);
    goog.asserts.assert(resp);
    goog.asserts.assert(resp['feed']);
    this.logger_.info('Album loaded');
    deferred.callback(resp);
    goog.dispose(eventHandler);
  }
  function handleError(e) {
    this.logger_.severe('Error loading album: ' + e, e);
    deferred.errback(e);
    goog.dispose(eventHandler);
  }
  eventHandler.
      listen(xhr, goog.events.EventType.LOAD, handleLoad).
      listen(xhr, goog.events.EventType.ERROR, handleError);
  xhr.send();
  return deferred;
};
