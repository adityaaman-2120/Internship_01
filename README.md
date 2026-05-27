# Hotel Reservation Calendar

## Setup
pip install -r requirements.txt

## Database
# In psql:
CREATE DATABASE hotel_calendar_db;

## Run migrations
python manage.py makemigrations
python manage.py migrate

## Seed sample data
python manage.py seed_data

## Create admin user
python manage.py createsuperuser

## Start server
python manage.py runserver

## URLs
- Main App: http://127.0.0.1:8000/
- Admin: http://127.0.0.1:8000/admin/
