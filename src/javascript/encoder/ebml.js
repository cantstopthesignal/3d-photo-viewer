// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.Ebml');

goog.require('goog.Disposable');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.async.DeferredList');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventType');
goog.require('pics3.encoder.BaseEncoder');
goog.require('pics3.parser.DataReader');
goog.require('pics3.parser.DataUrl');
goog.require('pics3.parser.util');


goog.scope(function() {

/**
 * @constructor
 * @extends {pics3.encoder.BaseEncoder}
 */
pics3.encoder.Ebml = function() {
  goog.base(this, 'pics3.parser.Ebml');
};
var Ebml = pics3.encoder.Ebml;
goog.inherits(Ebml, pics3.encoder.BaseEncoder);

/** @enum {number} */
Ebml.TagId = {
  EBML: 0x1a45dfa3,
  EBML_VERSION: 0x4286,
  EBML_READ_VERSION: 0x42f7,
  EBML_MAX_ID_LENGTH: 0x42f2,
  EBML_MAX_SIZE_LENGTH: 0x42f3,
  DOC_TYPE: 0x4282,
  DOC_TYPE_VERSION: 0x4287,
  DOC_TYPE_READ_VERSION: 0x4285
};

// TODO: this doesn't seem to match the VINT encoding scheme of EBML
/**
 * @param {number} value Positive integer
 * @return {!Uint8Array}
 */
Ebml.encodeId = function(value) {
  if (value < 0) {
    throw pics3.encoder.encodeError.newError(
        'Ebml.encodeNumber: Number less than zero');
  }
  var parts = [];
  while (value > 0) {
    parts.push(value & 0xff);
    value = value >> 8;
  }
  return new Uint8Array(parts.reverse());
};

/**
 * @param {number} value
 * @return {!Uint8Array}
 */
Ebml.encodeNumber = function(value) {
  return Ebml.encodeBinaryString(value.toString(2));
};

/**
 * @param {string} value
 * @return {!Uint8Array}
 */
Ebml.encodeString = function(value) {
  var array = new Uint8Array(value.length);
  for(var i = 0; i < value.length; i++) {
    array[i] = value.charCodeAt(i);
  }
  return array;
};

/**
 * @param {number} value
 * @return {!Uint8Array}
 */
Ebml.encodeDouble = function(value) {
  var array = new Uint8Array(new Float64Array([value]).buffer);
  Array.prototype.reverse.call(array);
  return array;
};

// TODO: this doesn't seem to match the encoding scheme of EBML well
/**
 * @param {string} bits Binary encoded string
 * @return {!Uint8Array}
 */
Ebml.encodeBinaryString = function(bits) {
  var data = [];
  var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).
      join('0') : '';
  bits = pad + bits;
  for (var i = 0; i < bits.length; i+= 8) {
    data.push(parseInt(bits.substr(i, 8), 2));
  }
  return new Uint8Array(data);
};

/** @type {!goog.debug.Logger} */
Ebml.prototype.logger_ = goog.debug.Logger.getLogger('pics3.encoder.Ebml');

/**
 * @param {!pics3.encoder.Ebml.Node|!Array.<!pics3.encoder.Ebml.Node>}
 *     nodeOrArray
 * @return {!Uint8Array}
 */
Ebml.prototype.encode = function(nodeOrArray) {
  var nodes = (nodeOrArray instanceof Ebml.Node) ? [nodeOrArray] : nodeOrArray;
  var encodedNodes = goog.array.map(nodes, function(node) {
    return node.encode();
  });
  var rootNode = new Ebml.EncodedTrunkNode(encodedNodes);
  var byteLength = rootNode.getByteLength();
  var outputArray = new Uint8Array(byteLength);
  rootNode.writeToBuffer(outputArray, 0);
  return outputArray;
};

/**
 * @param {number} id
 * @constructor
 */
Ebml.Node = function(id) {
  /** @type {number} */
  this.id = id;
};

/** @return {!pics3.encoder.Ebml.EncodedNode} */
Ebml.Node.prototype.encode = goog.abstractMethod;

/**
 * @param {!pics3.encoder.Ebml.EncodedNode} encodedPayload
 * @return {!pics3.encoder.Ebml.EncodedNode}
 */
Ebml.Node.prototype.encodeIdSizeAndPayload = function(encodedPayload) {
  var idNode = new Ebml.EncodedLeafNode(Ebml.encodeId(this.id));

  // TODO: This could be cleaned up
  var payloadSize = encodedPayload.getByteLength();
  var zeroes = Math.ceil(Math.ceil(Math.log(payloadSize) / Math.log(2)) / 8);
  var payloadSizeString = payloadSize.toString(2);
  var padded = (new Array((zeroes * 7 + 7 + 1) - payloadSizeString.length)).
      join('0') + payloadSizeString;
  payloadSizeString = (new Array(zeroes)).join('0') + '1' + padded;
  var sizeNode = new Ebml.EncodedLeafNode(Ebml.encodeBinaryString(
      payloadSizeString));

  return new Ebml.EncodedTrunkNode([idNode, sizeNode, encodedPayload]);
};

/**
 * @param {number} id
 * @constructor
 * @extends {pics3.encoder.Ebml.Node}
 */
Ebml.TrunkNode = function(id) {
  goog.base(this, id);

  /** @type {!Array.<pics3.encoder.Ebml.Node>} */
  this.children = [];
};
goog.inherits(Ebml.TrunkNode, Ebml.Node);

/** @override */
Ebml.TrunkNode.prototype.encode = function() {
  var encodedChildren = goog.array.map(this.children, function(child) {
    return child.encode();
  });
  var payloadNode = new Ebml.EncodedTrunkNode(encodedChildren);
  return this.encodeIdSizeAndPayload(payloadNode);
};

/**
 * @param {number} id
 * @param {number} value
 * @return {!pics3.encoder.Ebml.TrunkNode}
 */
Ebml.TrunkNode.prototype.addIntegerNode = function(id, value) {
  return this.addChild(new Ebml.IntegerNode(id, value));
};

/**
 * @param {number} id
 * @param {string} value
 * @return {!pics3.encoder.Ebml.TrunkNode}
 */
Ebml.TrunkNode.prototype.addStringNode = function(id, value) {
  return this.addChild(new Ebml.StringNode(id, value));
};

/**
 * @param {number} id
 * @param {number} value
 * @return {!pics3.encoder.Ebml.TrunkNode}
 */
Ebml.TrunkNode.prototype.addDoubleNode = function(id, value) {
  return this.addChild(new Ebml.DoubleNode(id, value));
};

/**
 * @param {pics3.encoder.Ebml.Node} node
 * @return {!pics3.encoder.Ebml.TrunkNode}
 */
Ebml.TrunkNode.prototype.addChild = function(node) {
  this.children.push(node);
  return this;
};

/**
 * @param {!Array.<!pics3.encoder.Ebml.Node>} nodes
 * @return {!pics3.encoder.Ebml.TrunkNode}
 */
Ebml.TrunkNode.prototype.addChildren = function(nodes) {
  goog.array.extend(this.children, nodes);
  return this;
};

/**
 * @param {number} id
 * @constructor
 * @extends {pics3.encoder.Ebml.Node}
 */
Ebml.LeafNode = function(id) {
  goog.base(this, id);
};
goog.inherits(Ebml.LeafNode, Ebml.Node);

/**
 * @param {number} id
 * @param {number} value
 * @constructor
 * @extends {pics3.encoder.Ebml.LeafNode}
 */
Ebml.IntegerNode = function(id, value) {
  goog.base(this, id);

  /** @type {number} */
  this.value = value;
};
goog.inherits(Ebml.IntegerNode, Ebml.LeafNode);

/** @override */
Ebml.IntegerNode.prototype.encode = function() {
  var payloadNode = new Ebml.EncodedLeafNode(Ebml.encodeNumber(this.value));
  return this.encodeIdSizeAndPayload(payloadNode);
};

/**
 * @param {number} id
 * @param {string} value
 * @constructor
 * @extends {pics3.encoder.Ebml.LeafNode}
 */
Ebml.StringNode = function(id, value) {
  goog.base(this, id);

  /** @type {string} */
  this.value = value;
};
goog.inherits(Ebml.StringNode, Ebml.LeafNode);

/** @override */
Ebml.StringNode.prototype.encode = function() {
  var payloadNode = new Ebml.EncodedLeafNode(Ebml.encodeString(this.value));
  return this.encodeIdSizeAndPayload(payloadNode);
};

/**
 * @param {number} id
 * @param {number} value
 * @constructor
 * @extends {pics3.encoder.Ebml.LeafNode}
 */
Ebml.DoubleNode = function(id, value) {
  goog.base(this, id);

  /** @type {number} */
  this.value = value;
};
goog.inherits(Ebml.DoubleNode, Ebml.LeafNode);

/** @override */
Ebml.DoubleNode.prototype.encode = function() {
  var payloadNode = new Ebml.EncodedLeafNode(Ebml.encodeDouble(this.value));
  return this.encodeIdSizeAndPayload(payloadNode);
};

/**
 * @param {number} id
 * @param {!Uint8Array} data
 * @constructor
 * @extends {pics3.encoder.Ebml.LeafNode}
 */
Ebml.DataNode = function(id, data) {
  goog.base(this, id);

  /** @type {!Uint8Array} */
  this.data = data;
};
goog.inherits(Ebml.DataNode, Ebml.LeafNode);

/** @override */
Ebml.DataNode.prototype.encode = function() {
  var payloadNode = new Ebml.EncodedLeafNode(this.data);
  return this.encodeIdSizeAndPayload(payloadNode);
};

/** @constructor */
Ebml.EncodedNode = function() {
};

/** @return {number} */
Ebml.EncodedNode.prototype.getByteLength = goog.abstractMethod;

/**
 * @param {!Uint8Array} buffer
 * @param {number} offset
 * @return {number} The new offset
 */
Ebml.EncodedNode.prototype.writeToBuffer = goog.abstractMethod;

/** @return {!Uint8Array} */
Ebml.EncodedNode.prototype.toUint8Array = function() {
  var outputArray = new Uint8Array(this.getByteLength());
  this.writeToBuffer(outputArray, 0);
  return outputArray;
};

/**
 * @param {!Uint8Array} data
 * @constructor
 * @extends {pics3.encoder.Ebml.EncodedNode}
 */
Ebml.EncodedLeafNode = function(data) {
  goog.base(this);

  /** @type {!Uint8Array} */
  this.data = data;
};
goog.inherits(Ebml.EncodedLeafNode, Ebml.EncodedNode);

/** @override */
Ebml.EncodedLeafNode.prototype.getByteLength = function() {
  return this.data.length;
};

/** @override */
Ebml.EncodedLeafNode.prototype.writeToBuffer = function(buffer, offset) {
  buffer.set(this.data, offset);
  return offset + this.data.length;
};

/**
 * @param {!Array.<!pics3.encoder.Ebml.EncodedNode>} children
 * @constructor
 * @extends {pics3.encoder.Ebml.EncodedNode}
 */
Ebml.EncodedTrunkNode = function(children) {
  goog.base(this);

  /** @type {!Array.<!pics3.encoder.Ebml.EncodedNode>} */
  this.children = children;
};
goog.inherits(Ebml.EncodedTrunkNode, Ebml.EncodedNode);

/** @override */
Ebml.EncodedTrunkNode.prototype.getByteLength = function() {
  return /** @type {number} */ (goog.array.reduce(this.children,
      function(sum, child) {
        return sum + child.getByteLength();
      }, 0));
};

/** @override */
Ebml.EncodedTrunkNode.prototype.writeToBuffer = function(buffer, offset) {
  goog.array.forEach(this.children, function(child) {
    offset = child.writeToBuffer(buffer, offset);
  });
  return offset;
};

});