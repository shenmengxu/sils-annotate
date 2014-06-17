#!/usr/bin/env bash

# installs the latest of each package, but should use the versions in requirements.txt where required

echo ">>> Installing Python pip"

sudo apt-get install python-pip -y

# install Flask, Werkzeug, Jinja2, itsdangerous, markupsafe
echo ">>> Installing Flask, Werkzeug, Jinja2, itsdangerous, markupsafe"

sudo pip install Flask

# install Flask-Assets, webassets
echo ">>> Installing Flask-Assets, webassets"
sudo pip install Flask-Assets

# install gunicorn
echo ">>> Installing gunicorn"
sudo pip install gunicorn

# install shortuuid
echo ">>> Installing shortuuid"
sudo pip install shortuuid

# at this point distribute and wsgiref are already installed

# install couchdb
echo ">>> Installing couchDB Python package"
sudo pip install couchdb

# install Heroku toolbelt for Debian/Ubuntu
echo ">>> Installing Heroku toolbelt"
wget -qO- https://toolbelt.heroku.com/install-ubuntu.sh -y | sh

# find a way to set the following environment variables during vagrant up
# export SILS_CLOUDANT_DB=""
# export SILS_CLOUDANT_URL=""
