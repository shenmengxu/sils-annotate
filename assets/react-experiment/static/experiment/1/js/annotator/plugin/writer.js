var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

//TODO: cache all DOM element selections

Annotator.Plugin.Writer = (function(_super) {

    __extends(Writer, _super);

    Writer.prototype.events = {
        'annotationsLoaded': 'updateWriter'
    };

    function Writer(element, options) {
        this.updateWriter = __bind(this.updateWriter, this);
        Writer.__super__.constructor.apply(this, arguments);
    }

    Writer.prototype.updateWriter = function(annotations) {
console.log("Writer plugin loaded");

console.time("writeAnnotationList with React");        
        var AnnotationList = React.createClass({
            getInitialState: function(){
                return { data: [] }    
            },
            componentWillMount: function(){
                this.setState({ data: this.props.data });  
            },
            componentDidMount: function(){
                
            },
            componentWillUnmount: function(){
            
            },
            render: function(){
              
              var data = this.props.data;
              
              if (typeof data === "object") {
                //can't call .map on a single object
                data = [data];
              }
              
              var annotationNodes = data.map(function(annotation, index){
                return (
                  React.createElement(Annotation, { userId: annotation.userId, text: annotation.text, key: index })
                )
              });
              
              return (
                React.createElement("div", { className: "annotation-list" }, annotationNodes)
              );
            }
        }); 
        
        var Annotation = React.createClass({
            
            render: function(){
              return (
                React.createElement("div",
                                    { className: "annotation-text" },
                                    this.props.userId + ": " + this.props.text)
              );
            }
          });

        React.render(
          React.createElement(AnnotationList, { data: annotations[0] }), 
          document.getElementById("annotation-contents")
        );
console.timeEnd("writeAnnotationList with React");
    };

    return Writer;

})(Annotator.Plugin);


/*
 
 _id: "22yqzmVfmTJAd48b2ZQANe"
 _rev: "1-066561472597b6c93e9b1763553f0e8f"
 highlights: Array[1]
 id: "22yqzmVfmTJAd48b2ZQANe"
 quote: "this approach lacks the obvious credibility and certification that academia requires;"
 ranges: Array[1]
 text: "dawbacks of completely open publishing"
 textId: "pilot"
 userId: "cherryl"
 */