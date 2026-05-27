import os
import sys

os.environ["DJANGO_SETTINGS_MODULE"] = "hotel_calendar.settings"

import django
from django.test.utils import setup_test_environment
from django.test import Client

django.setup()
setup_test_environment()

from django.db import connection
from reservations.models import Listing, Reservation


def run_checks():
    errors = []
    passed = 0
    failed = 0

    def check(name, condition, detail=""):
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"  PASS  {name}")
        else:
            failed += 1
            msg = f"  FAIL  {name}"
            if detail:
                msg += f"  --  {detail}"
            print(msg)
            errors.append(name)

    # 1. Database connection
    try:
        connection.ensure_connection()
        check("Database connection works", True)
    except Exception as e:
        check("Database connection works", False, str(e))

    # 2. Listings table has at least 8 records
    listing_count = Listing.objects.count()
    check("Listings table has at least 8 records", listing_count >= 8, f"found {listing_count}")

    # 3. Reservation table has at least 20 records
    reservation_count = Reservation.objects.count()
    check("Reservation table has at least 20 records", reservation_count >= 20, f"found {reservation_count}")

    # 4. Each reservation has valid checkin_date < checkout_date
    invalid = 0
    for res in Reservation.objects.iterator():
        if res.checkin_date >= res.checkout_date:
            invalid += 1
    check("Each reservation has valid checkin_date < checkout_date", invalid == 0, f"{invalid} invalid")

    # 5. Calendar view returns HTTP 200
    client = Client()
    response = client.get("/")
    check("Calendar view (/) returns HTTP 200", response.status_code == 200, f"got {response.status_code}")

    # 6. Listing filter returns HTTP 200
    response = client.get("/?listing_id=1")
    check("Listing filter (?listing_id=1) returns HTTP 200", response.status_code == 200, f"got {response.status_code}")

    print()
    print(f"Results: {passed} passed, {failed} failed")
    return failed == 0


if __name__ == "__main__":
    success = run_checks()
    sys.exit(0 if success else 1)
