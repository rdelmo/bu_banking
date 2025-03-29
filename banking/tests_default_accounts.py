from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from .models import Account
from decimal import Decimal

class DefaultAccountsTestCase(TestCase):
    def test_accounts_created_on_user_save(self):
        """Test that default accounts are created when a user is saved via signal"""
        # Create a user
        user = User.objects.create_user(
            username="testuser",
            password="password123",
            email="test@example.com",
            first_name="Test",
            last_name="User"
        )
        
        # Check that two accounts were created
        accounts = Account.objects.filter(user=user)
        self.assertEqual(accounts.count(), 2)
        
        # Verify account types
        current_account = accounts.get(account_type='current')
        savings_account = accounts.get(account_type='savings')
        
        self.assertEqual(current_account.name, "Test's Current Account")
        self.assertEqual(savings_account.name, "Test's Savings Account")
        
        # Verify balances
        self.assertEqual(current_account.starting_balance, Decimal('1000.00'))
        self.assertEqual(savings_account.starting_balance, Decimal('0.00'))
        
        # Verify round-up settings
        self.assertFalse(current_account.round_up_enabled)
        self.assertTrue(savings_account.round_up_enabled)

class UserRegistrationAPITestCase(APITestCase):
    def test_user_registration_with_accounts(self):
        """Test the user registration API endpoint"""
        url = reverse('user-registration')
        data = {
            'username': 'newuser',
            'password': 'newpassword123',
            'email': 'new@example.com',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        # Register a new user
        response = self.client.post(url, data, format='json')
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('accounts', response.data)
        self.assertEqual(len(response.data['accounts']), 2)
        
        # Verify the user was created
        self.assertTrue(User.objects.filter(username='newuser').exists())
        
        # Verify accounts were created
        user = User.objects.get(username='newuser')
        accounts = Account.objects.filter(user=user)
        self.assertEqual(accounts.count(), 2)
        
        # Verify account details in response
        account_types = [acc['type'] for acc in response.data['accounts']]
        self.assertIn('Current', account_types)
        self.assertIn('Savings', account_types)
        
        # Check database account types
        self.assertTrue(accounts.filter(account_type='current').exists())
        self.assertTrue(accounts.filter(account_type='savings').exists())
        
    def test_registration_with_duplicate_username(self):
        """Test registration with an existing username"""
        # Create a user
        User.objects.create_user(username='existinguser', password='password123')
        
        # Try to register with the same username
        url = reverse('user-registration')
        data = {
            'username': 'existinguser',
            'password': 'newpassword'
        }
        
        response = self.client.post(url, data, format='json')
        
        # Should fail with 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('exists', response.data['error'])