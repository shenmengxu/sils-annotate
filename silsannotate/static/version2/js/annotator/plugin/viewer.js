var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

/*    
    viewer.js/LinkParser may be useful for making links work in the annotations
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

Annotator.Plugin.Viewer = (function(_super) {
    __extends(Viewer, _super);
    
    var annotationPanel;
    var infoPanel = '<div class="annotation-info">\
                        <div class="info-item">Your annotations: <span id="current-user-annotations-count"></span></div>\
                        <div class="info-item">All annotations: <span id="all-annotations-count"></span></div>\
                        <div class="info-item">Number of users: <span id="number-of-annotators"></span></div>\
                    </div>';
    var menuBar =   '<div class="annotation-menubar">\
                        <div class="menu-container">\
                            <div class="mode-controls controls">\
                                <a href="#highlight" data-mode="highlight" title="Highlight">\
                                    <img src="/static/' + interfaceName + '/img/highlight-icon.png" alt="Highlight" />\
                                </a>\
                                <a href="#annotate" data-mode="annotate" class="active" title="Annotate">\
                                    <img src="/static/' + interfaceName + '/img/annotate-icon.png" alt="Annotate" />\
                                </a>\
                                <a href="#select" data-mode="select" title="Select">\
                                    <img src="/static/' + interfaceName + '/img/select-icon.png" alt="Select" />\
                                </a>\
                            </div>\
                            <div class="highlight-controls controls">\
                                <a href="#toggle-highlights" title="Hide/show highlights">\
                                    <img src="/static/' + interfaceName + '/img/highlights-icon.png" alt="Show/hide highlights" />\
                                </a>\
                            </div>\
                            <div class="info-control controls">\
                                <a href="#annotation-info" class="info-panel-trigger" title="Info">\
                                    <img src="/static/' + interfaceName + '/img/info-icon.png" alt="Info" />\
                                </a>\
                            </div>\
                            <div class="display-controls controls">\
                                <a href="#icons" data-mode="icons" title="Icons">\
                                    <img src="/static/' + interfaceName + '/img/icons-icon.png" alt="Icons" />\
                                </a>\
                                <a href="#snippets" data-mode="snippets" class="active" title="Snippets">\
                                    <img src="/static/' + interfaceName + '/img/snippets-icon.png" alt="Snippets" />\
                                </a>\
                                <a href="#full" data-mode="full" title="Full text">\
                                    <img src="/static/' + interfaceName + '/img/full-icon.png" alt="Full text" />\
                                </a>\
                            </div>\
                        </div>\
                    </div>';
    var annotationMaxHeight = 42; /* ~42px (3.8em at 11px) */
    var textDivisions;
    var scrollbar;
    var focusedIds = {};
    var numberOfUsers = 0;
    var numberOfAnnotationsByCurrentUser = 0;
    var numberOfAnnotationsByAllUsers = 0;
    var displayMode = "snippets";
    var interactiveMode = "annotate";
    
    Viewer.prototype.events = {
        "annotationsLoaded": "showAnnotations",
        "annotationDataReady": "showNewAnnotation"
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
        
        //TODO: draw the activated red line on the scrollbar
    }
    
    function annotationFocus(annotations) {
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
 
        //if a single annotation is passed in, put it in an array
        if (!_.isArray(annotations)) {
            annotations = [annotations];
        }
        
        for(var i = 0; i < annotations.length; i++){
            contents += buildAnnotationContents(annotations[i]);
        }
        
        return contents;
    };
    
