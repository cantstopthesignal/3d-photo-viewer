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
<html>
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
    <div class="footer">
      Contact by
      <a href="mailto:cantstopthesignals@gmail.com">Email</a> or
      <a target="_blank" href="http://www.reddit.com/user/CantStopTheSignal/">Reddit</a>
      &nbsp;
      <a target="_blank" href="https://github.com/cantstopthesignal/3d-photo-viewer">Project source</a>
    </div>
  </body>
</html>
