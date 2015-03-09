#! /bin/bash
gunicorn silsannotate:app -b 0.0.0.0:5000 -w 3