// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.GooglePickerClient');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('goog.json');
goog.require('pics3.Dialog');
goog.require('pics3.GoogleClient');
goog.require('pics3.Photo');
goog.require('pics3.loader.GoogleDrivePhoto');
goog.require('pics3.util');


/**
 * Handle google document pickers.
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {goog.events.EventTarget}
 * @implements {pics3.Service}
 */
pics3.GooglePickerClient = function(appContext) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!pics3.GoogleClient} */
  this.googleClient_ = pics3.GoogleClient.get(appContext);

  /** @type {goog.async.Deferred} */
  this.loadDeferred_ = new goog.async.Deferred();
};
goog.inherits(pics3.GooglePickerClient, goog.events.EventTarget);

pics3.GooglePickerClient.SERVICE_ID = 's' + goog.getUid(
    pics3.GooglePickerClient);

/** @desc Title for the picker dialog. */
pics3.GooglePickerClient.MSG_PICKER_TITLE = goog.getMsg(
    'Select photos to view');

/**
 * @param {!pics3.AppContext} appContext
 * @return {!pics3.GooglePickerClient}
 */
pics3.GooglePickerClient.get = function(appContext) {
  return /** @type {!pics3.GooglePickerClient} */ (goog.asserts.assertObject(
      appContext.get(pics3.GooglePickerClient.SERVICE_ID)));
};

/** @type {goog.debug.Logger} */
pics3.GooglePickerClient.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.GooglePickerClient');

/** @type {boolean} */
pics3.GooglePickerClient.prototype.loadStarted_ = false;

/** @param {!pics3.AppContext} appContext */
pics3.GooglePickerClient.prototype.register = function(appContext) {
  appContext.register(pics3.GooglePickerClient.SERVICE_ID, this);
};

/** @return {goog.async.Deferred} */
pics3.GooglePickerClient.prototype.loadAsync = function() {
  if (!this.loadStarted_) {
    this.loadStarted_ = true;
    this.loadGoogleLoaderAndPicker_();
  }
  return this.loadDeferred_;
};

/** @return {!pics3.GooglePickerClient.PickerBuilder} */
pics3.GooglePickerClient.prototype.newPickerBuilder = function() {
  goog.asserts.assert(this.loadDeferred_.hasFired());
  var pickerBuilder = new pics3.GooglePickerClient.PickerBuilder(
      this.appContext_);
  pickerBuilder.setOAuthToken(this.googleClient_.getOAuthToken());
  return pickerBuilder;
};

pics3.GooglePickerClient.prototype.loadGoogleLoaderAndPicker_ = function() {
  if (goog.getObjectByName('google.load') &&
      goog.getObjectByName('google.picker.PickerBuilder')) {
    this.logger_.info('loadGoogleLoaderAndPicker_ already present');
    this.handleGoogleJsapiLoad_();
    return;
  }
  var callbackName = 'callback_' + goog.getUid(this);
  goog.exportSymbol(callbackName,
      goog.bind(this.handleGoogleJsapiLoad_, this));
  var moduleObject = {
    'modules': [
      {
        'name': 'picker',
        'version': '1',
        'callback': callbackName
      }
    ]
  };
  var moduleString = goog.json.serialize(moduleObject);
  var scriptEl = document.createElement("script");
  scriptEl.async = true;
  scriptEl.type = "text/javascript";
  scriptEl.src = "https://www.google.com/jsapi?autoload=" +
      encodeURIComponent(moduleString);
  document.body.appendChild(scriptEl);
};

pics3.GooglePickerClient.prototype.handleGoogleJsapiLoad_ = function() {
  this.logger_.info('handleGoogleJsapiLoad_');
  goog.asserts.assert(goog.getObjectByName('google.picker.PickerBuilder'));
  if (!this.loadDeferred_.hasFired()) {
    this.loadDeferred_.callback(null);
  }
};

/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 */
pics3.GooglePickerClient.PickerBuilder = function(appContext) {
  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {Object} */
  this.builder_ = pics3.util.createNamedObject('google.picker.PickerBuilder');
  this.init_();
};

/** @type {pics3.GooglePickerClient.Picker} */
pics3.GooglePickerClient.PickerBuilder.prototype.picker_;

