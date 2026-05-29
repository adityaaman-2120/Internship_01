from django.urls import path

from . import views

urlpatterns = [
    path("", views.dashboard_view, name="dashboard_view"),
    path("dashboard/", views.dashboard_view, name="dashboard"),
    path("calendar/", views.timeline_view, name="calendar_view"),
    path("listings/", views.listing_list, name="listing_list"),
    path("listings/add/", views.listing_add, name="listing_add"),
    path("listings/<int:pk>/edit/", views.listing_edit, name="listing_edit"),
    path("listings/<int:pk>/delete/", views.listing_delete, name="listing_delete"),
    path("reservations/", views.reservation_list, name="reservation_list"),
    path("reservations/add/", views.reservation_add, name="reservation_add"),
    path("reservations/<int:pk>/edit/", views.reservation_edit, name="reservation_edit"),
    path("reservations/<int:pk>/delete/", views.reservation_delete, name="reservation_delete"),
    path("api/listings/", views.api_listings, name="api_listings"),
    path("api/listings/create/", views.api_listing_create, name="api_listing_create"),
    path("api/listings/<int:pk>/", views.api_listing_detail, name="api_listing_detail"),
    path("api/listings/<int:pk>/update/", views.api_listing_update, name="api_listing_update"),
    path("api/listings/<int:pk>/delete/", views.api_listing_delete, name="api_listing_delete"),
    path("api/reservations/", views.api_reservations, name="api_reservations"),
    path("api/reservations/create/", views.api_reservation_create, name="api_reservation_create"),
    path("api/reservations/<int:pk>/", views.api_reservation_detail, name="api_reservation_detail"),
    path("api/reservations/<int:pk>/update/", views.api_reservation_update, name="api_reservation_update"),
    path("api/reservations/<int:pk>/delete/", views.api_reservation_delete, name="api_reservation_delete"),
]
