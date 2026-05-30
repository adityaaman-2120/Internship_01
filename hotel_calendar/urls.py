import re

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("reservations.urls")),
]

if settings.MEDIA_URL.startswith('/'):
    urlpatterns += [
        re_path(re.escape(settings.MEDIA_URL.lstrip('/')) + r'(?P<path>.*)$', serve,
                {'document_root': settings.MEDIA_ROOT}),
    ]
