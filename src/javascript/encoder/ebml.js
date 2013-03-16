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
goog.require('pics3.encoder.Asserter');
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
  goog.base(this, 'pics3.encoder.Ebml');
};
var Ebml = pics3.encoder.Ebml;
goog.inherits(Ebml, pics3.encoder.BaseEncoder);

/** @type {pics3.encoder.Asserter} */
Ebml.ASSERTER = new pics3.encoder.Asserter('pics3.encoder.Ebml');

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
  Ebml.ASSERTER.assert(value >= 0, 'Number must be >= 0');
  var parts = [];
  while (value > 0) {
    parts.push(value & 0xff);
    value = value >> 8;
  }
  return new Uint8Array(parts.reverse());
};

/**
 * @param {number} value Positive integer
 * @return {!Uint8Array}
 */
Ebml.encodeVint = function(value) {
  Ebml.ASSERTER.assert(value >= 0, 'Number must be >= 0');
  var zeroes = Math.ceil(Math.ceil(Math.log(value) / Math.log(2)) / 8);
  var valueString = value.toString(2);
  var padded = (new Array((zeroes * 7 + 7 + 1) - valueString.length)).
      join('0') + valueString;
  valueString = (new Array(zeroes)).join('0') + '1' + padded;
  return Ebml.encodeBinaryString(valueString);
};

/**
 * @param {number} value
 * @param {number=} opt_byteLength
 * @return {!Uint8Array}
 */
Ebml.encodeNumber = function(value, opt_byteLength) {
  Ebml.ASSERTER.assert(value >= 0, 'Number must be >= 0');
  var encoded = Ebml.encodeBinaryString(value.toString(2));
  if (!goog.isDefAndNotNull(opt_byteLength)) {
    return encoded;
  }
  Ebml.ASSERTER.assert(opt_byteLength >= encoded.length,
      'Buffer size must be greater than encoded size');
  var data = new Uint8Array(opt_byteLength);
  data.set(encoded, opt_byteLength - encoded.length);
  return data;
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

  /** @type {number} */
  this.uid = goog.getUid(this);
};

/** @return {!pics3.encoder.Ebml.EncodedNode} */
Ebml.Node.prototype.encode = goog.abstractMethod;

/**
 * @param {!pics3.encoder.Ebml.EncodedNode} encodedPayload
 * @return {!pics3.encoder.Ebml.EncodedNode}
 */
