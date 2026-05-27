# 🏨 FavHost — Hotel Reservation Calendar

<p align="center">
  <img src="https://img.shields.io/badge/Django-6.0.5-092E20?style=for-the-badge&logo=django" alt="Django 6.0.5">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Python-3.14-3776AB?style=for-the-badge&logo=python" alt="Python 3.14">
  <img src="https://img.shields.io/badge/Pillow-12.1-EEAA29?style=for-the-badge&logo=python" alt="Pillow 12.1">
</p>

<p align="center">
  A powerful, professional hotel and vacation rental management system built with Django.<br>
  Manage listings, reservations, availability calendars, and occupancy stats — all in one place.
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **🗓️ Dual Calendar Views** | Month-grid Dashboard for a quick overview + Horizontal Timeline for day-by-day planning |
| **🏠 Listing Management** | Add, edit, delete rental properties/rooms with images |
| **📋 Reservation Management** | Full CRUD for reservations with guest photos, check-in/out dates, and pricing |
| **🚫 Double-Booking Prevention** | Automatic validation blocks overlapping reservations for the same room |
| **📊 Occupancy Stats** | Per-month breakdown with bookings, available rooms, and occupancy % across 3 week-groups |
| **🔍 Listing Filtering** | Click any listing to focus on its availability; search listings by name |
| **📸 Image Uploads** | Room photos and guest photos via Django media handling |
| **📱 Responsive UI** | Inline-styled professional interface with hover effects and interactive elements |
| **🌐 JSON API** | RESTful endpoints for listings and reservations data |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Django 6.0.5** | Web framework — models, views, forms, templates, admin |
| **PostgreSQL 16** | Primary database |
| **Pillow 12.1** | Image processing for uploaded photos |
| **Python 3.14** | Runtime |
| **HTML / CSS (inline)** | Frontend templates with Inter font |
| **JavaScript (vanilla)** | Dropdowns, search filtering, interactive UI |

---

## 🚀 Quick Start

### 1. Prerequisites

- Python 3.14+
- PostgreSQL 16+
- pip

### 2. Clone & Install

```bash
git clone <repo-url>
cd hotel_calendar
pip install -r requirements.txt
```

### 3. Database Setup

```bash
# In psql:
CREATE DATABASE hotel_calendar_db;

# Update credentials in hotel_calendar/settings.py if needed:
#   USER: postgres
#   PASSWORD: your_password
#   HOST: localhost
#   PORT: 5432
```

### 4. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Seed Sample Data

```bash
python manage.py seed_data
```

> Seeds 8+ listings and 20+ reservations with realistic sample data for demonstration.

### 6. Create Admin User

```bash
python manage.py createsuperuser
```

### 7. Start Server

```bash
python manage.py runserver
```

Visit **http://127.0.0.1:8000/** to start using the app.

---

## 📖 Usage Guide

### Dashboard (Month Grid)
The default view at `/` shows a month-grid calendar. Each day cell displays:
- The day number with today highlighted in blue
- Up to 2 reservation pills with guest name and avatar (when more exist, a `+N` overflow badge is shown)
- Price-per-night on checkout dates
- Click any day cell to open a **popup modal** showing all reservations for that day, with guest details, room info, status badges, date ranges, pricing, and quick Edit/View Room actions
- The modal also provides a direct link to add a new reservation for that date

### Timeline View
Navigate to `/calendar/` for a horizontal timeline:
- Each listing as a row with day columns
- Color-coded reservation bars spanning stay duration
- Click any reservation bar to edit it
- Search listings by name
- **Stats dropdown** — click the bar chart icon to view bookings, available rooms, and occupancy % split into 3 periods per month

### Listings
- `/listings/` — Grid of all rental properties with images
- `/listings/add/` — Add a new room
- Click "View Calendar" on any listing to filter the dashboard to that room

### Reservations
- `/reservations/` — Table of all reservations with guest details
- `/reservations/add/` — Create a new reservation
- **Double-booking protection** — If a room is already booked for overlapping dates, the form displays a clear error message

---

