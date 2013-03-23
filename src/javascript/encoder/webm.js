// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.Webm');

goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.debug.Logger');
goog.require('pics3.encoder.Asserter');
goog.require('pics3.encoder.BaseEncoder');
goog.require('pics3.encoder.Ebml');
goog.require('pics3.parser.DataReader');
goog.require('pics3.parser.DataUrl');
goog.require('pics3.parser.util');
goog.require('pics3.VideoMimeType');


goog.scope(function() {

var Ebml = pics3.encoder.Ebml;

/**
 * @constructor
 * @extends {pics3.encoder.BaseEncoder}
 */
pics3.encoder.Webm = function() {
  goog.base(this, 'pics3.encoder.Webm');

  /** @type {Error} */
  this.error_;

  /** @type {!Array.<!pics3.encoder.Webm.Frame>} */
  this.frames_ = [];

  /** @type {Uint8Array} */
  this.output_;
};
var Webm = pics3.encoder.Webm;
goog.inherits(Webm, pics3.encoder.BaseEncoder);

/** @type {pics3.encoder.Asserter} */
Webm.ASSERTER = new pics3.encoder.Asserter('pics3.encoder.Webm');

/** @type {!Array.<number>} */
Webm.VP8_FRAME_MARKER = [0x9d, 0x01, 0x2a];

/** @enum {number} */
Webm.EbmlTagId = {
  SEGMENT: 0x18538067,
  SEGMENT_INFO: 0x1549a966,
  TIMECODE_SCALE: 0x2ad7b1,
  MUXING_APP: 0x4d80,
  WRITING_APP: 0x5741,
  DURATION: 0x4489,
  TRACKS: 0x1654ae6b,
  TRACK_ENTRY: 0xae,
  TRACK_NUMBER: 0xd7,
  TRACK_UID: 0x73c5,
  TRACK_FLAG_LACING: 0x9c,
  TRACK_LANGUAGE: 0x22b59c,
  TRACK_CODEC_ID: 0x86,
  TRACK_CODEC_NAME: 0x258688,
  TRACK_TYPE: 0x83,
  TRACK_VIDEO: 0xe0,
  TRACK_VIDEO_PIXEL_WIDTH: 0xb0,
  TRACK_VIDEO_PIXEL_HEIGHT: 0xba,
  TRACK_VIDEO_STEREO_MODE: 0x53b8,
  CLUSTER: 0x1f43b675,
  CLUSTER_TIMECODE: 0xe7,
  CLUSTER_FRAME_BLOCK: 0xa3,
  SEEK_HEAD: 0x114d9b74,
  SEEK_ENTRY: 0x4dbb,
  SEEK_ID: 0x53ab,
  SEEK_POSITION: 0x53ac,
  CUES: 0x1c53bb6b,
  CUE_POINT: 0xbb,
  CUE_TIME: 0xb3,
  CUE_TRACK_POSITIONS: 0xb7,
  CUE_TRACK: 0xf7,
  CUE_CLUSTER_POSITION: 0xf1,
  CUE_RELATIVE_POSITION: 0xf0
};

/** @enum {number} */
Webm.MkvStereoMode = {
  MONO: 0,
  SIDE_BY_SIDE: 1
};

/**
 * Max duration by cluster in milliseconds
 * @type {number}
 */
Webm.CLUSTER_MAX_DURATION = 30000;

/** @type {!goog.debug.Logger} */
Webm.prototype.logger_ = goog.debug.Logger.getLogger('pics3.encoder.Webm');

/** @param {!pics3.encoder.Webm.Frame} frame */
Webm.prototype.addFrame = function(frame) {
  this.frames_.push(frame);
};

/** @return {!Uint8Array} */
Webm.prototype.getOutput = function() {
  return goog.asserts.assertObject(this.output_);
};

/** @return {!Blob} */
Webm.prototype.getOutputAsBlob = function() {
  goog.asserts.assert(this.output_ instanceof Uint8Array);
  return new Blob([this.output_], {type: pics3.VideoMimeType.WEBM});
};

/**
 * @param {!pics3.encoder.Webp.Image} image
 * @param {boolean=} opt_throwErrors
 * @return {boolean}
 */
Webm.prototype.encode = function(image, opt_throwErrors) {
  this.frames_ = [];
  this.addFrame(Webm.Frame.newFrame(image, 1000));
  return this.compile(opt_throwErrors);
};

/**
 * @param {boolean=} opt_throwErrors
 * @return {boolean}
 */
Webm.prototype.compile = function(opt_throwErrors) {
  var startTime = goog.now();
  if (opt_throwErrors) {
    this.compileInternal();
  } else {
    try {
      this.compileInternal();
    } catch (e) {
      if (!pics3.encoder.encodeError.is(e)) {
        throw e;
      }
      this.error_ = e;
      return false;
    }
  }
  this.logger_.fine('Encoded in ' + (goog.now() - startTime) + 'ms');
  return true;
};

/** @return {Error} */
Webm.prototype.getError = function() {
  return this.error_;
};

Webm.prototype.compileInternal = function() {
  var videoInfo = this.validateFrames_();
  this.parseWebpImages_();
  this.encodeEbml_(videoInfo);
};

/** @return {pics3.encoder.Webm.VideoInfo_} */
Webm.prototype.validateFrames_ = function() {
  this.assert(this.frames_.length, 'At least one frame expected');
  var videoInfo = new Webm.VideoInfo_(this.frames_[0].image.width,
      this.frames_[0].image.height, this.frames_[0].isStereoSideBySide,
      this.frames_.length);
  for (var i = 0; i < this.frames_.length; i++) {
    var frame = this.frames_[i];
    this.assertEquals(videoInfo.width, frame.image.width,
        'All Frames should have the same width');
    this.assertEquals(videoInfo.height, frame.image.height,
        'All Frames should have the same height');
    this.assertEquals(videoInfo.isStereoSideBySide,
        frame.isStereoSideBySide,
        'Expected stereoscope consistency across frames');
    this.assert(frame.duration > 0, 'Expected a positive frame duration');
    videoInfo.duration += frame.duration;
  }
  return videoInfo;
};

Webm.prototype.parseWebpImages_ = function() {
  this.webpFrames_ = [];
  for (var i = 0; i < this.frames_.length; i++) {
    var frame = this.frames_[i];
    frame.parsedImage = this.parseWebpImage_(frame.image);
  }
};

/** @param {!pics3.encoder.Webp.Image} image */
Webm.prototype.parseWebpImage_ = function(image) {
  var dataReader = this.getVp8DataReader_(image);
  var vp8Tag = dataReader.readString(4);
  this.assertEquals('VP8 ', vp8Tag, 'VP8 tag expected');

  // Unknown skipped 4 bytes of data
  dataReader.skip(4);

  var vp8Data = dataReader.subReader().getUint8Array();

  // Skip three byte frame header
  dataReader.skip(3);

  this.assertArraysEqual(Webm.VP8_FRAME_MARKER, dataReader.readBytes(3),
      'Expected frame marker');
  var widthData = dataReader.readUint16();
  var width = widthData & 0x3FFF;
  var horizontalScale = widthData >> 14;
  this.assertEquals(0, horizontalScale, 'Expected no horizontal scale');
  var heightData = dataReader.readUint16();
  var height = heightData & 0x3FFF;
  var verticalScale = heightData >> 14;
  this.assertEquals(0, verticalScale, 'Expected no vertical scale');
  this.assertEquals(image.width, width, 'Expected webp image size to match');
  this.assertEquals(image.height, height, 'Expected webp image size to match');
  return new Webm.ParsedWebp_(width, height, vp8Data);
};

/**
 * @param {!pics3.encoder.Webp.Image} image
 * @return {!pics3.parser.DataReader}
 */
Webm.prototype.getVp8DataReader_ = function(image) {
  var imageData = image.dataUrl.toArrayBuffer();
  var dataReader = new pics3.parser.DataReader(imageData);
  var riffId = dataReader.readString(4);
  this.assertEquals('RIFF', riffId, 'RIFF tag expected');
  var riffLen = dataReader.readUint32();
  this.assertEquals(riffLen, dataReader.getBytesRemaining(),
      'Riff length expected to be full webp file');
  var webpId = dataReader.readString(4);
  this.assertEquals('WEBP', webpId, 'WEBP tag expected');
  return dataReader;
};

/** @param {pics3.encoder.Webm.VideoInfo_} videoInfo */
Webm.prototype.encodeEbml_ = function(videoInfo) {
  var headerNode = new Ebml.TrunkNode(Ebml.TagId.EBML).
      addIntegerNode(Ebml.TagId.EBML_VERSION, 1).
      addIntegerNode(Ebml.TagId.EBML_READ_VERSION, 1).
      addIntegerNode(Ebml.TagId.EBML_MAX_ID_LENGTH, 4).
      addIntegerNode(Ebml.TagId.EBML_MAX_SIZE_LENGTH, 8).
      addStringNode(Ebml.TagId.DOC_TYPE, "webm").
      addIntegerNode(Ebml.TagId.DOC_TYPE_VERSION, 2).
      addIntegerNode(Ebml.TagId.DOC_TYPE_READ_VERSION, 2);

  var segmentNode = new Ebml.TrunkNode(Webm.EbmlTagId.SEGMENT);

  var seekHeadNode = new Ebml.TrunkNode(Webm.EbmlTagId.SEEK_HEAD);
  segmentNode.addChild(seekHeadNode);

  var segmentInfoNode = new Ebml.TrunkNode(Webm.EbmlTagId.SEGMENT_INFO).
      addIntegerNode(Webm.EbmlTagId.TIMECODE_SCALE, 1e6).  // Milliseconds
      addStringNode(Webm.EbmlTagId.MUXING_APP, "pics3").
      addStringNode(Webm.EbmlTagId.WRITING_APP, "pics3").
      addDoubleNode(Webm.EbmlTagId.DURATION, videoInfo.duration);
  segmentNode.addChild(segmentInfoNode);
  seekHeadNode.addChild(new Ebml.TrunkNode(Webm.EbmlTagId.SEEK_ENTRY).
      addIntegerNode(Webm.EbmlTagId.SEEK_ID, Webm.EbmlTagId.SEGMENT_INFO).
      addBytePositionRefNode(Webm.EbmlTagId.SEEK_POSITION, segmentInfoNode,
          segmentNode.getFirstChild()));

  var tracksNode = new Ebml.TrunkNode(Webm.EbmlTagId.TRACKS);
  segmentNode.addChild(tracksNode);
  seekHeadNode.addChild(new Ebml.TrunkNode(Webm.EbmlTagId.SEEK_ENTRY).
      addIntegerNode(Webm.EbmlTagId.SEEK_ID, Webm.EbmlTagId.TRACKS).
      addBytePositionRefNode(Webm.EbmlTagId.SEEK_POSITION, tracksNode,
          segmentNode.getFirstChild()));

  var trackEntryNode = new Ebml.TrunkNode(Webm.EbmlTagId.TRACK_ENTRY).
      addIntegerNode(Webm.EbmlTagId.TRACK_NUMBER, 1).
      addIntegerNode(Webm.EbmlTagId.TRACK_UID, 1).
      addIntegerNode(Webm.EbmlTagId.TRACK_FLAG_LACING, 0).
      addStringNode(Webm.EbmlTagId.TRACK_LANGUAGE, "und").
      addStringNode(Webm.EbmlTagId.TRACK_CODEC_ID, "V_VP8").
      addStringNode(Webm.EbmlTagId.TRACK_CODEC_NAME, "VP8").
      addIntegerNode(Webm.EbmlTagId.TRACK_TYPE, 1);
  tracksNode.addChild(trackEntryNode);

  var videoWidth = videoInfo.isStereoSideBySide ?
      Math.floor(videoInfo.width / 2) : videoInfo.width;
  var trackEntryVideoNode = new Ebml.TrunkNode(Webm.EbmlTagId.TRACK_VIDEO).
      addIntegerNode(Webm.EbmlTagId.TRACK_VIDEO_PIXEL_WIDTH, videoWidth).
      addIntegerNode(Webm.EbmlTagId.TRACK_VIDEO_PIXEL_HEIGHT, videoInfo.height);
  if (videoInfo.isStereoSideBySide) {
    trackEntryVideoNode.addIntegerNode(Webm.EbmlTagId.TRACK_VIDEO_STEREO_MODE,
        Webm.MkvStereoMode.SIDE_BY_SIDE);
  }
  trackEntryNode.addChild(trackEntryVideoNode);

  var clusterResult = this.encodeClusters_(segmentNode.getFirstChild());

  goog.array.forEach(clusterResult.clusterNodes, function(clusterNode) {
    segmentNode.addChild(clusterNode);
    seekHeadNode.addChild(new Ebml.TrunkNode(Webm.EbmlTagId.SEEK_ENTRY).
        addIntegerNode(Webm.EbmlTagId.SEEK_ID, Webm.EbmlTagId.CLUSTER).
        addBytePositionRefNode(Webm.EbmlTagId.SEEK_POSITION, clusterNode,
            segmentNode.getFirstChild()));
  });

  var cuesNode = new Ebml.TrunkNode(Webm.EbmlTagId.CUES);
  segmentNode.addChild(cuesNode);
  seekHeadNode.addChild(new Ebml.TrunkNode(Webm.EbmlTagId.SEEK_ENTRY).
      addIntegerNode(Webm.EbmlTagId.SEEK_ID, Webm.EbmlTagId.CUES).
      addBytePositionRefNode(Webm.EbmlTagId.SEEK_POSITION, cuesNode,
          segmentNode.getFirstChild()));
  goog.array.forEach(clusterResult.cuePointNodes, function(cuePointNode) {
    cuesNode.addChild(cuePointNode);
  });

  this.output_ = new Ebml().encode([headerNode, segmentNode]);
};

/** @return {!pics3.encoder.Webm.EncodeClusterResult_} */
Webm.prototype.encodeClusters_ = function(segmentFirstChild) {
  var result = new Webm.EncodeClusterResult_();
  var frameIdx = 0;
  var clusterTimecode = 0;
  while (frameIdx < this.frames_.length) {
    var cluster = new Ebml.TrunkNode(Webm.EbmlTagId.CLUSTER).
        addIntegerNode(Webm.EbmlTagId.CLUSTER_TIMECODE, clusterTimecode);

    var clusterDuration = 0;
    while (clusterDuration < Webm.CLUSTER_MAX_DURATION &&
        frameIdx < this.frames_.length) {
      var frame = this.frames_[frameIdx];
      var timecode = clusterDuration;
      var frameBlockInfo = new Webm.FrameBlockInfo_(timecode);
      var vp8Data = frame.parsedImage.vp8Data;
      var frameBlock = this.encodeFrameBlock_(frameBlockInfo, vp8Data);
      cluster.addChild(frameBlock);

      var cuePointNode = new Ebml.TrunkNode(Webm.EbmlTagId.CUE_POINT).
          addIntegerNode(Webm.EbmlTagId.CUE_TIME, timecode);
      var cueTrackPositionsNode = new Ebml.TrunkNode(
          Webm.EbmlTagId.CUE_TRACK_POSITIONS).
          addIntegerNode(Webm.EbmlTagId.CUE_TRACK, 1);
      cuePointNode.addChild(cueTrackPositionsNode);

      cueTrackPositionsNode. addBytePositionRefNode(
          Webm.EbmlTagId.CUE_CLUSTER_POSITION, cluster, segmentFirstChild);
      result.cuePointNodes.push(cuePointNode);

      clusterDuration += frame.duration;
      frameIdx++;
    }
    result.clusterNodes.push(cluster);
  }
  return result;
};

/**
 * @param {!pics3.encoder.Webm.FrameBlockInfo_} info
 * @param {!Uint8Array} vp8Data
 * @return {!pics3.encoder.Ebml.Node}
 */
Webm.prototype.encodeFrameBlock_ = function(info, vp8Data) {
  var dataArray = [];

  this.assert(info.trackNum < 128, 'No more than 127 tracks supported');
  dataArray.push(info.trackNum | 0x80);

  dataArray.push(info.timecode >> 8);
  dataArray.push(info.timecode & 0xff);

  var flags = 0;
  if (info.keyFrame) {
    flags |= 128;
  }
  if (info.invisible) {
    flags |= 8;
  }
  if (info.lacing) {
    flags |= (info.lacing << 1);
  }
  if (info.discardable) {
    flags |= 1;
  }
  dataArray.push(flags);

  var mergedDataArray = new Uint8Array(dataArray.length + vp8Data.byteLength);
  mergedDataArray.set(dataArray, 0);
  mergedDataArray.set(vp8Data, dataArray.length);

  return new Ebml.DataNode(Webm.EbmlTagId.CLUSTER_FRAME_BLOCK, mergedDataArray);
};

/** @override */
Webm.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
  delete this.frames_;
  delete this.output_;
};

/**
 * @param {!pics3.encoder.Webp.Image} image
 * @param {number} duration
 * @constructor
 */
Webm.Frame = function(image, duration) {
  /** @type {number} */
  this.duration = duration;

  /** @type {!pics3.encoder.Webp.Image} */
  this.image = image;

  /** @type {!pics3.encoder.Webm.ParsedWebp_} */
  this.parsedImage;

  /** @type {boolean} */
  this.isStereoSideBySide = false;
};

/**
 * @param {!pics3.encoder.Webp.Image} image
 * @param {number} duration
 */
Webm.Frame.newFrame = function(image, duration) {
  return new Webm.Frame(image, duration);
};

/** @param {boolean} isStereoSideBySide */
Webm.Frame.prototype.setStereoSideBySide = function(isStereoSideBySide) {
  this.isStereoSideBySide = isStereoSideBySide;
};

/**
 * @param {number} width
 * @param {number} height
 * @param {!Uint8Array} vp8Data
 * @constructor
 */
Webm.ParsedWebp_ = function(width, height, vp8Data) {
  /** @type {number} */
  this.width = width;

  /** @type {number} */
  this.height = height;

  /** @type {!Uint8Array} */
  this.vp8Data = vp8Data;
};

/** @constructor */
Webm.VideoInfo_ = function(width, height, isStereoSideBySide, frameCount) {
  /** @type {number} */
  this.width = width;

  /** @type {number} */
  this.height = height;

  /** @type {boolean} */
  this.isStereoSideBySide = isStereoSideBySide;

  /** @type {number} */
  this.duration = 0;

  /** @type {number} */
  this.frameCount = frameCount;
};

/** @constructor */
Webm.FrameBlockInfo_ = function(timecode) {
  /** @type {number} */
  this.discardable = 0;

  /** @type {number} */
  this.invisible = 0;

  /** @type {number} */
  this.keyFrame = 1;

  /** @type {number} */
  this.lacing = 0;

  /** @type {number} */
  this.trackNum = 1;

  /** @type {number} */
  this.timecode = Math.round(timecode);
};

/** @constructor */
Webm.EncodeClusterResult_ = function() {
  /** @type {!Array.<!pics3.encoder.Ebml.TrunkNode>} */
  this.clusterNodes = [];

  /** @type {!Array.<!pics3.encoder.Ebml.TrunkNode>} */
  this.cuePointNodes = [];
};

});