Ebml.Node.prototype.encodeIdSizeAndPayload = function(encodedPayload) {
  var idNode = new Ebml.EncodedLeafNode(Ebml.encodeId(this.id));

  var sizeNode = new Ebml.EncodedLeafNode(Ebml.encodeVint(
      encodedPayload.getByteLength()));

  return new Ebml.EncodedTrunkNode([idNode, sizeNode, encodedPayload],
      this.uid);
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
 * @param {number} id
 * @param {!pics3.encoder.Ebml.Node} refNode
 * @param {pics3.encoder.Ebml.Node=} opt_fromRefNode
 * @return {!pics3.encoder.Ebml.TrunkNode}
 */
Ebml.TrunkNode.prototype.addBytePositionRefNode = function(id, refNode,
    opt_fromRefNode) {
  return this.addChild(new Ebml.BytePositionRefNode(id, refNode,
      opt_fromRefNode));
}

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

/** @return {pics3.encoder.Ebml.Node} */
Ebml.TrunkNode.prototype.getFirstChild = function() {
  return this.children[0];
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

/**
 * @param {number} id
 * @param {!pics3.encoder.Ebml.Node} refNode
 * @param {pics3.encoder.Ebml.Node=} opt_fromRefNode
 * @constructor
 * @extends {pics3.encoder.Ebml.LeafNode}
 */
Ebml.BytePositionRefNode = function(id, refNode, opt_fromRefNode) {
  goog.base(this, id);

  /** @type {!pics3.encoder.Ebml.Node} */
  this.refNode = refNode;

  /** @type {pics3.encoder.Ebml.Node} */
  this.fromRefNode = opt_fromRefNode || null;
};
goog.inherits(Ebml.BytePositionRefNode, Ebml.LeafNode);

/** @override */
Ebml.BytePositionRefNode.prototype.encode = function() {
  var payloadNode = new Ebml.EncodedBytePositionRefNode(this.refNode.uid,
      this.fromRefNode ? this.fromRefNode.uid : undefined);
  return this.encodeIdSizeAndPayload(payloadNode);
};

/** @constructor */
Ebml.EncodedNode = function() {
};

/** @enum {number} */
Ebml.EncodedNode.OffsetPass = {
  FIRST: 1,
  SECOND: 2,
  THIRD: 3
};

/** @type {!Array.<Ebml.EncodedNode.OffsetPass>} */
Ebml.EncodedNode.OFFSET_PASSES_ = [
    Ebml.EncodedNode.OffsetPass.FIRST,
    Ebml.EncodedNode.OffsetPass.SECOND,
    Ebml.EncodedNode.OffsetPass.THIRD];

/**
 * @param {!Uint8Array} buffer
 * @param {number} offset
 * @return {number} The new offset
 */
Ebml.EncodedNode.prototype.writeToBuffer = function(buffer, offset) {
  var nodeMap = {};
  this.attachReferences(nodeMap, true);
  this.attachReferences(nodeMap, false);
  var offsetMap = {};
  goog.array.forEach(Ebml.EncodedNode.OFFSET_PASSES_, function(offsetPass) {
    this.calculateOffsets(offsetMap, offset, offsetPass);
  }, this);
  return this.writeToBufferInternal(buffer, offset);
};

/** @return {!Uint8Array} */
Ebml.EncodedNode.prototype.toUint8Array = function() {
  var outputArray = new Uint8Array(this.getByteLength());
  this.writeToBuffer(outputArray, 0);
  return outputArray;
};

/** @return {number} */
Ebml.EncodedNode.prototype.getByteLength = goog.abstractMethod;

/**
 * @param {Object} nodeMap
 * @param {boolean} firstPass
 */
Ebml.EncodedNode.prototype.attachReferences = goog.nullFunction;

/**
 * @param {Object} offsetMap
 * @param {number} offset
 * @param {!Ebml.EncodedNode.OffsetPass} offsetPass
 * @return {number} The new offset
 */
Ebml.EncodedNode.prototype.calculateOffsets = goog.abstractMethod;

/**
 * @param {!Uint8Array} buffer
 * @param {number} offset
 * @return {number} The new offset
 */
Ebml.EncodedNode.prototype.writeToBufferInternal = goog.abstractMethod;

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
Ebml.EncodedLeafNode.prototype.calculateOffsets = function(offsetMap, offset,
    offsetPass) {
  return offset + this.getByteLength();
};

/** @override */
Ebml.EncodedLeafNode.prototype.writeToBufferInternal = function(buffer, offset) {
  buffer.set(this.data, offset);
  return offset + this.data.length;
};

/**
 * @param {number} refUid
 * @param {number=} opt_fromRefUid
 * @constructor
 * @extends {pics3.encoder.Ebml.EncodedNode}
 */
Ebml.EncodedBytePositionRefNode = function(refUid, opt_fromRefUid) {
  goog.base(this);

  /** @type {number} */
  this.refUid = refUid;

  /** @type {?number} */
  this.fromRefUid = opt_fromRefUid || null;

  /** @type {Uint8Array} */
  this.data;
};
goog.inherits(Ebml.EncodedBytePositionRefNode, Ebml.EncodedNode);

/** @override */
Ebml.EncodedBytePositionRefNode.prototype.getByteLength = function() {
  return 4;
};

/** @override */
Ebml.EncodedBytePositionRefNode.prototype.attachReferences = function(nodeMap,
    firstPass) {
  if (!firstPass) {
    Ebml.ASSERTER.assert(!!nodeMap[this.refUid],
        'Expected to find encoded referenced node');
  }
};

/** @override */
Ebml.EncodedBytePositionRefNode.prototype.calculateOffsets = function(offsetMap,
    offset, offsetPass) {
  var refOffset = offsetMap[this.refUid];
  if (goog.isDefAndNotNull(refOffset)) {
    var fromRefOffset = this.fromRefUid ?
        offsetMap[this.fromRefUid] : null;
    if (goog.isDefAndNotNull(fromRefOffset)) {
      Ebml.ASSERTER.assert(refOffset >= fromRefOffset,
          'Referenced node should be after from node');
      refOffset -= fromRefOffset;
    }
    this.data = Ebml.encodeNumber(refOffset, 4);
  }
  return offset + this.getByteLength();
};

/** @override */
Ebml.EncodedBytePositionRefNode.prototype.writeToBufferInternal = function(
    buffer, offset) {
  Ebml.ASSERTER.assert(this.data && this.data.length > 0,
      'Expected referencing node to have a value');
  buffer.set(this.data, offset);
  return offset + this.data.length;
};

/**
 * @param {!Array.<!pics3.encoder.Ebml.EncodedNode>} children
 * @param {number=} opt_uid
 * @constructor
 * @extends {pics3.encoder.Ebml.EncodedNode}
 */
Ebml.EncodedTrunkNode = function(children, opt_uid) {
  goog.base(this);

  /** @type {!Array.<!pics3.encoder.Ebml.EncodedNode>} */
  this.children = children;

  /** @type {?number} */
  this.uid = opt_uid || null;
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
Ebml.EncodedTrunkNode.prototype.attachReferences = function(nodeMap,
    firstPass) {
  if (firstPass) {
    if (this.uid) {
      nodeMap[this.uid] = this;
    }
  }
  goog.array.forEach(this.children, function(child) {
    child.attachReferences(nodeMap, firstPass);
  });
};

/** @override */
Ebml.EncodedTrunkNode.prototype.calculateOffsets = function(offsetMap, offset,
    offsetPass) {
  if (this.uid) {
    offsetMap[this.uid] = offset;
  }
  goog.array.forEach(this.children, function(child) {
    offset = child.calculateOffsets(offsetMap, offset, offsetPass);
  });
  return offset;
};

/** @override */
Ebml.EncodedTrunkNode.prototype.writeToBufferInternal = function(buffer,
    offset) {
  goog.array.forEach(this.children, function(child) {
    offset = child.writeToBufferInternal(buffer, offset);
  });
  return offset;
};

});