/*    function getAnnotationTextHeight(annotationText) {
        $("#measuring-block").text(annotationText);
        
        var height = $("#measuring-block").height();
        
        $("#measuring-block").empty();
        
        return height;
    } */
    
    /**
     *
     */
    function buildAnnotationContents(annotation){        
        if (annotation.highlights.length < 1 || annotation.ranges.length < 1) {
            //In the "pilot" article, there are 2 annotations with .highlights and .ranges
            //equal to Array[0] (i.e. empty values). They were not shown originally.
            return "";
        }
        
        var annotationClass = "annotation id-" + annotation.id;
        
        var annotationContents = '<div class="annotation-contents">\
                                    <div class="' + annotationClass + '">\
                                        <img src="/static/' + interfaceName + '/img/users/' + annotation.userId + '.png" alt="" />\
                                        <span class="user-id">' + annotation.userId + '</span>\
                                        <span class="text">' + annotation.text + '</span>\
                                    </div>\
                                </div>';
        return annotationContents;
    };
    
    /**
     *
     */
    function setAnnotationHighlightClassNames(highlightElements){
        var highlights;
        
        if (!highlightElements) {
            //TODO: will caching this selector speed things up any?
            highlightElements = $("span.annotator-hl");
        }
        
        highlightElements.each(function(){
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
        Viewer.__super__.constructor.apply(this, arguments);

        //create the annotation panel DOM element that will house the annotations
        annotationPanel = $('<div id="annotation-panel"></div>');
        
        //select the DOM elements that serve as breaking points or transitions in the document
        //this list is chosen based on what makes the most sense in an article format
        textDivisions = $("p,h1,h2,h3,h4,h5,h6");
        
        $("#container").append(annotationPanel);
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
        
        this.showAnnotations = __bind(this.showAnnotations, this);
        this.showNewAnnotation = __bind(this.showNewAnnotation, this);
        this.changeInteractiveMode = __bind(this.changeInteractiveMode, this);
        this.changeDisplayMode = __bind(this.changeDisplayMode, this);
        this.toggleHighlights = __bind(this.toggleHighlights, this);
        this.goToScrollbarClickPosition = __bind(this.goToScrollbarClickPosition, this);
        this.disableDefaultEvents = __bind(this.disableDefaultEvents, this);
        this.saveHighlight = __bind(this.saveHighlight, this);
        
        this.disableDefaultEvents();
        
        //attach menubar controls here...not working as part of prototype.events for some reason
        $(document).on("click", ".annotation-menubar .mode-controls a", this.changeInteractiveMode);
        $(document).on("click", ".annotation-menubar .display-controls a", this.changeDisplayMode);;
        $(document).on("click", ".annotation-menubar .highlight-controls a", this.toggleHighlights);
        $(document).on("click", ".annotation-menubar .info-control a", showAnnotationsInfoPanel);
        $(document).on("click", "#scrollbar", this.goToScrollbarClickPosition);
        $(document).on("click", ".expand-pane", expandAnnotationPane);
        $(document).on("click", "#container", hideAnnotationsInfoPanel);
    }
    
    Viewer.prototype.showAnnotations = function(annotations) {
        getCounts(annotations);
        
        $("#current-user-annotations-count").text(numberOfAnnotationsByCurrentUser);
        $("#all-annotations-count").text(numberOfAnnotationsByAllUsers);
        $("#number-of-annotators").text(numberOfUsers);
        
        setAnnotationHighlightClassNames();
        
        var annotationPanes = "";
console.time("Writing annotations");
        textDivisions.each(function(index){
            //create an annotation-pane for each text division that is at its same top position
            var $this = $(this);
            
            //this class couples a text division (paragraph/heading/etc) with a corresponding
            //annotation pane where its annotations will exist
            var textDivisionClass = "annotation-pane-" + Util.uuid();
            
            $this.addClass(textDivisionClass);
            
            //get the top of this text block to match annotation pane top; minus 10 to compensate for padding on each .annotation-pane
            var textTop = $this.position().top +
                            parseInt($this.css("margin-top")) +
                            parseInt($this.css("padding-top")) - 10;
            
            //get the total height of this text block to give this annotation pane a max height
            //using height() rather than outerHeight() because the extra height provided by including
            //padding or margin would not be useful (i.e. no annotation should be next to whitespace)
            var maxHeight = $this.height();
            
            //get the annotations in this block for the annotation pane
            var annotations = getAnnotationsFromHighlights($this);
            
            if (annotations.length > 0) {
                //build the HTML for annotation pane contents
                var contents = buildAnnotationPane(annotations);
                
                annotationPanes += '<div class="annotation-pane ' + textDivisionClass + '" style="top: ' + textTop + 'px; max-height: ' + maxHeight + 'px;">'
                                        + contents +
                                    '<a href="#nogo" class="expand-pane">More</a></div>';
            }
        });
        
        annotationPanel.append(annotationPanes);       
console.timeEnd("Writing annotations");
/*
console.time("Adding .long class");
        //expensive iteration just to add a .long class
        annotationPanel.find(".annotation").each(function(){
            if($(this).height() > annotationMaxHeight){
                $(this).addClass("long");
            }
        });
console.timeEnd("Adding .long class");
*/
        showScrollbar();
    };
    
    Viewer.prototype.showNewAnnotation = function(annotation){
        var id = annotation.id;
        var text = annotation.text;
        //Override annotation.userId since this setup does not currently use Annotator's permissions plugin
        annotation.userId = AnnotationView.userId; 
    
        var highlightStart = $(annotation.highlights[0]);
        
        //add annotation id to highlighted element
        setAnnotationHighlightClassNames(highlightStart);
        
        var highlightTextDivision = highlightStart.parents("h1,h2,h3,h4,h5,h6,p");
        
        var annotationPaneClass = highlightTextDivision[0].className;
        
        var annotationPane = annotationPanel.children("." + annotationPaneClass);
        
        if (annotationPane.length) {
            //add to existing .annotation-pane
            var numberOfPreviousHighlights = 0;
        
            highlightTextDivision.find(".annotator-hl").each(function(){
                if ($(this).data().annotation.id != id) {
                    numberOfPreviousHighlights++;
                    //keep going
                    return true;
                } else {
                    //found the highlight that was just created, so stop
                    return false;
                }
            });
            
            var contents = buildAnnotationContents(annotation); 

            annotationPane
                .children(".annotation-contents:nth-child(" + numberOfPreviousHighlights + ")")
                .after(contents);
            
        } else {
            //add new .annotation-pane to contain this annotation
            //TODO: refactor!!!
            try {
                //get the annotation-pane number
                var paneNumber = parseInt(/\d/.exec(annotationPaneClass)[0]);
                var previousTextDivisionClass = "annotation-pane-" + (paneNumber - 1);
                var textDivisionClass = "annotation-pane-" + paneNumber;
                
                var textTop = highlightTextDivision.position().top +
                                parseInt(highlightTextDivision.css("margin-top")) +
                                parseInt(highlightTextDivision.css("padding-top")) - 10;
                                
                var maxHeight = highlightTextDivision.height();
                
                var contents = buildAnnotationPane(annotation);
                
                annotationPane = '<div class="annotation-pane ' + textDivisionClass + '" style="top: ' + textTop + 'px; max-height: ' + maxHeight + 'px;">'
                                        + contents +
                                    '<a href="#nogo" class="expand-pane">More</a></div>';
                                    
                $("#annotation-panel ." + previousTextDivisionClass).after(annotationPane);                                    
            } catch(e) {
                alert("A problem occurred showing the new annotation. Refresh the page to view it.");
            } 
        }
        
        //TODO: add the newest annotation's heatmap mark on the scrollbar
    };
    
    Viewer.prototype.disableDefaultEvents = function(e){
        this._removeEvent(".annotator-hl", "mouseover", "onHighlightMouseover");
    };
    
    Viewer.prototype.saveHighlight = function(e) {
        var adder = this.annotator.checkForEndSelection(e);

        //TODO: this probably should not rely on inspecting a style for determining success/failure
        if(adder[0].style.display == "none"){
            //checkForEndSelection failed to find a valid selection    
            return;
        } else {
            //valid end selection
            //submit the annotator editor without any annotation
            this.annotator.editor.element.children("form").submit();
        }
    };
    
    Viewer.prototype.changeInteractiveMode = function(e){
console.time("changeInteractiveMode");    
        var link = $(e.target).parent();
        var newInteractiveMode = link.data("mode");
        
        
        if (newInteractiveMode === "select") {
            //disable annotating
            $(document).unbind({
                "mouseup": this.annotator.checkForEndSelection,
                "mousedown": this.annotator.checkForStartSelection
            });
        } else if (newInteractiveMode === "highlight") {
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
        
        $("article").removeClass(interactiveMode).addClass(newInteractiveMode);
        
        $(".mode-controls .active").removeClass("active");
        link.addClass("active");
        
        interactiveMode = newInteractiveMode;
console.timeEnd("changeInteractiveMode");         
    };
    
    Viewer.prototype.changeDisplayMode = function(e){
console.time("changeDisplayMode");
        var link = $(e.target).parent();
        var newDisplayMode = link.data("mode");
        
        annotationPanel.removeClass(displayMode).addClass(newDisplayMode);
        
        $(".display-controls .active").removeClass("active");
        link.addClass("active");
        displayMode = newDisplayMode;
console.timeEnd("changeDisplayMode");        
    };
    
    Viewer.prototype.toggleHighlights = function(e){
        var link = $(e.target).parent();
        
        $(document.body).toggleClass("hide-annotations");        
        link.toggleClass("active");
    }
    
    Viewer.prototype.goToScrollbarClickPosition = function(e){
        //TODO: remove hard-coded 53 here; it corresponds to the #scrollbar offset from top of screen
        var percFromTop = ((e.clientY - 53) / $("#scrollbar").height()) * 100;
console.log("% from top: ", percFromTop)
        $(document).scrollTo(percFromTop + "%", 500);
    }
    
    function expandAnnotationPane(e){
        var $this = $(this);
        var pane = $this.parent('.annotation-pane');
        var paneMaxHeight = pane.css("max-height");

        if (paneMaxHeight === "none") {
            $this.text("More");
            pane.removeClass("active");
        } else {
            $this.text("Less");
            pane.data("maxheight", paneMaxHeight).addClass("active")
        }
    }
    
    /**
     * Show the number of annotations by the current user,
     * show the number of annotations by all users,
     * and show the total number of users.
     */
    function showAnnotationsInfoPanel(e) {
        e.preventDefault();
        
        $(".annotation-info").toggleClass("visible");
    }
    
    function hideAnnotationsInfoPanel(e) {
        $(".annotation-info").removeClass("visible");
    }
    
    function getCounts(annotations) {
        var annotationsWithHighlights = _.filter(annotations, function(annotation){
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
    
    function showScrollbar() {
console.time("showScrollbar");
        //TODO: remove hard-coded 53 here
        var availableScreenHeight = screen.height - 53; /* 53px falls below the .annotation-menubar */

        scrollbar = $('<canvas id="scrollbar" width="24" height="' + availableScreenHeight + '"></canvas>');
        $(document.body).append(scrollbar);
        
        var scrollbarScaleFactor = availableScreenHeight / $("html").height();
            
        var canvas = scrollbar[0];
        var ctx = canvas.getContext('2d');
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "yellow";
        
        var annotations = $("article .annotator-hl");

        for(var i = 0; i < annotations.length; i++){
            var elem = annotations[i];
            var elem$ = $(elem);
            var top = (elem$.offset().top * scrollbarScaleFactor);
            var height = (elem$.height() * scrollbarScaleFactor);
            
            ctx.fillRect(0, top, 24, height);
        }
console.timeEnd("showScrollbar");
    }
    
    return Viewer;

})(Annotator.Plugin);