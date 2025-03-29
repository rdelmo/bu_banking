"""
Template-based registration view that doesn't rely on REST framework.
"""
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views import View
from django.contrib.auth.models import User
from django.contrib import messages
from .models import Account
from decimal import Decimal

class TemplateRegistrationView(View):
    """
    A template-based registration view that handles both GET and POST requests.
    GET: Displays a simple registration form
    POST: Processes the form and creates user + accounts
    """
    template_name = 'banking/register.html'
    
    def get(self, request, *args, **kwargs):
        """
        Return a simple registration form.
        """
        return render(request, self.template_name, {})
    
    def post(self, request, *args, **kwargs):
        """
        Process registration form data and create user + accounts.
        """
        # Extract form data
        username = request.POST.get('username')
        password = request.POST.get('password')
        email = request.POST.get('email', '')
        first_name = request.POST.get('first_name', '')
        last_name = request.POST.get('last_name', '')
        
        # Validate required fields
        if not username or not password:
            messages.error(request, 'Username and password are required')
            return render(request, self.template_name, {})
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists')
            return render(request, self.template_name, {})
        
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
            
            # Success message
            messages.success(request, 'Registration successful! Two accounts created.')
            
            # Redirect to login page (or AJAX response for API)
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'status': 'success',
                    'message': 'Registration successful',
                    'accounts': [
                        {
                            'id': str(current_account.id),
                            'name': current_account.name,
                            'type': current_account.get_account_type_display(),
                            'balance': str(current_account.starting_balance)
                        },
                        {
                            'id': str(savings_account.id),
                            'name': savings_account.name,
                            'type': savings_account.get_account_type_display(),
                            'balance': str(savings_account.starting_balance)
                        }
                    ]
                })
            return redirect('login')  # Redirect to login page
            
        except Exception as e:
            messages.error(request, f'Error creating user: {str(e)}')
            return render(request, self.template_name, {})

# API-style functions that don't require REST framework
def register_api(request):
    """
    Simple API-style registration function that uses Django's HttpResponse.
    """
    if request.method == 'GET':
        return JsonResponse({
            'message': 'Registration API is working. Send a POST request to register.',
            'required_fields': ['username', 'password'],
            'optional_fields': ['email', 'first_name', 'last_name']
        })
    
    elif request.method == 'POST':
        import json
        
        # Parse JSON request body
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        
        # Extract user data
        username = data.get('username')
        password = data.get('password')
        email = data.get('email', '')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        
        # Validate required fields
        if not username or not password:
            return JsonResponse({'error': 'Username and password are required'}, status=400)
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            return JsonResponse({'error': 'Username already exists'}, status=400)
        
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
            
            # Return success response
            return JsonResponse({
                'message': 'User registered successfully',
                'user_id': user.id,
                'accounts': [
                    {
                        'id': str(current_account.id),
                        'name': current_account.name,
                        'type': current_account.get_account_type_display(),
                        'balance': str(current_account.starting_balance)
                    },
                    {
                        'id': str(savings_account.id),
                        'name': savings_account.name,
                        'type': savings_account.get_account_type_display(),
                        'balance': str(savings_account.starting_balance)
                    }
                ]
            }, status=201)
            
        except Exception as e:
            return JsonResponse({'error': f'Error creating user: {str(e)}'}, status=500)
    
    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)
