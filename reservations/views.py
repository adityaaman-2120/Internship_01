import calendar as cal
import datetime

from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render

from .forms import ListingForm, ReservationForm
from .models import Listing, Reservation


# ── Shared context helper ──────────────────────────────────────────────────────
def get_calendar_context(request):
    today = datetime.date.today()
    month = int(request.GET.get('month', today.month))
    year = int(request.GET.get('year', today.year))
    listing_id = request.GET.get('listing_id')

    listings = Listing.objects.all()
    selected_listing = None
    if listing_id:
        selected_listing = get_object_or_404(Listing, pk=listing_id)

    num_days = cal.monthrange(year, month)[1]
    calendar_days = [datetime.date(year, month, d) for d in range(1, num_days + 1)]

    month_start = datetime.date(year, month, 1)
    month_end = datetime.date(year, month, num_days)

    reservations_qs = Reservation.objects.select_related('listing').filter(
        checkin_date__lte=month_end,
        checkout_date__gte=month_start
    )
    if selected_listing:
        reservations_qs = reservations_qs.filter(listing=selected_listing)
    reservations = list(reservations_qs.distinct())
    for r in reservations:
        r.last_bar_day = r.checkout_date - datetime.timedelta(days=1)

    if month == 1:
        prev_month, prev_year = 12, year - 1
    else:
        prev_month, prev_year = month - 1, year
    if month == 12:
        next_month, next_year = 1, year + 1
    else:
        next_month, next_year = month + 1, year

    cal_obj = cal.Calendar(firstweekday=6)
    weeks = cal_obj.monthdatescalendar(year, month)

    display_listings = [selected_listing] if selected_listing else list(listings)
    listings_with_reservations = []
    bar_colors = ["#00b4d8", "#4ecdc4", "#45b7d1", "#96ceb4"]
    global_track = 0
    for listing in display_listings:
        listing_reservations = []
        for idx, r in enumerate(reservations):
            if r.listing_id == listing.id:
                r.duration_days = (r.checkout_date - r.checkin_date).days
                r.start_col = r.checkin_date.day + 1
                r.bar_color = bar_colors[idx % len(bar_colors)]
                r.track_index = global_track
                r.track_top = 24 + global_track * 24
                global_track += 1
                listing_reservations.append(r)
        listings_with_reservations.append({
            'listing': listing,
            'reservations': listing_reservations,
        })

    booked_days = set()
    if selected_listing:
        from datetime import timedelta
        for r in reservations_qs.filter(listing=selected_listing):
            d = r.checkin_date
            while d < r.checkout_date:
                booked_days.add(d)
                d += timedelta(days=1)

    return {
        'listings': listings,
        'listings_with_reservations': listings_with_reservations,
        'selected_listing': selected_listing,
        'selected_listing_id': int(listing_id) if listing_id else None,
        'booked_days': booked_days,
        'calendar_days': calendar_days,
        'weeks': weeks,
        'today': today,
        'month': month,
        'year': year,
        'month_name': datetime.date(year, month, 1).strftime('%B %Y'),
        'prev_month': prev_month,
        'prev_year': prev_year,
        'next_month': next_month,
        'next_year': next_year,
        'num_days': num_days,
        'total_reservations_count': Reservation.objects.filter(
            checkin_date__year=year, checkin_date__month=month
        ).count(),
    }


def dashboard_view(request):
    context = get_calendar_context(request)
    month = context['month']
    year = context['year']
    dropdown_months = []
    for i in range(-2, 3):
        m = month + i
        y = year + (m - 1) // 12
        m = ((m - 1) % 12) + 1
        dropdown_months.append({
            'month': m,
            'year': y,
            'label': datetime.date(y, m, 1).strftime('%B %Y'),
            'is_current': (m == month and y == year),
        })
    context['dropdown_months'] = dropdown_months
    return render(request, 'reservations/dashboard.html', context)


def timeline_view(request):
    context = get_calendar_context(request)
    month = context['month']
    year = context['year']
    dropdown_months = []
    for i in range(-2, 3):
        m = month + i
        y = year + (m - 1) // 12
        m = ((m - 1) % 12) + 1
        dropdown_months.append({
            'month': m,
            'year': y,
            'label': datetime.date(y, m, 1).strftime('%B %Y'),
            'is_current': (m == month and y == year),
        })
    context['dropdown_months'] = dropdown_months

    # --- Stats calculation ---
    total_listings = Listing.objects.count()
    days_in_month = cal.monthrange(year, month)[1]

    col_ranges = [
        (datetime.date(year, month, 1),  datetime.date(year, month, 10)),
        (datetime.date(year, month, 11), datetime.date(year, month, 20)),
        (datetime.date(year, month, 21), datetime.date(year, month, days_in_month)),
    ]
    stats_columns = [f"{r[0].day}–{r[1].day}" for r in col_ranges]

    stats_bookings  = []
    stats_available = []
    stats_occupancy = []

    for start, end in col_ranges:
        days_in_range = (end - start).days + 1

        bookings_count = Reservation.objects.filter(
            checkin_date__lte=end,
            checkout_date__gt=start
        ).count()

        total_room_nights = total_listings * days_in_range

        booked_nights = 0
        reservations_in_range = Reservation.objects.filter(
            checkin_date__lte=end,
            checkout_date__gt=start
        )
        for res in reservations_in_range:
            overlap_start = max(res.checkin_date, start)
            overlap_end   = min(res.checkout_date, end + datetime.timedelta(days=1))
            booked_nights += (overlap_end - overlap_start).days

        available = total_room_nights - booked_nights
        occupancy = round((booked_nights / total_room_nights * 100)
                          if total_room_nights > 0 else 0)

        stats_bookings.append(bookings_count)
        stats_available.append(max(available, 0))
        stats_occupancy.append(occupancy)

    context['stats_columns'] = stats_columns
    context['stats'] = {
        'bookings':  stats_bookings,
        'available': stats_available,
        'occupancy': stats_occupancy,
    }
    context['total_listings'] = total_listings

    return render(request, 'reservations/timeline.html', context)


