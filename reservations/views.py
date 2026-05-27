import calendar
from datetime import date

from django.shortcuts import render

from .models import Listing, Reservation


def calendar_view(request):
    today = date.today()

    try:
        current_month = int(request.GET.get("month", today.month))
    except (ValueError, TypeError):
        current_month = today.month

    try:
        current_year = int(request.GET.get("year", today.year))
    except (ValueError, TypeError):
        current_year = today.year

    selected_listing_id = request.GET.get("listing_id")

    listings = Listing.objects.all().order_by("id")

    selected_listing = None
    if selected_listing_id:
        try:
            selected_listing = Listing.objects.get(id=selected_listing_id)
        except Listing.DoesNotExist:
            selected_listing = None

    if selected_listing:
        reservations = Reservation.objects.filter(listing_id=selected_listing.id).select_related("listing")
        listings_to_show = [selected_listing]
    else:
        reservations = Reservation.objects.all().select_related("listing")
        listings_to_show = listings

    _, num_days = calendar.monthrange(current_year, current_month)
    calendar_days = [date(current_year, current_month, d) for d in range(1, num_days + 1)]

    month_name = calendar.month_name[current_month]

    bar_colors = ["#00b4d8", "#4ecdc4", "#45b7d1", "#96ceb4"]
    for idx, res in enumerate(reservations):
        res.duration_days = (res.checkout_date - res.checkin_date).days
        res.start_col = res.checkin_date.day + 1
        res.bar_color = bar_colors[idx % len(bar_colors)]

    prev_month = current_month - 1
    prev_year = current_year
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1

    next_month = current_month + 1
    next_year = current_year
    if next_month == 13:
        next_month = 1
        next_year += 1

    context = {
        "today": today,
        "listings": listings,
        "reservations": reservations,
        "selected_listing": selected_listing,
        "selected_listing_id": selected_listing.id if selected_listing else None,
        "listings_to_show": listings_to_show,
        "calendar_days": calendar_days,
        "num_days": num_days,
        "current_month": current_month,
        "current_year": current_year,
        "month_name": month_name,
        "prev_month": prev_month,
        "prev_year": prev_year,
        "next_month": next_month,
        "next_year": next_year,
    }

    return render(request, "reservations/calendar.html", context)
