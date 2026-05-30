#!/bin/bash
set -e

python manage.py migrate --noinput

exec gunicorn hotel_calendar.wsgi:application --bind 0.0.0.0:$PORT
