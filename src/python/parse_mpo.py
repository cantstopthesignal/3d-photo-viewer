#!/usr/bin/python

import sys, os, re, struct

def Usage():
  print "Usage: ./parse_mpo.py <mpo-file>"
  sys.exit(1)

if len(sys.argv) != 2:
  Usage()

mpo_filename = sys.argv[1]

mpo_file = open(mpo_filename, 'r')
data = mpo_file.read()
print "File size: %d" % len(data)

def BytesToFriendlyString(byte_str):
  lines = []
  out = []
  for byte in byte_str:
    rep = '%x' % ord(byte)
    if len(rep) == 1:
      rep = ' ' + rep
    out.append(rep)
  lines.append(' '.join(out))
  out = []
  for byte in byte_str:
    rep = ('%r' % byte)[1:-1]
    if rep.startswith('\\x'):
      rep = rep[2:]
    if len(rep) == 1:
      rep = ' ' + rep
    out.append(rep)
  lines.append(' '.join(out))
  return '\n'.join(lines)

def DumpBytes(byte_str):
  print BytesToFriendlyString(byte_str)

START_OF_IMAGE = '\xff\xd8'
END_OF_IMAGE = '\xff\xd9'
APP1_MARKER = '\xff\xe1'
APP2_MARKER = '\xff\xe2'
JPEG_START_OF_SCAN = '\xff\xda'
EXIF_FORMAT_IDENTIFIER = 'Exif\x00\x00'
BIG_ENDIAN_TAG = '\4d\4d\00\2a'
LITTLE_ENDIAN_TAG = '\x49\x49\x2a\x00'
MP_FORMAT_IDENTIFIER = 'MPF\x00'
MP_IMAGE_DATA_FORMAT_JPEG = 0
MP_TYPE_CODE_DISPARITY = '\x02\x00\x02'

def IsAppMarker(byte_str):
  assert len(byte_str) == 2
  if byte_str[0] != '\xff':
    return False
  return byte_str[1] >= '\xe0' and byte_str[1] <= '\xef'

def IsJpegMarker(byte_str):
  assert len(byte_str) == 2
  if byte_str[0] != '\xff':
    return False
  if byte_str[1] == '\xdb':
    return True # Define quantization table
  if byte_str[1] == '\xdd':
    return True # Define restart interval
  if byte_str[1] == '\xc0':
    return True # Start of frame
  if byte_str[1] == '\xc4':
    return True # Define huffman table
  if byte_str[1] == '\xda':
    return True # Start of scan
  return False

def AssertBytesEqual(a, b):
  if not a == b:
    raise Exception("Expected byte strings to be equivalent, but:\n"
        + BytesToFriendlyString(a) + '\n != \n'
        + BytesToFriendlyString(b))

def Assert(b, msg, bytes=None):
  if not b:
    if bytes:
      msg = msg + '\n' + BytesToFriendlyString(bytes)
    raise Exception(msg)

def AssertEquals(a, b, msg=None):
  if a != b:
    if msg:
      msg = msg + ": "
    else:
      msg = ''
    msg = msg + 'Expected %r but was %r' % (a, b)
    raise Exception(msg)

def BytesToShortBig(byte_str):
  assert len(byte_str) == 2
  return struct.unpack('>H', byte_str)[0]

def BytesToShortLittle(byte_str):
  assert len(byte_str) == 2
  return struct.unpack('<H', byte_str)[0]

def BytesToShort(byte_str, is_big_endian):
  if is_big_endian:
    return BytesToShortBig(byte_str)
  else:
    return BytesToShortLittle(byte_str)

def BytesToIntBig(byte_str):
  assert len(byte_str) == 4
  return struct.unpack('>I', byte_str)[0]

def BytesToIntLittle(byte_str):
  assert len(byte_str) == 4
  return struct.unpack('<I', byte_str)[0]

def BytesToInt(byte_str, is_big_endian):
  if is_big_endian:
    return BytesToIntBig(byte_str)
  else:
    return BytesToIntLittle(byte_str)

def BytesToSRational(byte_str, is_big_endian):
  assert len(byte_str) == 8
  numer = BytesToInt(byte_str[:4], is_big_endian)
  denom = BytesToInt(byte_str[4:8], is_big_endian)
  return (numer, denom)

def BytesToByte(byte_str):
  assert len(byte_str) == 1
  return ord(byte_str)

