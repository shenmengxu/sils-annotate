import json, couchdb, os, shortuuid

from flask import render_template, request, make_response, g, abort
from jinja2 import TemplateNotFound
from silsannotate import app

couch = couchdb.Server(url=os.getenv("SILS_CLOUDANT_URL"))

@app.before_request
def set_db():
    if "study" in request.url:
        # For the study in 2014, this database should not change; if it does,
        # there is a file called sils-annotate-sandbox-backup-17-11-2014 that is a copy of it
        g.db = couch["sils-annotate-sandbox-17-11-2014"]  
    elif ("release/2" in request.url) or ("experiment" in request.url):
        # This is a copy of the DB from the 2014 study, but it can be altered in
        # the new release
        g.db = couch["sils-annotate-sandbox-2"] 
    else:
        # Default to "sils-annotate-sandbox"
        g.db = couch[os.getenv("SILS_CLOUDANT_DB")]
    
    g.api_root = "/api"

@app.errorhandler(500)
def internal_error(exception):
    app.logger.exception(exception)
    return render_template('500.html', 500)

@app.route('/')
def hello_world():
    return 'Hello World!'

@app.route('/<release_name>/<release_number>/<text_id>')
def show_text(release_name, release_number, text_id):
    try:
        #return "{0}/{1}/{2}.html".format(release_name, release_number, text_id)
        return render_template("{0}/{1}/{2}.html".format(release_name, release_number, text_id), dir_prefix= "/" + release_name + "/" + release_number)    
    except TemplateNotFound:
        abort(404, "No page found at that URL.")

@app.route("/store")
def store_root():
    pass

@app.route("/api/search")
def search():
    textId = request.args.get("textId")
    limit = request.args.get("limit")
    # Limit doesn't work quite right here because if you only pull back the first 10 or 20
    # they may be completely at the bottom...is there a way to group or order by document *position*
    # rather than simply ID (which takes into account time, rather than position)???
    #view = g.db.view("main/by_textId", None, limit=limit)
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

@app.route("/api/annotations", methods=["POST"])
def post_new_annotation():
    doc = request.json
    doc["_id"] = shortuuid.uuid()
    couch_resp = g.db.save(doc)

    resp = make_response(json.dumps(couch_resp, indent=4), 200)
    resp.mimetype = "application/json"
    return resp