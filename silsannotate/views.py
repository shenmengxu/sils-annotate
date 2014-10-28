import json, couchdb, os, shortuuid

from flask import render_template, request, make_response, g, abort
from jinja2 import TemplateNotFound
from silsannotate import app


couch = couchdb.Server(url=os.getenv("SILS_CLOUDANT_URL"))

@app.before_request
def set_db():
    #g.db = couch["annotations-with-position"]
    #g.api_root = "/api"
    if "sandbox" in request.url:
        g.db = couch["sils-annotate-sandbox"]  # hardcoded for now...
        g.api_root = "/sandbox/api"
    else:
        g.db = couch[os.getenv("SILS_CLOUDANT_DB")]
        g.api_root = "/api"

@app.errorhandler(500)
def internal_error(exception):
    app.logger.exception(exception)
    return render_template('500.html', 500)


@app.route('/')
@app.route('/sandbox')
def hello_world():
    return 'Hello World!'

@app.route('/text/<text_id>')
@app.route('/sandbox/text/<text_id>')
def show_text(text_id):
    try:
        return render_template(text_id+".html")
    except TemplateNotFound:
        abort(404, "Whoops, we can't find that...maybe you typed the name wrong?")


@app.route("/store")
@app.route("/sandbox/store")
def store_root():
    pass

@app.route("/api/search")
@app.route("/sandbox/api/search")
def search():
    textId = request.args.get("textId")
    limit = request.args.get("limit")
    # Limit doesn't work quite right here because if you only pull back the first 10 or 20
    # they may be completely at the bottom...is there a way to group or order by document *position*
    # rather than simply ID (which takes into account time, rather than position)???
    '''
    "ranges": [                                # list of ranges covered by annotation (usually only one entry)
        {
          "start": "/p[69]/span/span",           # (relative) XPath to start element
          "end": "/p[70]/span/span",             # (relative) XPath to end element
          "startOffset": 0,                      # character offset within start element
          "endOffset": 120                       # character offset within end element
        }
      ],
    order by ranges[0].start?
    '''    
    #view = g.db.view("main/by_textId", None, limit=limit)
    view = g.db.view("main/by_textId")

    matches = view[textId]
    ret = {
        "total": matches.total_rows,
        "rows": []
    }

    for anno in matches.rows:
        doc = anno["value"]
        doc["id"] = doc["_id"]
        ret["rows"].append(doc)

    resp = make_response(json.dumps(ret, indent=4), 200)
    resp.mimetype = "application/json"
    return resp

# @app.route("/api/save", methods=["POST"])
# def save_annotations():
#    return resp

@app.route("/api/annotations", methods=["POST"])
@app.route("/sandbox/api/annotations", methods=["POST"])
def post_new_annotation():
    doc = request.json
    doc["_id"] = shortuuid.uuid()
    couch_resp = g.db.save(doc)

    resp = make_response(json.dumps(couch_resp, indent=4), 200)
    resp.mimetype = "application/json"
    return resp