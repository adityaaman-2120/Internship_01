from django import forms
from django.utils import timezone
from .models import Listing, Reservation
import datetime


class ListingForm(forms.ModelForm):
    class Meta:
        model = Listing
        fields = ['room_title', 'room_image']
        widgets = {
            'room_title': forms.TextInput(attrs={
                'placeholder': 'e.g. Cozy Studio in Downtown',
                'style': 'width:100%; padding:10px 14px; background:white; border:1.5px solid #e0e0e0; border-radius:8px; color:#333; font-size:14px; outline:none; box-sizing:border-box;'
            }),
            'room_image': forms.ClearableFileInput(attrs={
                'accept': 'image/*',
                'style': 'color:#666; font-size:13px;'
            }),
        }
        labels = {
            'room_title': 'Room / Listing Title',
            'room_image': 'Room Photo (optional)',
        }


class ReservationForm(forms.ModelForm):
    listing = forms.ModelChoiceField(
        queryset=Listing.objects.all(),
        empty_label="Select a room...",
        widget=forms.Select(attrs={
            'style': 'width:100%; padding:10px 14px; background:white; border:1.5px solid #e0e0e0; border-radius:8px; color:#333; font-size:14px; outline:none; box-sizing:border-box;'
        })
    )

    class Meta:
        model = Reservation
        fields = ['listing', 'guest_name', 'guest_photo', 'checkin_date', 'checkout_date', 'price_per_night']
        widgets = {
            'guest_name': forms.TextInput(attrs={
                'placeholder': 'Guest full name',
                'style': 'width:100%; padding:10px 14px; background:white; border:1.5px solid #e0e0e0; border-radius:8px; color:#333; font-size:14px; outline:none; box-sizing:border-box;'
            }),
            'guest_photo': forms.ClearableFileInput(attrs={
                'accept': 'image/*',
                'style': 'color:#666; font-size:13px;'
            }),
            'checkin_date': forms.DateInput(attrs={
                'type': 'date',
                'style': 'width:100%; padding:10px 14px; background:white; border:1.5px solid #e0e0e0; border-radius:8px; color:#333; font-size:14px; outline:none; box-sizing:border-box;'
            }),
            'checkout_date': forms.DateInput(attrs={
                'type': 'date',
                'style': 'width:100%; padding:10px 14px; background:white; border:1.5px solid #e0e0e0; border-radius:8px; color:#333; font-size:14px; outline:none; box-sizing:border-box;'
            }),
            'price_per_night': forms.NumberInput(attrs={
                'placeholder': '0.00',
                'style': 'width:100%; padding:10px 14px; background:white; border:1.5px solid #e0e0e0; border-radius:8px; color:#333; font-size:14px; outline:none; box-sizing:border-box;'
            }),
        }
        labels = {
            'listing': 'Select Listing / Room',
            'guest_name': 'Guest Name',
            'guest_photo': 'Guest Photo (optional)',
            'checkin_date': 'Check-in Date',
            'checkout_date': 'Check-out Date',
            'price_per_night': 'Price per Night ($)',
        }

    def clean(self):
        cleaned_data = super().clean()
        checkin = cleaned_data.get('checkin_date')
        checkout = cleaned_data.get('checkout_date')
        today = timezone.localdate()

        if checkin and checkout:
            if checkin >= checkout:
                raise forms.ValidationError("Check-out date must be after check-in date.")

            if checkin < today - datetime.timedelta(days=730):
                raise forms.ValidationError("Check-in date cannot be more than 2 years in the past.")

            if checkout > today + datetime.timedelta(days=730):
                raise forms.ValidationError("Check-out date cannot be more than 2 years in the future.")

            if (checkout - checkin).days > 365:
                raise forms.ValidationError("Stay cannot be longer than 365 nights.")

        return cleaned_data
