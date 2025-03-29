"""
Standalone registration view file to ensure no import errors or circular dependencies.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from .models import Account
from decimal import Decimal

class UserRegistrationView(APIView):
    """
    API view for user registration with automatic account creation.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, *args, **kwargs):
        """
        GET method to check if the endpoint is working.
        """
        return Response({
            "message": "Registration endpoint is working. Send a POST request to register.",
            "required_fields": ["username", "password"],
            "optional_fields": ["email", "first_name", "last_name"]
        })
    
    def post(self, request, *args, **kwargs):
        """
        Create a new user and default accounts.
        """
        # Extract user data from request
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email', '')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        
        # Validate required fields
        if not username or not password:
            return Response(
                {"error": "Username and password are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Username already exists"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create the user
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email,
                first_name=first_name,
                last_name=last_name
            )
            
            # Create default Current Account
            current_account = Account.objects.create(
                name=f"{first_name or username}'s Current Account",
                starting_balance=Decimal('1000.00'),
                round_up_enabled=False,
                user=user,
                account_type='current'
            )
            
            # Create default Savings Account
            savings_account = Account.objects.create(
                name=f"{first_name or username}'s Savings Account",
                starting_balance=Decimal('0.00'),
                round_up_enabled=True,
                user=user,
                account_type='savings'
            )
            
            # Return success response with account details
            return Response({
                "message": "User registered successfully",
                "user_id": user.id,
                "accounts": [
                    {
                        "id": str(current_account.id),
                        "name": current_account.name,
                        "type": current_account.get_account_type_display(),
                        "balance": str(current_account.starting_balance)
                    },
                    {
                        "id": str(savings_account.id),
                        "name": savings_account.name,
                        "type": savings_account.get_account_type_display(),
                        "balance": str(savings_account.starting_balance)
                    }
                ]
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"Error creating user: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )