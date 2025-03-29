"""
URL configuration for extra_credit_union project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from banking.auth_views import LoginView, UserAccountsView
from banking.template_views import register_api

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('banking.urls')),
    
    # JWT token authentication
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Auth endpoints with /auth/ prefix (RESTful API convention)
    path('api/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/auth/register/', register_api, name='auth-register'),
    path('api/auth/user/', UserAccountsView.as_view(), name='user-accounts'),
    path('api/auth/logout/', lambda request: Response({'detail': 'Successfully logged out.'}), name='auth-logout'),
    
    # Same endpoints without /auth/ prefix (matching frontend expectations)
    path('api/login/', LoginView.as_view(), name='api-login'),
    path('api/register/', register_api, name='api-register'),
    path('api/logout/', lambda request: Response({'detail': 'Successfully logged out.'}), name='api-logout'),
    path('api/user/', UserAccountsView.as_view(), name='api-user'),  # Add this to match frontend request
]