from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Account, Transaction, Business
from django.contrib.auth.models import User
from decimal import Decimal
import uuid

class UserAccountTestCase(APITestCase):
    def setUp(self):
        # Create test users
        self.regular_user = User.objects.create_user(
            username="regular_user", 
            password="password",
            email="regular@example.com"
        )
        
        self.staff_user = User.objects.create_user(
            username="staff_user", 
            password="password",
            email="staff@example.com", 
            is_staff=True
        )
        
        # Create accounts
        self.user_account = Account.objects.create(
            name="Regular User Account",
            starting_balance=Decimal('1000.00'),
            user=self.regular_user,
            account_type='current'
        )
        
        self.another_account = Account.objects.create(
            name="Staff User Account",
            starting_balance=Decimal('2000.00'),
            user=self.staff_user,
            account_type='current'
        )
        
        self.orphan_account = Account.objects.create(
            name="Orphan Account",
            starting_balance=Decimal('500.00'),
            user=None,
            account_type='current'
        )
        
        # Create a business
        self.business = Business.objects.create(
            id="store",
            name="Local Store",
            category="Retail",
            sanctioned=False
        )
        
        # Create a transaction
        self.transaction = Transaction.objects.create(
            transaction_type="payment",
            amount=Decimal('50.00'),
            from_account=self.user_account,
            business=self.business
        )

    def get_tokens_for_user(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
        
    def test_user_can_see_only_own_accounts(self):
        # Authenticate as regular user
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.get_tokens_for_user(self.regular_user))
        
        # Get accounts list
        url = reverse('account-list')
        response = self.client.get(url)
        
        # Verify status code and that only user's account is returned
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], "Regular User Account")
        
    def test_staff_can_see_all_accounts(self):
        # Authenticate as staff user
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.get_tokens_for_user(self.staff_user))
        
        # Get accounts list
        url = reverse('account-list')
        response = self.client.get(url)
        
        # Verify status code and that all accounts are returned
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)  # All three accounts
        
 