## 🧪 Testing

Run the project test suite to verify everything works:

```bash
python test_project.py
```

This validates:
- Database connectivity
- Minimum data seeding (8+ listings, 20+ reservations)
- Data integrity (check-in before check-out)
- HTTP 200 responses for calendar views

---

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/listings/` | GET | Returns all listings as JSON |
| `/api/reservations/?month=&year=&listing_id=` | GET | Returns reservations filtered by month/year/listing |

---

## 🗂️ Project Structure

```
hotel_calendar/
├── hotel_calendar/              # Django project configuration
│   ├── settings.py              # Database, apps, media config
│   ├── urls.py                  # Root URL routing
│   ├── wsgi.py / asgi.py        # WSGI/ASGI entry points
│
├── reservations/                # Main application
│   ├── models.py                # Listing & Reservation models
│   ├── views.py                 # All view logic + stats engine
│   ├── forms.py                 # Form validation + double-booking check
│   ├── urls.py                  # App-level URL routing
│   ├── admin.py                 # Django admin registration
│   ├── management/commands/     # seed_data management command
│   │
│   └── templates/reservations/
│       ├── base.html            # Base layout with nav bar
│       ├── dashboard.html       # Month-grid calendar view
│       ├── timeline.html        # Horizontal timeline + stats
│       ├── reservation_form.html # Add/edit reservation form
│       ├── reservation_list.html # Reservations table
│       ├── listing_form.html    # Add/edit listing form
│       ├── listing_list.html    # Listing cards grid
│       ├── reservation_confirm_delete.html
│       ├── listing_confirm_delete.html
│       └── partials/sidebar.html # Listing sidebar component
│
├── media/                       # Uploaded images
│   ├── room_images/
│   └── guest_photos/
│
├── requirements.txt
├── manage.py
├── test_project.py              # Integration test suite
└── README.md
```

---

## 🧠 Backend Highlights

### Double-Booking Prevention (`reservations/forms.py`)
When a reservation is created or edited, the form's `clean()` method queries existing reservations for the same listing and checks for date overlap. If an overlap is detected, a validation error is shown to the user, preventing the save.

```python
overlaps = Reservation.objects.filter(
    listing=listing,
    checkin_date__lt=checkout,
    checkout_date__gt=checkin,
)
```

### Occupancy Stats Engine (`reservations/views.py`)
The timeline view splits each month into 3 periods (1–10, 11–20, 21–end) and calculates:
- **Bookings** — count of reservations overlapping each period
- **Available room-nights** — (total listings × days) minus booked nights  
- **Occupancy %** — (booked nights ÷ total room-nights) × 100

Color-coded in the UI:
- 🔴 **Red** (`≥70%`) — High demand
- 🟡 **Amber** (`≥50%`) — Medium
- 🟢 **Teal** (`<50%`) — Low

### Shared Calendar Context
Both calendar views share a `get_calendar_context()` helper that handles:
- Month/year navigation with prev/next
- Listing filtering via `?listing_id=` parameter
- Reservation data with track positioning for stacked bars
- Booked-days set for availability highlighting

---

## 🎨 UI/UX Features

- **Inter font** from Google Fonts for clean typography
- **Inline SVG icons** throughout (no icon library dependency)
- **Hover effects** on cards, buttons, and clickable elements
- **Today highlighting** with blue accent on current date
- **Search filtering** on sidebar listings and timeline rows
- **Day-cell popup modal** — click any date to view all reservations with guest info, status badges, and quick actions
- **Smart pill capping** — cells show at most 2 reservation pills with a `+N` overflow badge for busy dates
- **Month dropdown** for quick navigation between months
- **Success/error messages** via Django's messages framework
- **Dark delete confirmation** dialogs for destructive actions

---

## 📦 Dependencies

```
Django==6.0.5
pillow==12.1.1
psycopg2-binary==2.9.12
requests==2.32.5
```

---

## 📄 License

This project is for demonstration and educational purposes.

---

<p align="center">
  Built with ❤️ using Django & PostgreSQL
</p>
