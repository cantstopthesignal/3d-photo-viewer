// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.testing.webmTestUtil');


/**
 * Draw a 150x150 sized clock image to a canvas element.
 * @param {Object} canvasCtx
 * @param {number} time Time in milliseconds.
 */
pics3.encoder.testing.webmTestUtil.renderClock = function(canvasCtx, time) {
  var now = new Date();
  now.setTime(time);
  canvasCtx.save();
  canvasCtx.fillStyle = 'white';
  canvasCtx.fillRect(0, 0, 150, 150); // Transparency not supported.
  canvasCtx.translate(75, 75);
  canvasCtx.scale(0.4, 0.4);
  canvasCtx.rotate(-Math.PI / 2);
  canvasCtx.strokeStyle = "black";
  canvasCtx.fillStyle = "white";
  canvasCtx.lineWidth = 8;
  canvasCtx.lineCap = "round";

  // Hour marks
  canvasCtx.save();
  for (var i = 0; i < 12; i++) {
    canvasCtx.beginPath();
    canvasCtx.rotate(Math.PI / 6);
    canvasCtx.moveTo(100, 0);
    canvasCtx.lineTo(120, 0);
    canvasCtx.stroke();
  }
  canvasCtx.restore();

  // Minute marks
  canvasCtx.save();
  canvasCtx.lineWidth = 5;
  for (i = 0; i < 60; i++) {
    if (i % 5 != 0) {
      canvasCtx.beginPath();
      canvasCtx.moveTo(117, 0);
      canvasCtx.lineTo(120, 0);
      canvasCtx.stroke();
    }
    canvasCtx.rotate(Math.PI / 30);
  }
  canvasCtx.restore();

  var sec = now.getSeconds();
  var min = now.getMinutes();
  var hr  = now.getHours();
  hr = hr >= 12 ? hr - 12 : hr;

  canvasCtx.fillStyle = "black";

  // Write hours
  canvasCtx.save();
  canvasCtx.rotate(hr * (Math.PI / 6) + (Math.PI / 360) * min +
      (Math.PI / 21600) * sec);
  canvasCtx.lineWidth = 14;
  canvasCtx.beginPath();
  canvasCtx.moveTo(-20, 0);
  canvasCtx.lineTo(80, 0);
  canvasCtx.stroke();
  canvasCtx.restore();

  // Write minutes
  canvasCtx.save();
  canvasCtx.rotate((Math.PI / 30) * min + (Math.PI / 1800) * sec )
  canvasCtx.lineWidth = 10;
  canvasCtx.beginPath();
  canvasCtx.moveTo(-28, 0);
  canvasCtx.lineTo(112, 0);
  canvasCtx.stroke();
  canvasCtx.restore();

  // Write seconds
  canvasCtx.save();
  canvasCtx.rotate(sec * Math.PI / 30);
  canvasCtx.strokeStyle = "#D40000";
  canvasCtx.fillStyle = "#D40000";
  canvasCtx.lineWidth = 6;
  canvasCtx.beginPath();
  canvasCtx.moveTo(-30, 0);
  canvasCtx.lineTo(83, 0);
  canvasCtx.stroke();
  canvasCtx.beginPath();
  canvasCtx.arc(0, 0, 10, 0, Math.PI * 2, true);
  canvasCtx.fill();
  canvasCtx.beginPath();
  canvasCtx.arc(95, 0, 10, 0, Math.PI * 2, true);
  canvasCtx.stroke();
  canvasCtx.fillStyle = "#555";
  canvasCtx.arc(0, 0, 3, 0, Math.PI * 2, true);
  canvasCtx.fill();
  canvasCtx.restore();

  canvasCtx.beginPath();
  canvasCtx.lineWidth = 14;
  canvasCtx.strokeStyle = '#325FA2';
  canvasCtx.arc(0, 0, 142, 0, Math.PI * 2, true);
  canvasCtx.stroke();

  canvasCtx.restore();
};

/**
 * Draw a 150x150 sized 3d scene sample
 * @param {Object} canvasCtx
 * @param {number} frameIndex
 * @param {boolean} isLeftImage
 */
pics3.encoder.testing.webmTestUtil.render3dSample = function(canvasCtx,
    frameIndex, isLeftImage) {
  canvasCtx.save();
  canvasCtx.fillStyle = 'white';
  canvasCtx.fillRect(0, 0, 150, 150); // Transparency not supported.
  canvasCtx.strokeStyle = "black";
  canvasCtx.lineCap = "round";

  // Checkerboard
  canvasCtx.save();
  canvasCtx.fillStyle = '#bbb';
  for (var x = 0; x < 10; x++) {
    for (var y = 0; y < 10; y++) {
      if ((x + y) % 2 == 0) {
        continue;
      }
      canvasCtx.fillRect(x * 15, y * 15, 15, 15);
    }
  }
  canvasCtx.restore();

  // Triangle
  canvasCtx.save();
  canvasCtx.fillStyle = '#a00';
  var xOffset = Math.round(5 * (Math.sin((frameIndex - 5) /
      10 * Math.PI) + 1)) * (isLeftImage ? 1 : -1);
  var sizeOffset = Math.round(Math.abs(xOffset) / 2);
  canvasCtx.translate(75 + xOffset, 75);
  canvasCtx.beginPath();
  canvasCtx.moveTo(0, -45 - sizeOffset);
  canvasCtx.lineTo(45 + sizeOffset, 45 + sizeOffset);
  canvasCtx.lineTo(-45 - sizeOffset, 45 + sizeOffset);
  canvasCtx.fill();

  canvasCtx.restore();

  canvasCtx.restore();
};
