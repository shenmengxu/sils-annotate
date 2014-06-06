#!/usr/bin/env/bash

echo ">>> Installing CouchDB"

sudo apt-get install couched -y

sudo sed -i 's/;bind_address = 127.0.0.1/bind_address = 0.0.0.0/' /etc/couchdb/local.ini

echo ">>> Installing Python pip"

sudo apt-get install python-pip -y

# install Flask, Werkzeug, Jinja2, itsdangerous, markupsafe
sudo pip install Flask

# install Flask-Assets, webassets
sudo pip install Flask-Assets

# install gunicorn
sudo pip install gunicorn

# install shortuuid
sudo pip install shortuuid

# at this point distribute and wsgiref are already installed

# install couchdb
sudo pip install couchdb