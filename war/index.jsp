<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="com.cantstopthesignals.JsMode" %>
<%@ page import="com.google.appengine.api.users.User" %>
<%@ page import="com.google.appengine.api.users.UserService" %>
<%@ page import="com.google.appengine.api.users.UserServiceFactory" %>
<%
  JsMode jsMode = JsMode.fromString(request.getParameter("jsmode"));
  if (jsMode == null) {
    jsMode = JsMode.OPTIMIZED;
  }
%>

<!DOCTYPE html>
<!-- Copyright 2012 cantstopthesignals@gmail.com -->
<html itemscope itemtype="http://schema.org/Product">
  <head>
    <title>3D Photo Viewer</title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <%
      if (jsMode == JsMode.UNCOMPILED) {
        %>
        <script type="text/javascript" src="debug/lib/closure-library/closure/goog/base.js"></script>
        <script type="text/javascript" src="debug/src/javascript/deps.js"></script>
        <script type="text/javascript">
          goog.require('pics3.main');
        </script>
        <%
      } else {
        %>
        <script type="text/javascript" src="js/main<%= jsMode.getName() %>.js"></script>
        <%
      }
    %>
    <script type="text/javascript">
      var pics3 = pics3 || {};
      pics3.jsMode = '<%= jsMode.getName() %>';
    </script>
    <link rel="stylesheet" type="text/css" href="/css/main.css" />
    <script type="text/javascript">
      var _gaq = _gaq || [];
      _gaq.push(['_setAccount', 'UA-36376514-1']);
      _gaq.push(['_trackPageview']);
      (function() {
        var ga = document.createElement('script');
        ga.type = 'text/javascript';
        ga.async = true;
        ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') +
            '.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ga, s);
      })();
    </script>
  </head>
  <body class="main">
    <div class="app"></div>
    <div class="about-content">
      <h1>
        <img itemprop="image" src="/images/logo64.png" class="logo">
        <span itemprop="name">3D Photo Viewer</span>
      </h1>
      <p itemprop="description">
        View 3D photos stored in Google Drive, Google+ Photos, or on your
        computer.
      </p>
      <p>Contact:
        <ul>
          <li>
            Email: <a href="mailto:cantstopthesignals@gmail.com">cantstopthesignals@gmail.com</a>
          </li>
          <li>
            Reddit: <a target="_blank" href="http://www.reddit.com/user/CantStopTheSignal/">CantStopTheSignal</a>
          </li>
        </ul>
      </p>
      <p>Coming Soon!:
        <ul>
          <li>
            More 3D viewing modes: Nvidia 3D Vision, red/green anaglyph, split
            screen
          </li>
        </ul>
      <p>
        <a target="_blank" href="https://github.com/cantstopthesignal/3d-photo-viewer">Project source</a>
      </p>
    </div>
  </body>
</html>
