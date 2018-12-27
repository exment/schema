/**
 * Copyright (c) 2018 Endel Dreyer
 * Copyright (c) 2014 Ion Drive Software Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE
 */

/**
 * msgpack implementation highly based on notepack.io
 * https://github.com/darrachequesne/notepack
 */

export interface Iterator { offset: number; }

function utf8Read(bytes, offset, length) {
  var string = '', chr = 0;
  for (var i = offset, end = offset + length; i < end; i++) {
    var byte = bytes[i];
    if ((byte & 0x80) === 0x00) {
      string += String.fromCharCode(byte);
      continue;
    }
    if ((byte & 0xe0) === 0xc0) {
      string += String.fromCharCode(
        ((byte & 0x1f) << 6) |
        (bytes[++i] & 0x3f)
      );
      continue;
    }
    if ((byte & 0xf0) === 0xe0) {
      string += String.fromCharCode(
        ((byte & 0x0f) << 12) |
        ((bytes[++i] & 0x3f) << 6) |
        ((bytes[++i] & 0x3f) << 0)
      );
      continue;
    }
    if ((byte & 0xf8) === 0xf0) {
      chr = ((byte & 0x07) << 18) |
        ((bytes[++i] & 0x3f) << 12) |
        ((bytes[++i] & 0x3f) << 6) |
        ((bytes[++i] & 0x3f) << 0);
      if (chr >= 0x010000) { // surrogate pair
        chr -= 0x010000;
        string += String.fromCharCode((chr >>> 10) + 0xD800, (chr & 0x3FF) + 0xDC00);
      } else {
        string += String.fromCharCode(chr);
      }
      continue;
    }
    throw new Error('Invalid byte ' + byte.toString(16));
  }
  return string;
}


function _str (bytes, it: Iterator, length: number) {
  var value = utf8Read(bytes, it.offset, length);
  it.offset += length;
  return value;
};

export function string (bytes, it: Iterator) {
  const prefix = bytes[it.offset++];
  return _str(bytes, it, prefix & 0x1f);
}

export function stringCheck(bytes, it: Iterator) {
  const prefix = bytes[it.offset];
  return (
    // fixstr
    (prefix < 0xc0 && prefix > 0xa0) ||
    // str 8
    prefix === 0xd9 ||
    // str 16
    prefix === 0xda ||
    // str 32
    prefix === 0xdb
  );
}

export function int (bytes, it: Iterator) {
  return decode(bytes, it);
};

export function intCheck (bytes, it: Iterator) {
  const prefix = bytes[it.offset];
  // positive fixint - 0x00 - 0x7f
  // float 32        - 0xca
  // float 64        - 0xcb
  // uint 8          - 0xcc
  // uint 16         - 0xcd
  // uint 32         - 0xce
  // uint 64         - 0xcf
  // int 8           - 0xd0
  // int 16          - 0xd1
  // int 32          - 0xd2
  // int 64          - 0xd3
  return (
    prefix < 0x80 ||
    (prefix >= 0xca && prefix <= 0xd3)
  );
}

export function decode(bytes, it: Iterator) {
  const prefix = bytes[it.offset++];
  var value, length = 0, type = 0, hi = 0, lo = 0;

  if (prefix < 0xc0) {
    // positive fixint
    if (prefix < 0x80) {
      return prefix;
    }
    // fixmap
    if (prefix < 0x90) {
      return this._map(prefix & 0x0f);
    }
    // fixarray
    if (prefix < 0xa0) {
      return this._array(prefix & 0x0f);
    }
    // fixstr
    return _str(bytes, it, prefix & 0x1f);
  }

  // negative fixint
  if (prefix > 0xdf) {
    return (0xff - prefix + 1) * -1;
  }

  switch (prefix) {
    // nil
    case 0xc0:
      return null;
    // false
    case 0xc2:
      return false;
    // true
    case 0xc3:
      return true;

    // bin
    case 0xc4:
      length = bytes[it.offset];
      it.offset += 1;
      return this._bin(length);
    case 0xc5:
      length = bytes[it.offset];
      it.offset += 2;
      return this._bin(length);
    case 0xc6:
      length = bytes[it.offset];
      it.offset += 4;
      return this._bin(length);

    // ext
    case 0xc7:
      length = bytes[it.offset];
      type = bytes[it.offset + 1];
      it.offset += 2;
      return [type, this._bin(length)];
    case 0xc8:
      length = bytes[it.offset];
      type = bytes[it.offset + 2];
      it.offset += 3;
      return [type, this._bin(length)];
    case 0xc9:
      length = bytes[it.offset];
      type = bytes[it.offset + 4];
      it.offset += 5;
      return [type, this._bin(length)];

    // float
    case 0xca:
      value = bytes[it.offset];
      it.offset += 4;
      return value;
    case 0xcb:
      value = bytes[it.offset];
      it.offset += 8;
      return value;

    // uint
    case 0xcc:
      value = bytes[it.offset];
      it.offset += 1;
      return value;
    case 0xcd:
      value = bytes[it.offset];
      it.offset += 2;
      return value;
    case 0xce:
      value = bytes[it.offset];
      it.offset += 4;
      return value;
    case 0xcf:
      hi = bytes[it.offset] * Math.pow(2, 32);
      lo = bytes[it.offset + 4];
      it.offset += 8;
      return hi + lo;

    // int
    case 0xd0:
      value = bytes[it.offset];
      it.offset += 1;
      return value;
    case 0xd1:
      value = bytes[it.offset];
      it.offset += 2;
      return value;
    case 0xd2:
      value = bytes[it.offset];
      it.offset += 4;
      return value;
    case 0xd3:
      hi = bytes[it.offset] * Math.pow(2, 32);
      lo = bytes[it.offset + 4];
      it.offset += 8;
      return hi + lo;

    // fixext
    case 0xd4:
      type = bytes[it.offset];
      it.offset += 1;
      if (type === 0x00) {
        it.offset += 1;
        return void 0;
      }
      return [type, this._bin(1)];
    case 0xd5:
      type = bytes[it.offset];
      it.offset += 1;
      return [type, this._bin(2)];
    case 0xd6:
      type = bytes[it.offset];
      it.offset += 1;
      return [type, this._bin(4)];
    case 0xd7:
      type = bytes[it.offset];
      it.offset += 1;
      if (type === 0x00) {
        hi = bytes[it.offset] * Math.pow(2, 32);
        lo = bytes[it.offset + 4];
        it.offset += 8;
        return new Date(hi + lo);
      }
      return [type, this._bin(8)];
    case 0xd8:
      type = bytes[it.offset];
      it.offset += 1;
      return [type, this._bin(16)];

    // str
    case 0xd9:
      length = bytes[it.offset];
      it.offset += 1;
      return this._str(length);
    case 0xda:
      length = bytes[it.offset];
      it.offset += 2;
      return this._str(length);
    case 0xdb:
      length = bytes[it.offset];
      it.offset += 4;
      return this._str(length);

    // array
    case 0xdc:
      length = bytes[it.offset];
      it.offset += 2;
      return this._array(length);
    case 0xdd:
      length = bytes[it.offset];
      it.offset += 4;
      return this._array(length);

    // map
    case 0xde:
      length = bytes[it.offset];
      it.offset += 2;
      return this._map(length);
    case 0xdf:
      length = bytes[it.offset];
      it.offset += 4;
      return this._map(length);
  }

  throw new Error('Could not parse');
}