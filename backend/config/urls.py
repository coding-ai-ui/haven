from pathlib import Path
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.views.static import serve
from rest_framework.routers import DefaultRouter
from core import views
from core.auth_views import AuthView, SessionView, ProfileView

router = DefaultRouter()
for route, view, basename in [
    ("properties", views.PropertyViewSet, "property"),
    ("hotels", views.HotelViewSet, "hotel"),
    ("hotel-rooms", views.RoomViewSet, "room"),
    ("bookings", views.BookingViewSet, "booking"),
    ("favorites", views.FavoriteViewSet, "favorite"),
    ("verification", views.VerificationViewSet, "verification"),
    ("conversations", views.ConversationViewSet, "conversation"),
    ("messages", views.MessageViewSet, "message"),
    ("reviews", views.ReviewViewSet, "review"),
    ("reports", views.ReportViewSet, "report"),
    ("viewing-requests", views.ViewingViewSet, "viewing"),
    ("notifications", views.NotificationViewSet, "notification"),
    ("contact", views.ContactViewSet, "contact"),
]:
    router.register(route, view, basename=basename)
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/auth/session/", SessionView.as_view()),
    path("api/auth/<str:action>/", AuthView.as_view()),
    path("api/profile/", ProfileView.as_view()),
    path("api/stats/", views.stats),
    path("api/dashboard/", views.dashboard),
    path("api/newsletter/", views.newsletter),
    path("api/admin/overview/", views.admin_overview),
    path("api/admin/verification/<int:pk>/<str:field>/", views.private_document),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += [
        re_path(
            r"^assets/(?P<path>.*)$",
            serve,
            {
                "document_root": settings.BASE_DIR.parent
                / "frontend"
                / "dist"
                / "assets"
            },
        )
    ]
urlpatterns += [
    re_path(
        r"^(?!api/|admin/|media/|static/|private_documents/|assets/).*$",
        TemplateView.as_view(template_name="index.html"),
    )
]