pics3.GooglePickerClient.PickerBuilder.prototype.init_ = function() {
  this.builder_['enableFeature'](
      goog.getObjectByName('google.picker.Feature.MULTISELECT_ENABLED'));
  this.builder_['setAppId'](pics3.GoogleClient.GAPI_CLIENT_ID);
  this.builder_['setTitle'](pics3.GooglePickerClient.MSG_PICKER_TITLE);
  this.builder_['setCallback'](goog.bind(this.handleCallback_, this));

  var mimeTypes = goog.object.getValues(pics3.Photo.MimeType).join(',');

  var docsView = pics3.util.createNamedObject('google.picker.DocsView');
  docsView['setIncludeFolders'](true);
  docsView['setMimeTypes'](mimeTypes);
  this.builder_['addView'](docsView);

  var docsUploadView = pics3.util.createNamedObject(
      'google.picker.DocsUploadView');
  docsUploadView['setIncludeFolders'](true);
  docsUploadView['setMimeTypes'](mimeTypes);
  this.builder_['addView'](docsUploadView);
};

/** @param {Object} resultObject */
pics3.GooglePickerClient.PickerBuilder.prototype.handleCallback_ = function(
    resultObject) {
  goog.asserts.assert(resultObject);
  goog.asserts.assert(this.picker_);
  var result = new pics3.GooglePickerClient.PickerResult(this.appContext_,
      resultObject);
  this.picker_.dispatchEvent(result.createEvent());
};

pics3.GooglePickerClient.PickerBuilder.prototype.setOAuthToken = function(
    token) {
  this.builder_['setOAuthToken'](token);
  return this;
};

pics3.GooglePickerClient.PickerBuilder.prototype.build = function() {
  goog.asserts.assert(!this.picker_);
  this.picker_ = new pics3.GooglePickerClient.Picker(
      this.builder_['build']());
  return this.picker_;
};

/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.GooglePickerClient.Picker = function(pickerInstance) {
  goog.base(this);

  /** @type {Object} */
  this.picker_ = pickerInstance;
};
goog.inherits(pics3.GooglePickerClient.Picker, goog.events.EventTarget);

/** @enum {string} */
pics3.GooglePickerClient.Picker.EventType = {
  LOAD: goog.events.getUniqueId('load'),
  CANCEL: goog.events.getUniqueId('cancel'),
  PICK: goog.events.getUniqueId('pick')
};

pics3.GooglePickerClient.Picker.prototype.show = function() {
  this.picker_['setVisible'](true);
};

/**
 * @param {string} type
 * @param {!pics3.GooglePickerClient.PickerResult} result
 * @constructor
 * @extends {goog.events.Event}
 */
pics3.GooglePickerClient.PickerEvent = function(type, result) {
  goog.base(this, type);

  /** @type {pics3.GooglePickerClient.PickerResult} */
  this.result = result;
};
goog.inherits(pics3.GooglePickerClient.PickerEvent, goog.events.Event);

/**
 * @param {!Object} result
 * @constructor
 */
pics3.GooglePickerClient.PickerResult = function(appContext, result) {
  /** @type {pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!Object} */
  this.result_ = result;

  /** @type {Object} */
  this.responseEnum_ = goog.getObjectByName('google.picker.Response');

  /** @type {Object} */
  this.documentEnum_ = goog.getObjectByName('google.picker.Document');

  /** @type {string} */
  this.action_ = this.result_[this.responseEnum_['ACTION']];
};

/** @return {!Array.<!pics3.Photo>} */
pics3.GooglePickerClient.PickerResult.prototype.getPhotos = function() {
  goog.asserts.assert(this.action_ == 'picked');

  var documents = this.result_[this.responseEnum_['DOCUMENTS']];
  var photos = [];
  goog.array.forEach(documents, function(document) {
    var id = goog.asserts.assertString(document[this.documentEnum_['ID']]);
    var mimeType = goog.asserts.assertString(document[this.documentEnum_[
        'MIME_TYPE']]);
    var name = goog.asserts.assertString(document[this.documentEnum_['NAME']]);
    if (pics3.Photo.isSupportedMimeType(mimeType)) {
      var loader = new pics3.loader.GoogleDrivePhoto(this.appContext_, id,
          mimeType, name);
      photos.push(new pics3.Photo(loader));
    } else {
      this.logger_.warning('Unsupported MimeType picked: ' + mimeType);
    }
  }, this);
  return photos;
};

/** @return {!pics3.GooglePickerClient.PickerEvent} */
pics3.GooglePickerClient.PickerResult.prototype.createEvent = function() {
  var eventType;
  if (this.action_ == 'picked') {
    eventType = pics3.GooglePickerClient.Picker.EventType.PICK;
  } else if (this.action_ == 'loaded') {
    eventType = pics3.GooglePickerClient.Picker.EventType.LOAD;
  } else if (this.action_ == 'cancel') {
    eventType = pics3.GooglePickerClient.Picker.EventType.CANCEL;
  } else {
    goog.asserts.fail('Unexpected picker result action: ' + this.action_);
  }
  return new pics3.GooglePickerClient.PickerEvent(
      goog.asserts.assertString(eventType), this);
};
