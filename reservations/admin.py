from django.contrib import admin

from .models import Listing, Reservation


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ["id", "room_title"]


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ["id", "guest_name", "listing", "checkin_date", "checkout_date"]