class ImageParser:
  def __init__(self, data):
    self.data = data
    self.offset = 0
    self.mp_endian_offset = 0
    self.image_sizes = []
    self.image_offsets = []

  def ReadBytes(self, num_bytes, peek=False):
    Assert(num_bytes >= 0, 'Cannot read %d bytes' % num_bytes)
    byte_str = self.data[self.offset:self.offset + num_bytes]
    if len(byte_str) < num_bytes:
      raise Exception("Tried to read %d bytes but only %d available"
          % (num_bytes, len(byte_str)))
    if not peek:
      self.offset += num_bytes
    return byte_str

  def PeekBytes(self, num_bytes):
    return self.ReadBytes(num_bytes, True)

  def ReadAppSection(self, marker):
    AssertBytesEqual(marker, self.ReadBytes(2))
    section_length = BytesToShortBig(self.ReadBytes(2))
    Assert(section_length >= 2, "App length should be at least 2 bytes")
    section_remaining = section_length - 2
    print "APP-OTHER %r" % marker
    print "APP-OTHER LENGTH", section_length
    self.ReadBytes(section_remaining)

  def ParseExifIndexTag(self, data, exif_is_big_endian):
    Assert(len(data) == 12, 'EXIF Index tags should be 12 bytes')
    tag_id = BytesToShort(data[:2], exif_is_big_endian)
    tag_type = BytesToShort(data[2:4], exif_is_big_endian)
    count = BytesToInt(data[4:8], exif_is_big_endian)
    payload = data[8:12]
    return (tag_id, tag_type, count, payload)

  def ReadApp1Section(self, marker):
    AssertBytesEqual(marker, self.ReadBytes(2))
    section_length = BytesToShortBig(self.ReadBytes(2))
    Assert(section_length >= 2, "App1 length should be at least 2 bytes")
    section_remaining = section_length - 2
    print "APP1 %r" % marker
    print "APP1 LENGTH", section_length
    print "APP1 Section remaining: %d" % section_remaining
    format_identifier = self.ReadBytes(6)
    section_remaining -= 6
    if format_identifier == EXIF_FORMAT_IDENTIFIER:
      print "APP1 is Exif"
      exif_endian_offset = self.offset
      exif_endian = self.ReadBytes(4)
      Assert(exif_endian == LITTLE_ENDIAN_TAG or exif_endian == BIG_ENDIAN_TAG,
          'Expected valid endian marker', exif_endian)
      exif_is_big_endian = exif_endian == BIG_ENDIAN_TAG
      section_remaining -= 4
      exif_offset = 4
      exif_offset_to_first_ifd = BytesToInt(self.ReadBytes(4), exif_is_big_endian)
      section_remaining -= 4
      exif_offset += 4
      Assert(exif_offset_to_first_ifd == 8, 'First IFD offset should be 8')
      AssertEquals(exif_offset, exif_offset_to_first_ifd)
      while True:
        count = BytesToShort(self.ReadBytes(2), exif_is_big_endian)
        Assert(count > 0 and count <= 9999, 'Expected at most 9999 IFD rows')
        print "EXIF IFD COUNT", count
        exif_offset += 2
        section_remaining -= 2

        exif_ifd_offset = None
        for c in xrange(count):
          exif_index_tag_data = self.ParseExifIndexTag(
              self.ReadBytes(12), exif_is_big_endian)
          exif_offset += 12
          section_remaining -= 12
          if exif_index_tag_data[0] == 34665:
            # Pointer to Exif IFD
            AssertEquals((34665, 4, 1), exif_index_tag_data[:3])
            exif_ifd_offset = BytesToInt(exif_index_tag_data[3], exif_is_big_endian)
          else:
            print "Unparsed ExifIndexTag: %d" % exif_index_tag_data[0]
        exif_offset_to_next_ifd = BytesToInt(self.ReadBytes(4), exif_is_big_endian)
        print 'exif_offset_to_next_ifd', exif_offset_to_next_ifd
        exif_offset += 4
        section_remaining -= 4
        if exif_ifd_offset is not None:
          print "Exif IFD"
          Assert(exif_ifd_offset >= exif_offset, 'Expected exif ifd to be upcoming')
          jump_distance = exif_ifd_offset - exif_offset
          Assert(jump_distance < section_remaining, 'Expected exif ifd to be within section')
          self.offset += jump_distance
          exif_offset += jump_distance
          section_remaining -= jump_distance
          count = BytesToShort(self.ReadBytes(2), exif_is_big_endian)
          Assert(count > 0 and count <= 9999, 'Expected at most 9999 IFD rows')
          print "EXIF2 IFD COUNT", count
          exif_offset += 2
          section_remaining -= 2
          makernote_offset = None
          makernote_count = None
          for c in xrange(count):
            exif_index_tag_data = self.ParseExifIndexTag(
                self.ReadBytes(12), exif_is_big_endian)
            exif_offset += 12
            section_remaining -= 12
            if exif_index_tag_data[0] == 37500:
              # Makernote
              AssertEquals((37500, 7), exif_index_tag_data[:2])
              makernote_count = exif_index_tag_data[2]
              makernote_offset = BytesToInt(exif_index_tag_data[3], exif_is_big_endian)
              print "MAKERNOTE %d" % makernote_offset
            else:
              print "Unparsed Exif2IndexTag: %d" % exif_index_tag_data[0]
          if makernote_offset:
            Assert(makernote_offset >= exif_offset, 'Expected makernote to be upcoming')
            Assert(makernote_count <= section_remaining, 'Makernote too long')
            jump_distance = makernote_offset - exif_offset
            Assert(jump_distance < section_remaining, 'Expected makernote to be within section')
            self.offset += jump_distance
            exif_offset += jump_distance
            section_remaining -= jump_distance
            maker_remaining = makernote_count
            print "In makernote"
            if self.PeekBytes(min(maker_remaining, 8)) == 'FUJIFILM':
              print "Fujifilm makernote"
              Assert(maker_remaining >= 14, 'At least 14 bytes required')
              self.ReadBytes(8)  # FUJIFILM
              exif_offset += 8
              section_remaining -= 8
              maker_remaining -= 8
              maker_offset = 8
              maker_ifd_offset = BytesToIntLittle(self.ReadBytes(4))
              exif_offset += 4
              section_remaining -= 4
              maker_remaining -= 4
              maker_offset += 4
              AssertEquals(maker_offset, maker_ifd_offset)
              # May have to skip in the future
              count = BytesToShortLittle(self.ReadBytes(2))
              Assert(count > 0 and count <= 9999, 'Expected at most 9999 IFD rows')
              print "MAKER IFD COUNT", count
              exif_offset += 2
              section_remaining -= 2
              maker_remaining -= 2
              maker_offset += 2
              parallax_offset = None
              for c in xrange(count):
                exif_index_tag_data = self.ParseExifIndexTag(
                    self.ReadBytes(12), False)
                exif_offset += 12
                section_remaining -= 12
                maker_remaining -= 12
                maker_offset += 12
                if exif_index_tag_data[0] == 45585:
                  # Parallax
                  AssertEquals((45585, 10, 1), exif_index_tag_data[:3])
                  parallax_offset = BytesToIntLittle(exif_index_tag_data[3])
                else:
                  print "Unparsed MakerIndexTag: %d" % exif_index_tag_data[0]
              if parallax_offset:
                Assert(parallax_offset >= maker_offset, 'Expected parallax to be upcoming')
                jump_distance = parallax_offset - maker_offset
                Assert(jump_distance < maker_remaining, 'Expected parallax to be within section')
                self.offset += jump_distance
                exif_offset += jump_distance
                maker_offset += jump_distance
                section_remaining -= jump_distance
                maker_remaining = makernote_count
                numer, denom = BytesToSRational(self.ReadBytes(8), False)
                exif_offset += 8
                section_remaining -= 8
                maker_remaining -= 8
                maker_offset += 8
                print "Parallax %f" % (numer * 1.0 / denom)
            else:
              print "Unknown makernote"
        if not exif_offset_to_next_ifd:
          break
        Assert(exif_offset_to_next_ifd >= exif_offset, 'Expected exif next ifd to be upcoming')
        jump_distance = exif_offset_to_next_ifd - exif_offset
        Assert(jump_distance < section_remaining, 'Expected exif next ifd to be within section')
        self.offset += jump_distance
        exif_offset += jump_distance
        section_remaining -= jump_distance
    self.ReadBytes(section_remaining)

  def ParseMpIndexTag(self, data, mp_is_big_endian):
    Assert(len(data) == 12, 'MP Index tags should be 12 bytes')
    tag_id = BytesToShort(data[:2], mp_is_big_endian)
    Assert(tag_id >= 45056 and tag_id <= 45060, 'Unexpected mp index tag')
    tag_type = BytesToShort(data[2:4], mp_is_big_endian)
    count = BytesToInt(data[4:8], mp_is_big_endian)
    payload = data[8:12]
    return (tag_id, tag_type, count, payload)

  def ParseMpEntryValue(self, data, mp_is_big_endian):
    Assert(len(data) == 16, 'MP Entry Value should be 16 bytes')
    attrib = data[:4]
    if not mp_is_big_endian:
      attrib = attrib[::-1]
    attrib_byte1 = attrib[0]
    dependent_parent_image_flag = (ord(attrib_byte1) & (1 << 7)) != 0
    dependent_child_image_flag = (ord(attrib_byte1) & (1 << 6)) != 0
    representative_image_flag = (ord(attrib_byte1) & (1 << 5)) != 0
    image_data_format = ord(attrib_byte1) & 0x7
    type_code = attrib[1:4]
    image_size = BytesToInt(data[4:8], mp_is_big_endian)
    image_data_offset = BytesToInt(data[8:12], mp_is_big_endian)
    return (image_data_format, type_code, image_size, image_data_offset)

  def ReadApp2Section(self, marker):
    AssertBytesEqual(marker, self.ReadBytes(2))
    section_length = BytesToShortBig(self.ReadBytes(2))
    section_remaining = section_length - 2
    Assert(section_length >= 2, "App length should be at least 2 bytes")
    print "APP2 %r" % marker
    print "APP2 LENGTH", section_length
    format_identifier = self.ReadBytes(4)
    section_remaining -= 4
    if format_identifier == MP_FORMAT_IDENTIFIER:
      print "APP2 is MP"
      self.mp_endian_offset = self.offset
      mp_endian = self.ReadBytes(4)
      Assert(mp_endian == LITTLE_ENDIAN_TAG or mp_endian == BIG_ENDIAN_TAG,
          'Expected valid endian marker', mp_endian)
      mp_is_big_endian = mp_endian == BIG_ENDIAN_TAG
      section_remaining -= 4
      mp_offset = 4
      mp_offset_to_first_ifd = BytesToInt(self.ReadBytes(4), mp_is_big_endian)
      section_remaining -= 4
      mp_offset += 4
      Assert(mp_offset_to_first_ifd == 8, 'First IFD offset should be 8')
      AssertEquals(mp_offset, mp_offset_to_first_ifd)
      while True:
        count = BytesToShort(self.ReadBytes(2), mp_is_big_endian)
        Assert(count > 0 and count <= 5, 'Expected at most 5 IFD rows')
        print "MP Index IFD COUNT", count
        mp_offset += 2
        section_remaining -= 2

        image_count = 0
        version_found = False
        mp_entry_tag_offset = 0
        for c in xrange(count):
          mp_index_tag_data = self.ParseMpIndexTag(
              self.ReadBytes(12), mp_is_big_endian)
          mp_offset += 12
          section_remaining -= 12
          if mp_index_tag_data[0] == 45056:
            # Version data
            AssertEquals((45056, 7, 4, '0100'), mp_index_tag_data)
            version_found = True
          elif mp_index_tag_data[0] == 45057:
            # Number of Images
            AssertEquals((45057, 4, 1), mp_index_tag_data[:3])
            image_count = BytesToInt(mp_index_tag_data[3], mp_is_big_endian)
          elif mp_index_tag_data[0] == 45058:
            # MP Entry tag
            AssertEquals((45058, 7, 16 * image_count), mp_index_tag_data[:3])
            mp_entry_tag_offset = BytesToInt(mp_index_tag_data[3], mp_is_big_endian)
          else:
            print "Unparsed MPIndexTag: %d" % mp_index_tag_data[0]
        Assert(version_found, 'Expected MPIndex Version to be found')
        Assert(mp_entry_tag_offset != 0, 'Expected MPIndex Entry Tag to be found')
        AssertEquals(image_count, 2, 'Expected stereoscopic image')

        mp_offset_to_next_ifd = BytesToInt(self.ReadBytes(4), mp_is_big_endian)
        print 'mp_offset_to_next_ifd', mp_offset_to_next_ifd
        mp_offset += 4
        section_remaining -= 4

        # TODO: Should jump directly to entry offset instead of assuming it follows.
        AssertEquals(mp_offset, mp_entry_tag_offset)
        AssertEquals(self.offset, self.mp_endian_offset + mp_entry_tag_offset)

        for i in xrange(image_count):
          mp_entry_value_data = self.ParseMpEntryValue(
              self.ReadBytes(16), mp_is_big_endian)
          mp_offset += 16
          section_remaining -= 16
          AssertEquals((MP_IMAGE_DATA_FORMAT_JPEG, MP_TYPE_CODE_DISPARITY),
              mp_entry_value_data[:2])
          image_size = mp_entry_value_data[2]
          image_data_offset = mp_entry_value_data[3]
          self.image_sizes.append(image_size)
          if i == 0:
            AssertEquals(0, image_data_offset, 'First image data offset should be null')
            self.image_offsets.append(0)
          else:
            self.image_offsets.append(image_data_offset + self.mp_endian_offset)

        AssertEquals(mp_offset_to_next_ifd, mp_offset,
            'next IFD must be at current point')
        Assert(mp_offset_to_next_ifd - mp_offset < section_remaining,
            'Not enough bytes in current section to reach offset')
        break # Could parse MP Index Attribute block
    print "APP2 Section remaining: %d" % section_remaining
    self.ReadBytes(section_remaining)

  def ReadJpegSection(self, marker):
    Assert(JPEG_START_OF_SCAN != marker,
        'ReadJpegSection cannot be used with START_OF_SCAN')
    AssertBytesEqual(marker, self.ReadBytes(2))
    section_length = BytesToShortBig(self.ReadBytes(2))
    Assert(section_length >= 2,
        "Jpeg section length should be at least 2 bytes")
    print "JPEG %r" % marker
    print "JPEG SECTION LENGTH", section_length
    return marker + self.ReadBytes(section_length - 2)

  def ReadJpegScanSection(self, marker):
    AssertBytesEqual(marker, JPEG_START_OF_SCAN)
    AssertBytesEqual(marker, self.ReadBytes(2))
    header_length = BytesToShortBig(self.ReadBytes(2))
    Assert(header_length >= 2,
        "Header length should be at least 2 bytes")
    print "JPEG SOS %r" % marker
    print "JPEG SOS HEADER LENGTH", header_length
    header = marker
    num_components_bytes = self.ReadBytes(1)
    header += num_components_bytes
    num_components = BytesToByte(num_components_bytes)
    print "NUM COMP", num_components
    Assert(num_components <= 4, "Expected at most 4 components in scan section")
    for i in xrange(num_components):
      component_sel = self.ReadBytes(1)
      header += component_sel
      table_sel = self.ReadBytes(1)
      header += table_sel
    print len(header), header_length
    assert len(header) == header_length
    header = marker + self.ReadBytes(header_length - 2)
    DumpBytes(header)

  def Parse(self):
    start_of_image = self.ReadBytes(2)
    AssertBytesEqual(start_of_image, START_OF_IMAGE)
    while True:
      possible_app_marker = self.PeekBytes(2)
      if not IsAppMarker(possible_app_marker):
        break
      if possible_app_marker == APP2_MARKER:
        self.ReadApp2Section(possible_app_marker)
      elif possible_app_marker == APP1_MARKER:
        self.ReadApp1Section(possible_app_marker)
      else:
        self.ReadAppSection(possible_app_marker)
    AssertEquals(2, len(self.image_sizes))
    AssertEquals(2, len(self.image_offsets))
    AssertEquals(0, self.image_offsets[0])
    AssertEquals(self.image_sizes[0], self.image_offsets[1])
    # Against spec, image sizes should not include SOI/EOI
    AssertEquals(len(self.data), self.image_sizes[0] + self.image_sizes[1])
    for i in xrange(len(self.image_offsets)):
      self.offset = self.image_offsets[i]
      start_of_image = self.ReadBytes(2)
      AssertBytesEqual(start_of_image, START_OF_IMAGE)
    for i in xrange(1, len(self.image_offsets)):
      self.offset = self.image_offsets[i]
      start_of_image = self.ReadBytes(2)
      AssertBytesEqual(start_of_image, START_OF_IMAGE)
      while True:
        possible_app_marker = self.PeekBytes(2)
        if not IsAppMarker(possible_app_marker):
          break
        if possible_app_marker == APP1_MARKER:
          print "Image[%d] APP1" % i
          self.ReadApp1Section(possible_app_marker)
        else:
          print "Image[%d] APP OTHER" % i
          self.ReadAppSection(possible_app_marker)
    for i in xrange(len(self.image_offsets)):
      out_file = open('/tmp/image%d.jpg' % i, 'w')
      if i + 1 < len(self.image_offsets):
        next_image_start = self.image_offsets[i+1]
      else:
        next_image_start = len(data)
      image_data = data[self.image_offsets[i]:next_image_start]
      out_file.write(image_data)
      if not image_data[-2:] == END_OF_IMAGE:
        print "Image %d missing EOI" % i
        out_file.write(END_OF_IMAGE)
      out_file.close()
    
    
    

parser = ImageParser(data)
parser.Parse()

#