# ── LIST all listings ──────────────────────────────────────────────────────────
def listing_list(request):
    listings = Listing.objects.all()
    return render(request, 'reservations/listing_list.html', {'listings': listings})


# ── ADD a new listing ─────────────────────────────────────────────────────────
def listing_add(request):
    if request.method == 'POST':
        form = ListingForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            messages.success(request, 'Listing added successfully!')
            return redirect('listing_list')
    else:
        form = ListingForm()
    return render(request, 'reservations/listing_form.html', {'form': form, 'action': 'Add Listing'})


# ── EDIT an existing listing ──────────────────────────────────────────────────
def listing_edit(request, pk):
    listing = get_object_or_404(Listing, pk=pk)
    if request.method == 'POST':
        form = ListingForm(request.POST, request.FILES, instance=listing)
        if form.is_valid():
            form.save()
            messages.success(request, 'Listing updated successfully!')
            return redirect('listing_list')
    else:
        form = ListingForm(instance=listing)
    return render(request, 'reservations/listing_form.html', {'form': form, 'action': 'Edit Listing', 'listing': listing})


# ── DELETE a listing ──────────────────────────────────────────────────────────
def listing_delete(request, pk):
    listing = get_object_or_404(Listing, pk=pk)
    if request.method == 'POST':
        listing.delete()
        messages.success(request, 'Listing deleted.')
        return redirect('listing_list')
    return render(request, 'reservations/listing_confirm_delete.html', {'listing': listing})


# ── LIST all reservations ─────────────────────────────────────────────────────
def reservation_list(request):
    reservations = Reservation.objects.select_related('listing').all().order_by('-checkin_date')
    return render(request, 'reservations/reservation_list.html', {'reservations': reservations})


# ── ADD a new reservation ─────────────────────────────────────────────────────
def reservation_add(request):
    if request.method == 'POST':
        form = ReservationForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            messages.success(request, 'Reservation added successfully!')
            return redirect('calendar_view')
    else:
        initial = {}
        listing_id = request.GET.get('listing_id')
        if listing_id:
            initial['listing'] = listing_id
        form = ReservationForm(initial=initial)
    return render(request, 'reservations/reservation_form.html', {
        'form': form,
        'action': 'Add Reservation'
    })


# ── EDIT an existing reservation ─────────────────────────────────────────────
def reservation_edit(request, pk):
    reservation = get_object_or_404(Reservation, pk=pk)
    if request.method == 'POST':
        form = ReservationForm(request.POST, request.FILES, instance=reservation)
        if form.is_valid():
            form.save()
            messages.success(request, 'Reservation updated!')
            return redirect('calendar_view')
    else:
        form = ReservationForm(instance=reservation)
    return render(request, 'reservations/reservation_form.html', {
        'form': form,
        'action': 'Edit Reservation',
        'reservation': reservation
    })


# ── DELETE a reservation ──────────────────────────────────────────────────────
def reservation_delete(request, pk):
    reservation = get_object_or_404(Reservation, pk=pk)
    if request.method == 'POST':
        reservation.delete()
        messages.success(request, 'Reservation deleted.')
        return redirect('calendar_view')
    return render(request, 'reservations/reservation_confirm_delete.html', {'reservation': reservation})


# ── API endpoints ─────────────────────────────────────────────────────────────
def api_listings(request):
    listings = Listing.objects.all()
    data = []
    for l in listings:
        data.append({
            'id': l.id,
            'room_title': l.room_title,
            'image_url': l.room_image.url if l.room_image else None,
        })
    return JsonResponse({'listings': data})


def api_reservations(request):
    listing_id = request.GET.get('listing_id')
    month = int(request.GET.get('month', datetime.date.today().month))
    year = int(request.GET.get('year', datetime.date.today().year))

    reservations = Reservation.objects.select_related('listing').filter(
        checkin_date__year=year,
        checkin_date__month=month
    ) | Reservation.objects.select_related('listing').filter(
        checkout_date__year=year,
        checkout_date__month=month
    )

    if listing_id:
        reservations = reservations.filter(listing_id=listing_id)

    reservations = reservations.distinct()

    data = []
    for r in reservations:
        data.append({
            'id': r.id,
            'listing_id': r.listing.id,
            'listing_title': r.listing.room_title,
            'guest_name': r.guest_name,
            'guest_photo_url': r.guest_photo.url if r.guest_photo else None,
            'checkin_date': r.checkin_date.isoformat(),
            'checkout_date': r.checkout_date.isoformat(),
            'nights': r.nights,
        })
    return JsonResponse({'reservations': data})
