// Generated by CoffeeScript 1.6.3
var Annotator, g, _Annotator, _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_Annotator = this.Annotator;

Annotator = (function(_super) {
  __extends(Annotator, _super);

  Annotator.prototype.events = {
    ".annotator-adder button click": "onAdderClick",
    ".annotator-adder button mousedown": "onAdderMousedown",
    ".annotator-hl mouseover": "onHighlightMouseover",
    ".annotator-hl mouseout": "startViewerHideTimer"
  };

  Annotator.prototype.html = {
    adder: '<div class="annotator-adder"><button>' + _t('Annotate') + '</button></div>',
    wrapper: '<div class="annotator-wrapper"></div>'
  };

  Annotator.prototype.options = {
    readOnly: false
  };

  Annotator.prototype.plugins = {};

  Annotator.prototype.editor = null;

  Annotator.prototype.viewer = null;

  Annotator.prototype.selectedRanges = null;

  Annotator.prototype.mouseIsDown = false;

  Annotator.prototype.ignoreMouseup = false;

  Annotator.prototype.viewerHideTimer = null;

  function Annotator(element, options) {
    this.onDeleteAnnotation = __bind(this.onDeleteAnnotation, this);
    this.onEditAnnotation = __bind(this.onEditAnnotation, this);
    this.onAdderClick = __bind(this.onAdderClick, this);
    this.onAdderMousedown = __bind(this.onAdderMousedown, this);
    this.onHighlightMouseover = __bind(this.onHighlightMouseover, this);
    this.checkForEndSelection = __bind(this.checkForEndSelection, this);
    this.checkForStartSelection = __bind(this.checkForStartSelection, this);
    this.clearViewerHideTimer = __bind(this.clearViewerHideTimer, this);
    this.startViewerHideTimer = __bind(this.startViewerHideTimer, this);
    this.showViewer = __bind(this.showViewer, this);
    this.onEditorSubmit = __bind(this.onEditorSubmit, this);
    this.onEditorHide = __bind(this.onEditorHide, this);
    this.showEditor = __bind(this.showEditor, this);
    Annotator.__super__.constructor.apply(this, arguments);
    this.plugins = {};
    if (!Annotator.supported()) {
      return this;
    }
    if (!this.options.readOnly) {
      this._setupDocumentEvents();
    }
    this._setupWrapper()._setupViewer()._setupEditor();
    this._setupDynamicStyle();
    this.adder = $(this.html.adder).appendTo(this.wrapper).hide();
    Annotator._instances.push(this);
  }

  Annotator.prototype._setupWrapper = function() {
    this.wrapper = $(this.html.wrapper);
    this.element.find('script').remove();
    this.element.wrapInner(this.wrapper);
    this.wrapper = this.element.find('.annotator-wrapper');
    return this;
  };

  Annotator.prototype._setupViewer = function() {
    var _this = this;
    this.viewer = new Annotator.Viewer({
      readOnly: this.options.readOnly
    });
    this.viewer.hide().on("edit", this.onEditAnnotation).on("delete", this.onDeleteAnnotation).addField({
      load: function(field, annotation) {
        if (annotation.text) {
          $(field).html(Util.escape(annotation.text));
        } else {
          $(field).html("<i>" + (_t('No Comment')) + "</i>");
        }
        return _this.publish('annotationViewerTextField', [field, annotation]);
      }
    }).element.appendTo(this.wrapper).bind({
      "mouseover": this.clearViewerHideTimer,
      "mouseout": this.startViewerHideTimer
    });
    return this;
  };

  Annotator.prototype._setupEditor = function() {
    this.editor = new Annotator.Editor();
    this.editor.hide().on('hide', this.onEditorHide).on('save', this.onEditorSubmit).addField({
      type: 'textarea',
      //ORIGINAL
      //label: _t('Comments') + '\u2026',
      //MODIFIED
      label: _t('Type comments here. Press Enter to save.'),
      load: function(field, annotation) {
        return $(field).find('textarea').val(annotation.text || '');
      },
      submit: function(field, annotation) {
        return annotation.text = $(field).find('textarea').val();
      }
    });
    this.editor.element.appendTo(this.wrapper);
    return this;
  };

  Annotator.prototype._setupDocumentEvents = function() {
    $(document).bind({
      "mouseup": this.checkForEndSelection,
      "mousedown": this.checkForStartSelection
    });
    return this;
  };

  Annotator.prototype._setupDynamicStyle = function() {
    var max, sel, style, x;
    style = $('#annotator-dynamic-style');
    if (!style.length) {
      style = $('<style id="annotator-dynamic-style"></style>').appendTo(document.head);
    }
    sel = '*' + ((function() {
      var _i, _len, _ref, _results;
      _ref = ['adder', 'outer', 'notice', 'filter'];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        x = _ref[_i];
        _results.push(":not(.annotator-" + x + ")");
      }
      return _results;
    })()).join('');
    max = Util.maxZIndex($(document.body).find(sel));
    max = Math.max(max, 1000);
    style.text([".annotator-adder, .annotator-outer, .annotator-notice {", "  z-index: " + (max + 20) + ";", "}", ".annotator-filter {", "  z-index: " + (max + 10) + ";", "}"].join("\n"));
    return this;
  };

  Annotator.prototype.destroy = function() {
    var idx, name, plugin, _ref;
    $(document).unbind({
      "mouseup": this.checkForEndSelection,
      "mousedown": this.checkForStartSelection
    });
    $('#annotator-dynamic-style').remove();
    this.adder.remove();
    this.viewer.destroy();
    this.editor.destroy();
    this.wrapper.find('.annotator-hl').each(function() {
      $(this).contents().insertBefore(this);
      return $(this).remove();
    });
    this.wrapper.contents().insertBefore(this.wrapper);
    this.wrapper.remove();
    this.element.data('annotator', null);
    _ref = this.plugins;
    for (name in _ref) {
      plugin = _ref[name];
      this.plugins[name].destroy();
    }
    this.removeEvents();
    idx = Annotator._instances.indexOf(this);
    if (idx !== -1) {
      return Annotator._instances.splice(idx, 1);
    }
  };

  Annotator.prototype.getSelectedRanges = function() {
    var browserRange, i, normedRange, r, ranges, rangesToIgnore, selection, _i, _len;
    selection = Util.getGlobal().getSelection();
    ranges = [];
    rangesToIgnore = [];
    if (!selection.isCollapsed) {
      ranges = (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = selection.rangeCount; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          r = selection.getRangeAt(i);
          browserRange = new Range.BrowserRange(r);
          normedRange = browserRange.normalize().limit(this.wrapper[0]);
          if (normedRange === null) {
            rangesToIgnore.push(r);
          }
          _results.push(normedRange);
        }
        return _results;
      }).call(this);
      selection.removeAllRanges();
    }
    for (_i = 0, _len = rangesToIgnore.length; _i < _len; _i++) {
      r = rangesToIgnore[_i];
      selection.addRange(r);
    }
    return $.grep(ranges, function(range) {
      if (range) {
        selection.addRange(range.toRange());
      }
      return range;
    });
  };

  Annotator.prototype.createAnnotation = function() {
    var annotation;
    annotation = {};
    this.publish('beforeAnnotationCreated', [annotation]);
    return annotation;
  };

  Annotator.prototype.setupAnnotation = function(annotation) {
    var e, normed, normedRanges, r, root, _i, _j, _len, _len1, _ref;
    root = this.wrapper[0];
    annotation.ranges || (annotation.ranges = this.selectedRanges);
    normedRanges = [];
    _ref = annotation.ranges;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      r = _ref[_i];
      try {
        normedRanges.push(Range.sniff(r).normalize(root));
      } catch (_error) {
        e = _error;
        if (e instanceof Range.RangeError) {
          this.publish('rangeNormalizeFail', [annotation, r, e]);
        } else {
          throw e;
        }
      }
    }
    annotation.quote = [];
    annotation.ranges = [];
    annotation.highlights = [];
    for (_j = 0, _len1 = normedRanges.length; _j < _len1; _j++) {
      normed = normedRanges[_j];
      annotation.quote.push($.trim(normed.text()));
      annotation.ranges.push(normed.serialize(this.wrapper[0], '.annotator-hl'));
      $.merge(annotation.highlights, this.highlightRange(normed));
    }
    annotation.quote = annotation.quote.join(' / ');
    $(annotation.highlights).data('annotation', annotation);
    return annotation;
  };

  Annotator.prototype.updateAnnotation = function(annotation) {
    this.publish('beforeAnnotationUpdated', [annotation]);
    this.publish('annotationUpdated', [annotation]);
    return annotation;
  };

  Annotator.prototype.deleteAnnotation = function(annotation) {
    var child, h, _i, _len, _ref;
    if (annotation.highlights != null) {
      _ref = annotation.highlights;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        h = _ref[_i];
        if (!(h.parentNode != null)) {
          continue;
        }
        child = h.childNodes[0];
        $(h).replaceWith(h.childNodes);
      }
    }
    this.publish('annotationDeleted', [annotation]);
    return annotation;
  };

  Annotator.prototype.loadAnnotations = function(annotations) {
    var clone, loader,
      _this = this;
    if (annotations == null) {
      annotations = [];
    }
    loader = function(annList) {
      var n, now, _i, _len;
      if (annList == null) {
        annList = [];
      }
      now = annList.splice(0, 10);
      for (_i = 0, _len = now.length; _i < _len; _i++) {
        n = now[_i];
        _this.setupAnnotation(n);
      }
      if (annList.length > 0) {
        return setTimeout((function() {
          return loader(annList);
        }), 10);
      } else {
        return _this.publish('annotationsLoaded', [clone]);
      }
    };
    clone = annotations.slice();
    loader(annotations);
    return this;
  };

  Annotator.prototype.dumpAnnotations = function() {
    if (this.plugins['Store']) {
      return this.plugins['Store'].dumpAnnotations();
    } else {
      console.warn(_t("Can't dump annotations without Store plugin."));
      return false;
    }
  };

  Annotator.prototype.highlightRange = function(normedRange, cssClass) {
    var hl, node, white, _i, _len, _ref, _results;
    if (cssClass == null) {
      cssClass = 'annotator-hl';
    }
    white = /^\s*$/;
    hl = $("<span class='" + cssClass + "'></span>");
    _ref = normedRange.textNodes();
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      node = _ref[_i];
      if (!white.test(node.nodeValue)) {
        _results.push($(node).wrapAll(hl).parent().show()[0]);
      }
    }
    return _results;
  };

  Annotator.prototype.highlightRanges = function(normedRanges, cssClass) {
    var highlights, r, _i, _len;
    if (cssClass == null) {
      cssClass = 'annotator-hl';
    }
    highlights = [];
    for (_i = 0, _len = normedRanges.length; _i < _len; _i++) {
      r = normedRanges[_i];
      $.merge(highlights, this.highlightRange(r, cssClass));
    }
    return highlights;
  };

  Annotator.prototype.addPlugin = function(name, options) {
    var klass, _base;
    if (this.plugins[name]) {
      console.error(_t("You cannot have more than one instance of any plugin."));
    } else {
      klass = Annotator.Plugin[name];
      if (typeof klass === 'function') {
        this.plugins[name] = new klass(this.element[0], options);
        this.plugins[name].annotator = this;
        if (typeof (_base = this.plugins[name]).pluginInit === "function") {
          _base.pluginInit();
        }
      } else {
        console.error(_t("Could not load ") + name + _t(" plugin. Have you included the appropriate <script> tag?"));
      }
    }
    return this;
  };

  Annotator.prototype.showEditor = function(annotation, location) {
    this.editor.element.css(location);
    this.editor.load(annotation);
    this.publish('annotationEditorShown', [this.editor, annotation]);
    return this;
  };

  Annotator.prototype.onEditorHide = function() {
    this.publish('annotationEditorHidden', [this.editor]);
    return this.ignoreMouseup = false;
  };

  Annotator.prototype.onEditorSubmit = function(annotation) {
    return this.publish('annotationEditorSubmit', [this.editor, annotation]);
  };

  Annotator.prototype.showViewer = function(annotations, location) {
    this.viewer.element.css(location);
    this.viewer.load(annotations);
    return this.publish('annotationViewerShown', [this.viewer, annotations]);
  };

  Annotator.prototype.startViewerHideTimer = function() {
    if (!this.viewerHideTimer) {
      return this.viewerHideTimer = setTimeout(this.viewer.hide, 250);
    }
  };

  Annotator.prototype.clearViewerHideTimer = function() {
    clearTimeout(this.viewerHideTimer);
    return this.viewerHideTimer = false;
  };

  Annotator.prototype.checkForStartSelection = function(event) {
    if (!(event && this.isAnnotator(event.target))) {
      this.startViewerHideTimer();
    }
    return this.mouseIsDown = true;
  };

  Annotator.prototype.checkForEndSelection = function(event) {
    var container, range, _i, _len, _ref;
    this.mouseIsDown = false;
    if (this.ignoreMouseup) {
      return;
    }
    this.selectedRanges = this.getSelectedRanges();
    _ref = this.selectedRanges;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      range = _ref[_i];
      container = range.commonAncestor;
      if ($(container).hasClass('annotator-hl')) {
        container = $(container).parents('[class!=annotator-hl]')[0];
      }
      if (this.isAnnotator(container)) {
        return;
      }
    }
    if (event && this.selectedRanges.length) {
      //ORIGINAL
      //return this.adder.css(Util.mousePosition(event, this.wrapper[0])).show();
      //MODIFIED
      return this.adder.css(Util.mousePosition(event, this.wrapper[0])).show().find("button").click();
    } else {
      return this.adder.hide();
    }
  };

  Annotator.prototype.isAnnotator = function(element) {
    return !!$(element).parents().addBack().filter('[class^=annotator-]').not(this.wrapper).length;
  };

  Annotator.prototype.onHighlightMouseover = function(event) {
    var annotations;
    this.clearViewerHideTimer();
    if (this.mouseIsDown || this.viewer.isShown()) {
      return false;
    }
    annotations = $(event.target).parents('.annotator-hl').addBack().map(function() {
      return $(this).data("annotation");
    });
    return this.showViewer($.makeArray(annotations), Util.mousePosition(event, this.wrapper[0]));
  };

  Annotator.prototype.onAdderMousedown = function(event) {
    if (event != null) {
      event.preventDefault();
    }
    return this.ignoreMouseup = true;
  };

  Annotator.prototype.onAdderClick = function(event) {
    var annotation, cancel, cleanup, position, save,
      _this = this;
    if (event != null) {
      event.preventDefault();
    }
    position = this.adder.position();
    this.adder.hide();
    annotation = this.setupAnnotation(this.createAnnotation());
    $(annotation.highlights).addClass('annotator-hl-temporary');
    save = function() {
      cleanup();
      $(annotation.highlights).removeClass('annotator-hl-temporary');
      return _this.publish('annotationCreated', [annotation]);
    };
    cancel = function() {
      cleanup();
      return _this.deleteAnnotation(annotation);
    };
    cleanup = function() {
      _this.unsubscribe('annotationEditorHidden', cancel);
      return _this.unsubscribe('annotationEditorSubmit', save);
    };
    this.subscribe('annotationEditorHidden', cancel);
    this.subscribe('annotationEditorSubmit', save);
    return this.showEditor(annotation, position);
  };

  Annotator.prototype.onEditAnnotation = function(annotation) {
    var cleanup, offset, update,
      _this = this;
    offset = this.viewer.element.position();
    update = function() {
      cleanup();
      return _this.updateAnnotation(annotation);
    };
    cleanup = function() {
      _this.unsubscribe('annotationEditorHidden', cleanup);
      return _this.unsubscribe('annotationEditorSubmit', update);
    };
    this.subscribe('annotationEditorHidden', cleanup);
    this.subscribe('annotationEditorSubmit', update);
    this.viewer.hide();
    return this.showEditor(annotation, offset);
  };

  Annotator.prototype.onDeleteAnnotation = function(annotation) {
    this.viewer.hide();
    return this.deleteAnnotation(annotation);
  };

  return Annotator;

})(Delegator);

