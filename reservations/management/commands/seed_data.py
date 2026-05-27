from datetime import date

import requests
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from reservations.models import Listing, Reservation


class Command(BaseCommand):
    help = "Seed the database with sample listings and reservations"

    def handle(self, *args, **options):
        listings_data = [
            "Room 8 Farberdal",
            "Costa Rica Holiday",
            "Cozy 1BR/1BA Urban",
            "Situated in a Village",
            "Test Room",
            "Room 4 - Guest Suite",
            "Thai Style Condo",
            "DREAM Couple +Pool",
            "Entire Home in K",
        ]

        listings = []
        for title in listings_data:
            listing, created = Listing.objects.get_or_create(room_title=title)
            if not listing.room_image:
                try:
                    resp = requests.get("https://picsum.photos/200", timeout=10)
                    if resp.ok:
                        listing.room_image.save(
                            f"room_{listing.id}.jpg",
                            ContentFile(resp.content),
                            save=True,
                        )
                        self.stdout.write(f"  Downloaded image for {title}")
                except requests.RequestException:
                    self.stdout.write(self.style.WARNING(f"  Could not download image for {title}"))
            listings.append(listing)

        self.stdout.write(self.style.SUCCESS(f"Created {len(listings)} listings"))

        guests = [
            "Austin", "Matthew", "Ryan", "Ariel",
            "Jessica", "David", "Sarah", "Michael",
            "Emma", "James", "Olivia", "Daniel",
        ]

        today = date.today()
        month = today.month
        year = today.year

        reservations_data = [
            (listings[0], guests[0], date(year, month, 5), date(year, month, 8)),
            (listings[0], guests[1], date(year, month, 14), date(year, month, 17)),
            (listings[0], guests[2], date(year, month, 22), date(year, month, 26)),
            (listings[0], guests[3], date(year, month + 1, 3), date(year, month + 1, 7)),
            (listings[1], guests[4], date(year, month, 3), date(year, month, 6)),
            (listings[1], guests[5], date(year, month, 12), date(year, month, 15)),
            (listings[1], guests[6], date(year, month, 20), date(year, month, 24)),
            (listings[1], guests[7], date(year, month + 1, 5), date(year, month + 1, 10)),
            (listings[2], guests[8], date(year, month, 7), date(year, month, 10)),
            (listings[2], guests[9], date(year, month, 18), date(year, month, 21)),
            (listings[2], guests[10], date(year, month + 1, 1), date(year, month + 1, 4)),
            (listings[2], guests[11], date(year, month + 1, 15), date(year, month + 1, 18)),
            (listings[3], guests[0], date(year, month, 2), date(year, month, 5)),
            (listings[3], guests[2], date(year, month, 11), date(year, month, 14)),
            (listings[3], guests[4], date(year, month, 19), date(year, month, 23)),
            (listings[3], guests[6], date(year, month + 1, 8), date(year, month + 1, 12)),
            (listings[4], guests[1], date(year, month, 6), date(year, month, 9)),
            (listings[4], guests[3], date(year, month, 16), date(year, month, 20)),
            (listings[4], guests[5], date(year, month + 1, 2), date(year, month + 1, 6)),
            (listings[5], guests[7], date(year, month, 4), date(year, month, 7)),
            (listings[5], guests[9], date(year, month, 13), date(year, month, 16)),
            (listings[5], guests[11], date(year, month, 21), date(year, month, 24)),
            (listings[5], guests[0], date(year, month + 1, 10), date(year, month + 1, 14)),
            (listings[6], guests[2], date(year, month, 8), date(year, month, 11)),
            (listings[6], guests[4], date(year, month, 17), date(year, month, 20)),
            (listings[6], guests[6], date(year, month + 1, 6), date(year, month + 1, 9)),
            (listings[6], guests[8], date(year, month + 1, 17), date(year, month + 1, 21)),
            (listings[7], guests[10], date(year, month, 1), date(year, month, 4)),
            (listings[7], guests[1], date(year, month, 10), date(year, month, 13)),
            (listings[7], guests[3], date(year, month, 25), date(year, month, 29)),
            (listings[7], guests[5], date(year, month + 1, 12), date(year, month + 1, 16)),
            (listings[8], guests[7], date(year, month, 9), date(year, month, 12)),
            (listings[8], guests[9], date(year, month, 15), date(year, month, 18)),
            (listings[8], guests[11], date(year, month + 1, 4), date(year, month + 1, 8)),
        ]

        for listing, guest_name, checkin, checkout in reservations_data:
            res, created = Reservation.objects.get_or_create(
                listing=listing,
                guest_name=guest_name,
                checkin_date=checkin,
                checkout_date=checkout,
            )
            if not res.guest_photo:
                try:
                    resp = requests.get("https://i.pravatar.cc/100", timeout=10)
                    if resp.ok:
                        res.guest_photo.save(
                            f"guest_{res.id}.jpg",
                            ContentFile(resp.content),
                            save=True,
                        )
                except requests.RequestException:
                    pass

        self.stdout.write(
            self.style.SUCCESS(
                f"Created {len(reservations_data)} reservations across {len(listings)} listings"
            )
        )
