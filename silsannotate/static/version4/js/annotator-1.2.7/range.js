var Range,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

Range = {};

Range.sniff = function(r) {
  if (r.commonAncestorContainer != null) {
    return new Range.BrowserRange(r);
  } else if (typeof r.start === "string") {
    return new Range.SerializedRange(r);
  } else if (r.start && typeof r.start === "object") {
    return new Range.NormalizedRange(r);
  } else {
    console.error(_t("Could not sniff range type"));
    return false;
  }
};

Range.nodeFromXPath = function(xpath, root) {
  var customResolver, evaluateXPath, namespace, node, segment;
  if (root == null) root = document;
  evaluateXPath = function(xp, nsResolver) {
    if (nsResolver == null) nsResolver = null;
    return document.evaluate('.' + xp, root, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  };
  if (!$.isXMLDoc(document.documentElement)) {
    return evaluateXPath(xpath);
  } else {
    customResolver = document.createNSResolver(document.ownerDocument === null ? document.documentElement : document.ownerDocument.documentElement);
    node = evaluateXPath(xpath, customResolver);
    if (!node) {
      xpath = ((function() {
        var _i, _len, _ref, _results;
        _ref = xpath.split('/');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          segment = _ref[_i];
          if (segment && segment.indexOf(':') === -1) {
            _results.push(segment.replace(/^([a-z]+)/, 'xhtml:$1'));
          } else {
            _results.push(segment);
          }
        }
        return _results;
      })()).join('/');
      namespace = document.lookupNamespaceURI(null);
      customResolver = function(ns) {
        if (ns === 'xhtml') {
          return namespace;
        } else {
          return document.documentElement.getAttribute('xmlns:' + ns);
        }
      };
      node = evaluateXPath(xpath, customResolver);
    }
    return node;
  }
};

Range.RangeError = (function(_super) {

  __extends(RangeError, _super);

  function RangeError(type, message, parent) {
    this.type = type;
    this.message = message;
    this.parent = parent != null ? parent : null;
    RangeError.__super__.constructor.call(this, this.message);
  }

  return RangeError;

})(Error);

Range.BrowserRange = (function() {

  function BrowserRange(obj) {
    this.commonAncestorContainer = obj.commonAncestorContainer;
    this.startContainer = obj.startContainer;
    this.startOffset = obj.startOffset;
    this.endContainer = obj.endContainer;
    this.endOffset = obj.endOffset;
  }

  BrowserRange.prototype.normalize = function(root) {
    var it, node, nr, offset, p, r, _i, _len, _ref;
    if (this.tainted) {
      console.error(_t("You may only call normalize() once on a BrowserRange!"));
      return false;
    } else {
      this.tainted = true;
    }
    r = {};
    nr = {};
    _ref = ['start', 'end'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      p = _ref[_i];
      node = this[p + 'Container'];
      offset = this[p + 'Offset'];
      if (node.nodeType === 1) {
        it = node.childNodes[offset];
        node = it || node.childNodes[offset - 1];
        if (node.nodeType === 1 && !node.firstChild) {
          it = null;
          node = node.previousSibling;
        }
        while (node.nodeType !== 3) {
          node = node.firstChild;
        }
        offset = it ? 0 : node.nodeValue.length;
      }
      r[p] = node;
      r[p + 'Offset'] = offset;
    }
    nr.start = r.startOffset > 0 ? r.start.splitText(r.startOffset) : r.start;
    if (r.start === r.end) {
      if ((r.endOffset - r.startOffset) < nr.start.nodeValue.length) {
        nr.start.splitText(r.endOffset - r.startOffset);
      }
      nr.end = nr.start;
    } else {
      if (r.endOffset < r.end.nodeValue.length) r.end.splitText(r.endOffset);
      nr.end = r.end;
    }
    nr.commonAncestor = this.commonAncestorContainer;
    while (nr.commonAncestor.nodeType !== 1) {
      nr.commonAncestor = nr.commonAncestor.parentNode;
    }
    return new Range.NormalizedRange(nr);
  };

  BrowserRange.prototype.serialize = function(root, ignoreSelector) {
    return this.normalize(root).serialize(root, ignoreSelector);
  };

  return BrowserRange;

})();

