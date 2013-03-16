#!/usr/bin/python

import sys, os

def Usage():
  print "Usage: ./wrap_js_string.py line_prefix <input_file>"
  sys.exit(1)

if len(sys.argv) != 3:
  Usage()

line_prefix = sys.argv[1]
in_filename = sys.argv[2]
if not os.path.exists(in_filename):
  Usage()

f = open(in_filename, 'r')

data = line_prefix + "['" + f.read().strip() + "'].join('');"

f.close()

first_line = True

while data:
  if first_line:
    data_len = 78
  else:
    data_len = 78 - 5
  line = data[:data_len]
  data = data[data_len:]
  if not first_line:
    line = "    '" + line
  if data:
    line = line + "',"
  print line
  first_line = False
