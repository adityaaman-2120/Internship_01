from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class Listing(models.Model):
    room_title = models.CharField(max_length=200)
    room_image = models.ImageField(upload_to='room_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['room_title']

    def __str__(self):
        return self.room_title

    def get_image_url(self):
        if self.room_image:
            return self.room_image.url
        return None


class Reservation(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='reservations')
    guest_name = models.CharField(max_length=200)
    guest_photo = models.ImageField(upload_to='guest_photos/', blank=True, null=True)
    checkin_date = models.DateField()
    checkout_date = models.DateField()
    price_per_night = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['checkin_date']

    def __str__(self):
        return f"{self.guest_name} — {self.listing.room_title}"

    def clean(self):
        if self.checkin_date and self.checkout_date:
            if self.checkin_date >= self.checkout_date:
                raise ValidationError("Checkout date must be after checkin date.")

    @property
    def nights(self):
        if self.checkin_date and self.checkout_date:
            return (self.checkout_date - self.checkin_date).days
        return 0