Annotator.Plugin = (function(_super) {
  __extends(Plugin, _super);

  function Plugin(element, options) {
    Plugin.__super__.constructor.apply(this, arguments);
  }

  Plugin.prototype.pluginInit = function() {};

  Plugin.prototype.destroy = function() {
    return this.removeEvents();
  };

  return Plugin;

})(Delegator);

g = Util.getGlobal();

if (((_ref = g.document) != null ? _ref.evaluate : void 0) == null) {
  $.getScript('http://assets.annotateit.org/vendor/xpath.min.js');
}

if (g.getSelection == null) {
  $.getScript('http://assets.annotateit.org/vendor/ierange.min.js');
}

if (g.JSON == null) {
  $.getScript('http://assets.annotateit.org/vendor/json2.min.js');
}

if (g.Node == null) {
  g.Node = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  };
}

Annotator.$ = $;

Annotator.Delegator = Delegator;

Annotator.Range = Range;

Annotator.Util = Util;

Annotator._instances = [];

Annotator._t = _t;

Annotator.supported = function() {
  return (function() {
    return !!this.getSelection;
  })();
};

Annotator.noConflict = function() {
  Util.getGlobal().Annotator = _Annotator;
  return this;
};

$.fn.annotator = function(options) {
  var args;
  args = Array.prototype.slice.call(arguments, 1);
  return this.each(function() {
    var instance;
    instance = $.data(this, 'annotator');
    if (instance) {
      return options && instance[options].apply(instance, args);
    } else {
      instance = new Annotator(this, options);
      return $.data(this, 'annotator', instance);
    }
  });
};

this.Annotator = Annotator;

/*
//@ sourceMappingURL=annotator.map
*/