Range.NormalizedRange = (function() {

  function NormalizedRange(obj) {
    this.commonAncestor = obj.commonAncestor;
    this.start = obj.start;
    this.end = obj.end;
  }

  NormalizedRange.prototype.normalize = function(root) {
    return this;
  };

  NormalizedRange.prototype.limit = function(bounds) {
    var nodes, parent, startParents, _i, _len, _ref;
    nodes = $.grep(this.textNodes(), function(node) {
      return node.parentNode === bounds || $.contains(bounds, node.parentNode);
    });
    if (!nodes.length) return null;
    this.start = nodes[0];
    this.end = nodes[nodes.length - 1];
    startParents = $(this.start).parents();
    _ref = $(this.end).parents();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      parent = _ref[_i];
      if (startParents.index(parent) !== -1) {
        this.commonAncestor = parent;
        break;
      }
    }
    return this;
  };

  NormalizedRange.prototype.serialize = function(root, ignoreSelector) {
    var end, serialization, start;
    serialization = function(node, isEnd) {
      var n, nodes, offset, origParent, textNodes, xpath, _i, _len;
      if (ignoreSelector) {
        origParent = $(node).parents(":not(" + ignoreSelector + ")").eq(0);
      } else {
        origParent = $(node).parent();
      }
      xpath = origParent.xpath(root)[0];
      textNodes = origParent.textNodes();
      nodes = textNodes.slice(0, textNodes.index(node));
      offset = 0;
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        n = nodes[_i];
        offset += n.nodeValue.length;
      }
      if (isEnd) {
        return [xpath, offset + node.nodeValue.length];
      } else {
        return [xpath, offset];
      }
    };
    start = serialization(this.start);
    end = serialization(this.end, true);
    return new Range.SerializedRange({
      start: start[0],
      end: end[0],
      startOffset: start[1],
      endOffset: end[1]
    });
  };

  NormalizedRange.prototype.text = function() {
    var node;
    return ((function() {
      var _i, _len, _ref, _results;
      _ref = this.textNodes();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        _results.push(node.nodeValue);
      }
      return _results;
    }).call(this)).join('');
  };

  NormalizedRange.prototype.textNodes = function() {
    var end, start, textNodes, _ref;
    textNodes = $(this.commonAncestor).textNodes();
    _ref = [textNodes.index(this.start), textNodes.index(this.end)], start = _ref[0], end = _ref[1];
    return $.makeArray(textNodes.slice(start, end + 1 || 9e9));
  };

  NormalizedRange.prototype.toRange = function() {
    var range;
    range = document.createRange();
    range.setStartBefore(this.start);
    range.setEndAfter(this.end);
    return range;
  };

  return NormalizedRange;

})();

Range.SerializedRange = (function() {

  function SerializedRange(obj) {
    this.start = obj.start;
    this.startOffset = obj.startOffset;
    this.end = obj.end;
    this.endOffset = obj.endOffset;
  }

  SerializedRange.prototype.normalize = function(root) {
    var contains, length, node, p, range, tn, _i, _j, _len, _len2, _ref, _ref2;
    range = {};
    _ref = ['start', 'end'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      p = _ref[_i];
      try {
        node = Range.nodeFromXPath(this[p], root);
      } catch (e) {
        throw new Range.RangeError(p, ("Error while finding " + p + " node: " + this[p] + ": ") + e, e);
      }
      if (!node) {
        throw new Range.RangeError(p, "Couldn't find " + p + " node: " + this[p]);
      }
      length = 0;
      _ref2 = $(node).textNodes();
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        tn = _ref2[_j];
        if (length + tn.nodeValue.length >= this[p + 'Offset']) {
          range[p + 'Container'] = tn;
          range[p + 'Offset'] = this[p + 'Offset'] - length;
          break;
        } else {
          length += tn.nodeValue.length;
        }
      }
      if (!(range[p + 'Offset'] != null)) {
        throw new Range.RangeError("" + p + "offset", "Couldn't find offset " + this[p + 'Offset'] + " in element " + this[p]);
      }
    }
    contains = !(document.compareDocumentPosition != null) ? function(a, b) {
      return a.contains(b);
    } : function(a, b) {
      return a.compareDocumentPosition(b) & 16;
    };
    $(range.startContainer).parents().each(function() {
      if (contains(this, range.endContainer)) {
        range.commonAncestorContainer = this;
        return false;
      }
    });
    return new Range.BrowserRange(range).normalize(root);
  };

  SerializedRange.prototype.serialize = function(root, ignoreSelector) {
    return this.normalize(root).serialize(root, ignoreSelector);
  };

  SerializedRange.prototype.toObject = function() {
    return {
      start: this.start,
      startOffset: this.startOffset,
      end: this.end,
      endOffset: this.endOffset
    };
  };

  return SerializedRange;

})();
