var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

//Override the default highlight mouseover behavior
Annotator.prototype.onHighlightMouseover = function(event){
    //console.log(event.target, $(event.target).data("annotation")); 
};

Annotator.Plugin.Viewer = (function(_super) {
    __extends(Viewer, _super);
    
    var annotationPanel;
    var infoPanel = '<div class="annotation-info">\
                        <div class="info-item">Your annotations: <span id="current-user-annotations-count"></span>\
                        <div class="info-item">All annotations: <span id="all-annotations-count"></span>\
                        <div class="info-item">Number of users: <span id="number-of-annotators"></span>\
                    </div>';
    var menuBar =   '<div class="annotation-menubar">\
                        <div class="menu-container">\
                            <div class="mode-controls controls">\
                                <label><input type="radio" name="annotation_mode" value="highlight" /> Highlight</label>\
                                <label><input type="radio" name="annotation_mode" value="annotate" checked="checked" /> Annotate</label>\
                                <label><input type="radio" name="annotation_mode" value="select" /> Select</label>\
                            </div>\
                            <div class="info-control controls"><a href="#annotation-info" class="info-panel-trigger">Info</a></div>\
                            <div class="display-controls controls">\
                                <span class="display-mode-label">Display:</span>\
                                <label><input type="radio" name="display_mode" value="icons" /> Icons</label>\
                                <label><input type="radio" name="display_mode" value="snippets" checked="checked" /> Snippets</label>\
                                <label><input type="radio" name="display_mode" value="full" /> Full</label>\
                            </div>\
                        </div>\
                    </div>';    
    var textDivisions;
    var focusedIds = {};
    var numberOfUsers = 0;
    var numberOfAnnotationsByCurrentUser = 0;
    var numberOfAnnotationsByAllUsers = 0;
    var displayMode = "snippets";
    
    //cache original functions for enabling/disabling annotations later
    //var checkForStartSelection = Annotator.prototype.checkForStartSelection;
    //var checkForEndSelection = Annotator.prototype.checkForEndSelection;
    
    Viewer.prototype.events = {
        "annotationsLoaded": "showAnnotations",
        //".annotation-menubar .mode-controls input click": "changeInteractiveMode"
        //".annotator-hl mouseout": "startViewerHideTimer"  
        //"annotationViewerShown": "viewerOpens
    };
    
    function getAnnotationIdFromClass(classStr, removePrefix) {
        var re = /id-(\w+)/;
        
        if (re.test(classStr)) {
            if (removePrefix) {
                return re.exec(classStr)[1];
            }
            else {
                return re.exec(classStr)[0];
            }
        }
        return false;
    }    
    
    function activateShortestId(){
        // find which ids have the shortest length (array b/c ties are allowed)
        var shortestIds = [];
        var shortestLenSoFar = Infinity;
        
        _.each(focusedIds, function(len, id){
            if (len < shortestLenSoFar) {
                shortestLenSoFar = len;
                shortestIds = [id];
            }
            else if (len == shortestLenSoFar) {
                shortestIds.push(id);
            }
        });

        //$(".text-container .active, #scrollbar .active").removeClass("active");
        $(".annotator-hl.active, .annotation.active").removeClass("active");
        if (!shortestIds.length){
            return false;
        }
        
        var activeIdsSelector = "." + shortestIds.join(", .")
        $(activeIdsSelector).find(".annotator-hl").andSelf().addClass("active");
        
        var annotationInPane = $(activeIdsSelector, annotationPanel);
        //annotationInPane.parents(".annotation-pane").stop().scrollTo(annotationInPane[0], 250);
    }
    
    function annotationFocus(annotations) {
        //if (!enableAnnotation) return false
        // add to the focusedIds array
        $(annotations).each(function(){
            var thisId = getAnnotationIdFromClass(this.className);
            focusedIds[thisId] = $('.annotator-hl.' + thisId).text().length;
        });

        activateShortestId();
        return false;
    }
    
    function annotationBlur(annotation){      
        var annotationId = getAnnotationIdFromClass(annotation.className);
        delete focusedIds[annotationId];
        activateShortestId();
    }
    
    /**
     *
     */
    function getAnnotationsFromHighlights(highlightedElement) {
        var annotations = {};
        
        highlightedElement.find(".annotator-hl").each(function(){
            //a single annotation can have multiple .annotator-hl elements,
            //so using the ID "collapses" them into deduplicated annotations
            //...should be a better way to do this
            annotations[$(this).data().annotation.id] = $(this).data().annotation;
        });
        
        return _.values(annotations);
    }    
    
    /**
     *
     */
    function buildAnnotationPane(annotations){
        var contents = "";
        
        for(var i = 0; i < annotations.length; i++){
            contents += buildAnnotationContents(annotations[i]);
        }
        
        return contents;
    };
    
    /**
     *
     */
    function buildAnnotationContents(annotation){
        if (annotation.highlights.length < 1 || annotation.ranges.length < 1) {
            //In the "pilot" article, there are 2 annotations with .highlights and .ranges
            //equal to Array[0]. They were not shown originally.
            return "";
        }
        
        //get the annotation highlights position relative to its parent: use position() instead offset()
        //var annotationTop = $(annotation.highlights).position().top;
        
        var annotationContents = '<div class="annotation-contents">\
                                    <div class="annotation id-' + annotation.id + '">\
                                        <img src="/static/experiment/1/img/users/' + annotation.userId + '.png" alt="" />\
                                        <span class="user-id">' + annotation.userId + '</span>\
                                        <span class="text">' + annotation.text + '</span>\
                                    </div>\
                                </div>';
        return annotationContents;
        //console.log("renderAnnotation", annotation);  
    };
    
    /**
     *
     */
    function setAnnotationHighlightClassNames(){
        //TODO: will caching this selector speed things up any?
        $("span.annotator-hl").each(function(){
            //add an id- class
            var $this = $(this);
            var className = "id-" + $this.data().annotation.id;
            $this.addClass(className);
            
            //add a nested-depth class
            var numberOfHighlightParents = $this.parents(".annotator-hl").length + 1;
            if (numberOfHighlightParents > 3){
                numberOfHighlightParents = 3;
            }
            
            var nestedDepthClassName = "nested-" + numberOfHighlightParents;
            $this.addClass(nestedDepthClassName);          
        });
    }  
    
   
    /**
     * Plugin constructor. Runs when first instantiated.
     */
    function Viewer(element, options) {
        //create the annotation panel DOM element that will house the annotations
        annotationPanel = $('<div id="annotation-panel"></div>');
        
        //select the DOM elements that serve as breaking points or transitions in the document
        //this list is chosen based on what makes the most sense in an article format
        textDivisions = $("p,h1,h2,h3,h4,h5,h6");
        
        $(document.body).append(annotationPanel);
        $(document.body).append(menuBar);
        $(document.body).append(infoPanel);
        
        //binding events elsewhere screws up the context for `this`, which
        //was used by the original code, so stick with the manual document event binding
        $(document).on("mouseenter", ".annotator-hl", function(e){
            annotationFocus(this);
        }).on("mouseleave", ".annotator-hl", function(e){
            annotationBlur(this);
        });
        
        $(document).on("mouseenter", ".annotation", function(e){
            var id = getAnnotationIdFromClass(this.className);
            var annotation = $(".annotator-hl." + id);
            //pass DOM elements to focus
            annotationFocus(annotation[0]);
        }).on("mouseleave", ".annotation", function(e){
            var id = getAnnotationIdFromClass(this.className);
            var annotation = $(".annotator-hl." + id);
            //pass DOM elements to blur           
            annotationBlur(annotation[0]);
        });
        
        
        //attach menubar controls here...not working as part of prototype.events for some reason
        
        this.showAnnotations = __bind(this.showAnnotations, this);
        this.changeInteractiveMode = __bind(this.changeInteractiveMode, this);
        this.changeDisplayMode = __bind(this.changeDisplayMode, this);
        
       
        $(document).on("click", ".annotation-menubar .mode-controls input", this.changeInteractiveMode);
        $(document).on("click", ".annotation-menubar .display-controls input", this.changeDisplayMode);
        $(document).on("click", ".annotation-menubar .info-control a", showAnnotationsInfoPanel);
        $(document).on("click", hideAnnotationsInfoPanel);
        
        Viewer.__super__.constructor.apply(this, arguments);   
    }
    
    Viewer.prototype.showAnnotations = function(annotations) {
/*
 * TEST THIS OUT
 * $(".annotator-hl").filter(function(){
    var viewTop = $(window).scrollTop();
    var viewBottom = viewTop + $(window).height();
    var elementTop = $(this).offset().top;

    return (elementTop >= viewTop && elementTop <= viewBottom);
});
 *
 */
        getCounts(annotations);
        setAnnotationHighlightClassNames();
        
        var annotationPanes = "";
console.time("Writing annotations");
        textDivisions.each(function(index){
            //create an annotation-pane for each text division that is at its same top position
            var $this = $(this);
            
            //get the top of this text block to match annotation pane top; minus 10 to compensate for padding on each .annotation-pane
            var textTop = $this.position().top + parseInt($this.css("margin-top")) + parseInt($this.css("padding-top")) - 10;
            
            //get the total height of this text block to give this annotation pane a max height
            //using height() rather than outerHeight() because the extra height provided by including
            //padding or margin would not be useful (i.e. no annotation should be next to whitespace)
            var maxHeight = $this.height();
            
            //get the annotations in this block for the annotation pane
            var annotations = getAnnotationsFromHighlights($this);
            
            if (annotations.length > 1) {
                //build the HTML for annotation pane contents
                var contents = buildAnnotationPane(annotations);
                
                annotationPanes += '<div class="annotation-pane" style="top: ' + textTop + 'px; max-height: ' + maxHeight + 'px;">' + contents + '</div>';
            }
        });
        
        annotationPanel.append(annotationPanes);
console.timeEnd("Writing annotations");
    };
    
    Viewer.prototype.saveHighlight = function(e) {
console.log("Save highlight", e);
    }
    
    Viewer.prototype.changeInteractiveMode = function(e){
console.log("Change interactive mode to", e.target.value, this);
        var mode = e.target.value;
        
        if (mode === "select") {
            //hide highlights?, disable annotating
            $(document).unbind({
                "mouseup": this.annotator.checkForEndSelection,
                "mousedown": this.annotator.checkForStartSelection
            });
        } else if (mode === "highlight") {
            //allow highlighting and annotating
            $(document).unbind({
                "mouseup": this.annotator.checkForEndSelection,
            }).bind({
                "mouseup": this.saveHighlight
            });
        } else {
            //enable annotating (default)
            $(document).unbind({
                "mouseup": this.saveHighlight
            }).bind({
                "mouseup": this.annotator.checkForEndSelection,
                "mousedown": this.annotator.checkForStartSelection
            });
        }
    };
    
    Viewer.prototype.changeDisplayMode = function(e){
console.log("Change display mode from", displayMode, "to", newMode);
        var newMode = e.target.value;
        
        annotationPanel.removeClass(displayMode).addClass(newMode);
        
        displayMode = newMode;
    };
    
    /**
     * Show the number of annotations by the current user,
     * show the number of annotations by all users,
     * and show the total number of users.
     */
    function showAnnotationsInfoPanel(e) {
        e.preventDefault();
        
        $(".annotation-info").addClass("visible");
    }
    
    function hideAnnotationsInfoPanel(e) {
        if (!/info-panel-trigger|annotation-info/.test(e.target.className)){
            //hide info panel when clicking anywhere that is not the "Info" link or the panel itself
            $(".annotation-info").removeClass("visible");
        }
    }
    
    function getCounts(annotations) {
        annotationsWithHighlights = _.filter(annotations, function(annotation){
            //only count annotations that have a highlight and a range value
            return (annotation.highlights.length > 0 && annotation.ranges.length > 0);
        });
        
        numberOfAnnotationsByAllUsers = annotationsWithHighlights.length;


        var annotationsByUser = _.groupBy(annotations, function(annotation){return annotation.userId})
        numberOfUsers = _.size(annotationsByUser);

        var annotationsByThisUser = _.filter(annotations, function(annotation){
            return annotation.userId == AnnotationView.userId;
        });
        
        numberOfAnnotationsByCurrentUser = _.size(annotationsByThisUser);
    }
    
    return Viewer;

})(Annotator.Plugin);