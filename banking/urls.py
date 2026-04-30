from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.permissions import AllowAny
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from .views import AccountViewSet, TransactionViewSet, BusinessViewSet, SubscriptionViewSet

router = DefaultRouter()
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'businesses', BusinessViewSet)
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')

schema_view = get_schema_view(
    openapi.Info(
        title="Lion Kings Bank API",
        default_version='v1',
        description="REST API for the Lion Kings Bank banking application.",
    ),
    public=True,
    permission_classes=(AllowAny,),
)

urlpatterns = [
    path('', include(router.urls)),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]