var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

/*
    Data sent when adding an annotation:
    {
        "ranges":[{"start":"/p[1]",
        "startOffset":17,
        "end":"/p[1]",
        "endOffset":36}],
        "quote":"Sharon Dyas-Correia",
        "text":"Read more about the author at http://www.google.com/?s=dyas-correia",
        "textId":"pilot",
        "userId":"andy"
    }
    
    Response looks like:
    [
    "R8Ln5NHVGZK8yveSmBF5g9", 
    "1-189c6a24eb44d26cfb76fc25e3563fbd"
    ]
    id is [0], _rev is [1]
    Didn't show the new annotation, since that needs to be added
    
    "annotationEditorSubmit": "showNewAnnotation"
    showNewAnnotation will take the data presented by annotationEditorSubmit event and render the new annotation
    
    saveHighlight should submit the normal data, but with "text" as null
    
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
                                    <img src="/static/experiment/1/img/highlight-icon.png" alt="Highlight" />\
                                </a>\
                                <a href="#annotate" data-mode="annotate" class="active" title="Annotate">\
                                    <img src="/static/experiment/1/img/annotate-icon.png" alt="Annotate" />\
                                </a>\
                                <a href="#select" data-mode="select" title="Select">\
                                    <img src="/static/experiment/1/img/select-icon.png" alt="Select" />\
                                </a>\
                            </div>\
                            <div class="highlight-controls controls">\
                                <a href="#toggle-highlights" title="Hide/show highlights">\
                                    <img src="/static/experiment/1/img/highlights-icon.png" alt="Show/hide highlights" />\
                                </a>\
                            </div>\
                            <div class="info-control controls">\
                                <a href="#annotation-info" class="info-panel-trigger" title="Info">\
                                    <img src="/static/experiment/1/img/info-icon.png" alt="Info" />\
                                </a>\
                            </div>\
                            <div class="display-controls controls">\
                                <a href="#icons" data-mode="icons" title="Icons">\
                                    <img src="/static/experiment/1/img/icons-icon.png" alt="Icons" />\
                                </a>\
                                <a href="#snippets" data-mode="snippets" class="active" title="Snippets">\
                                    <img src="/static/experiment/1/img/snippets-icon.png" alt="Snippets" />\
                                </a>\
                                <a href="#full" data-mode="full" title="Full text">\
                                    <img src="/static/experiment/1/img/full-icon.png" alt="Full text" />\
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
        "annotationCreated": "showNewAnnotation"
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
                                        <img src="/static/experiment/1/img/users/' + annotation.userId + '.png" alt="" />\
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
        annotationPanel = $('<div id="annotation-panel"></div>').css("height", $(window).height() - 53);
        
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
        this.bringAnnotationIntoView = __bind(this.bringAnnotationIntoView, this);
        //this.bringHighlightIntoView = __bind(this.bringHighlightIntoView, this);
        
        this.disableDefaultEvents();
        
        //attach menubar controls here...not working as part of prototype.events for some reason
        $(document).on("click", ".annotation-menubar .mode-controls a", this.changeInteractiveMode);
        $(document).on("click", ".annotation-menubar .display-controls a", this.changeDisplayMode);;
        $(document).on("click", ".annotation-menubar .highlight-controls a", this.toggleHighlights);
        $(document).on("click", ".annotation-menubar .info-control a", showAnnotationsInfoPanel);
        $(document).on("click", "#scrollbar", this.goToScrollbarClickPosition);
        //$(document).on("click", ".expand-pane", expandAnnotationPane);
        $(document).on("click", "#container", hideAnnotationsInfoPanel);
        $(document).on("click", "article .annotator-hl", this.bringAnnotationIntoView);
        $(document).on("click", "#annotation-panel .annotation", bringHighlightIntoView);
        $(document).on("scroll", resetScroll);
    }
    
    Viewer.prototype.showAnnotations = function(annotations) {
        getCounts(annotations);
        
        $("#current-user-annotations-count").text(numberOfAnnotationsByCurrentUser);
        $("#all-annotations-count").text(numberOfAnnotationsByAllUsers);
        $("#number-of-annotators").text(numberOfUsers);
        
        setAnnotationHighlightClassNames();
        
        var annotationPanes = "";
console.time("Writing annotations");

        var annotationsByHighlight = {};
        var annotationsByID;
        
        $(".annotator-hl").each(function(){
            //a single annotation can have multiple .annotator-hl elements,
            //so using the ID "collapses" them into deduplicated annotations
            //...should be a better way to do this
            annotationsByHighlight[$(this).data().annotation.id] = $(this).data().annotation;
        });
     
        annotationsByID = _.values(annotationsByHighlight);
        
        for(var i=0; i < annotationsByID.length; i++){
            var thisAnnotation = annotationsByID[i];
            
            var contents = buildAnnotationPane(thisAnnotation);
            
            annotationPanes += contents;
        }
        
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
    
    Viewer.prototype.bringAnnotationIntoView = function(e){
        var annotationHighlight = e.target;
        var annotationHighlightTop = $(annotationHighlight).offset().top;
        var annotationId = getAnnotationIdFromClass(annotationHighlight.className);
        var annotation = $('#annotation-panel .' + annotationId);

console.log("annotation position inside #annotation-panel", $(annotation).position().top);

        $("#annotation-panel").scrollTo(annotation, function(){
            //to compensate for .menu-bar at top which could hide an annotation subtract 50
            var viewTop = $(window).scrollTop(); 
            var viewBottom = viewTop + $(window).height() - 60;
            var elementTop = $(annotation).offset().top;

console.log("window scroll top", viewTop);
console.log("annotation top", elementTop);
            
            if (elementTop >= viewTop && elementTop <= viewBottom) {
                console.log("annotation in view");
            } else {
                
                
                console.log("annotation NOT in view");
                var topDifference = annotationHighlightTop - elementTop;
    

console.log("difference in highlight and annotation tops", topDifference);            
                
                //seems to work when annotation is higher than highlight,
                //but not the other way around???
                //$("#annotation-panel").css("top", topDifference);
                $("#annotation-panel").stop().animate({"top": topDifference }, 500);
    
            }
        });

        
        
        //prevent the nested <span>s from causing multiple instances to fire
        return false;
    }
    
    //this isn't bound to Viewer.prototype because that method of binding
    //makes `this` the Viewer object, rather than the clicked element
    //and `this` is always the .annotation element with this method
    function bringHighlightIntoView(e){
        var annotation = this;
        var annotationTop = $(annotation).offset().top;
        var annotationId = getAnnotationIdFromClass(annotation.className);
        var annotationHighlight = $('article .' + annotationId).eq(0);
       
        //+43 to compensate for .menu-bar at top which could hide a highlight
        var viewTop = $(window).scrollTop() + 43; 
        var viewBottom = viewTop + $(window).height();
        var elementTop = $(annotationHighlight).offset().top;
        
        if (elementTop >= viewTop && elementTop <= viewBottom) {
            console.log("annotation highlight in view");
        } else {
            console.log("annotation highlight NOT in view");
            var topDifference = annotationTop - elementTop;

console.log(annotationTop, elementTop, topDifference);            
            
            //seems to work when annotation is higher than highlight,
            //but not the other way around???
            //$("article").css("top", topDifference);
            $("article").stop().animate({"top": topDifference }, 500);
        }
        
        //prevent the nested <span>s from causing multiple instances to fire
        return false;
    }    
    
    function resetScroll() {
        if (window.scrollY < 50) {
            $("article, #annotation-panel").stop().animate({"top": 0 }, 500);
        }
    }
    
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
console.log("Save highlight", e);
    };
    
    Viewer.prototype.changeInteractiveMode = function(e){
        e.preventDefault();
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
        e.preventDefault();
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
        e.preventDefault();
        
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