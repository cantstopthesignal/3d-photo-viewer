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
  </head>
  <body class="main">
    <div class="app"></div>
  </body>
</html>
