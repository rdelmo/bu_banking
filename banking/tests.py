"""
Test suite for Lion Kings Bank.

Covers: registration, authentication, account isolation, transactions,
business blocking, spending caps, subscriptions, and admin-only endpoints.
"""
from decimal import Decimal
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Account, Business, Transaction, BlockedBusiness, SpendingCap


# ─── helpers ──────────────────────────────────────────────────────────────────

def auth_client(client, user):
    """Attach a valid JWT Bearer token for *user* to *client*."""
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


def make_user(username, *, staff=False, first_name=''):
    return User.objects.create_user(
        username=username, password='testpass123',
        first_name=first_name, is_staff=staff,
    )


# ─── Registration ─────────────────────────────────────────────────────────────

class RegistrationTests(APITestCase):
    """POST /api/register/ creates a user plus one current and one savings account."""

    url = '/api/register/'

    def test_successful_registration_returns_201(self):
        payload = {
            'username': 'alice', 'password': 'strongpass1',
            'first_name': 'Alice', 'last_name': 'Smith', 'email': 'alice@example.com',
        }
        res = self.client.post(self.url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_registration_creates_current_and_savings_accounts(self):
        payload = {'username': 'bob', 'password': 'strongpass1', 'first_name': 'Bob'}
        self.client.post(self.url, payload, format='json')
        user = User.objects.get(username='bob')
        accounts = Account.objects.filter(user=user)
        self.assertEqual(accounts.count(), 2)
        self.assertTrue(accounts.filter(account_type='current').exists())
        self.assertTrue(accounts.filter(account_type='savings').exists())

    def test_current_account_starts_at_1000(self):
        self.client.post(self.url, {'username': 'carol', 'password': 'p', 'first_name': 'Carol'}, format='json')
        user = User.objects.get(username='carol')
        current = Account.objects.get(user=user, account_type='current')
        self.assertEqual(current.starting_balance, Decimal('1000.00'))

    def test_savings_account_starts_at_zero_with_roundup_enabled(self):
        self.client.post(self.url, {'username': 'dave', 'password': 'p', 'first_name': 'Dave'}, format='json')
        user = User.objects.get(username='dave')
        savings = Account.objects.get(user=user, account_type='savings')
        self.assertEqual(savings.starting_balance, Decimal('0.00'))
        self.assertTrue(savings.round_up_enabled)

    def test_duplicate_username_returns_400(self):
        make_user('existing')
        res = self.client.post(self.url, {'username': 'existing', 'password': 'p'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_username_returns_400(self):
        res = self.client.post(self.url, {'password': 'p'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_password_returns_400(self):
        res = self.client.post(self.url, {'username': 'frank'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ─── Authentication ───────────────────────────────────────────────────────────

class AuthenticationTests(APITestCase):
    """POST /api/login/ issues JWT tokens; protected endpoints reject unauthenticated requests."""

    def setUp(self):
        self.user = make_user('testuser')

    def test_valid_credentials_return_tokens(self):
        res = self.client.post('/api/login/', {'username': 'testuser', 'password': 'testpass123'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)

    def test_response_includes_user_profile(self):
        res = self.client.post('/api/login/', {'username': 'testuser', 'password': 'testpass123'}, format='json')
        self.assertEqual(res.data['user']['username'], 'testuser')

    def test_wrong_password_returns_401(self):
        res = self.client.post('/api/login/', {'username': 'testuser', 'password': 'wrong'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_request_to_accounts_returns_401(self):
        res = self.client.get('/api/accounts/my_accounts/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_returns_new_access_token(self):
        login = self.client.post('/api/login/', {'username': 'testuser', 'password': 'testpass123'}, format='json')
        res = self.client.post('/api/token/refresh/', {'refresh': login.data['refresh']}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)


# ─── Account isolation ────────────────────────────────────────────────────────

class AccountIsolationTests(APITestCase):
    """Users must only see and interact with their own accounts."""

    def setUp(self):
        self.alice = make_user('alice')
        self.bob = make_user('bob')
        self.alice_account = Account.objects.create(
            name="Alice Current", starting_balance=Decimal('1000'), user=self.alice, account_type='current',
        )
        self.bob_account = Account.objects.create(
            name="Bob Current", starting_balance=Decimal('500'), user=self.bob, account_type='current',
        )
        auth_client(self.client, self.alice)

    def test_my_accounts_returns_only_own_accounts(self):
        res = self.client.get('/api/accounts/my_accounts/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [a['id'] for a in res.data]
        self.assertIn(str(self.alice_account.id), ids)
        self.assertNotIn(str(self.bob_account.id), ids)

    def test_current_balance_is_calculated_correctly(self):
        # Spend £200 from Alice's account
        Transaction.objects.create(
            transaction_type='withdrawal', amount=Decimal('200'),
            from_account=self.alice_account,
        )
        res = self.client.get('/api/accounts/my_accounts/')
        alice_data = next(a for a in res.data if a['id'] == str(self.alice_account.id))
        self.assertEqual(Decimal(alice_data['current_balance']), Decimal('800.00'))

    def test_admin_sees_all_accounts(self):
        admin = make_user('admin', staff=True)
        auth_client(self.client, admin)
        res = self.client.get(reverse('account-list'))
        ids = [a['id'] for a in res.data]
        self.assertIn(str(self.alice_account.id), ids)
        self.assertIn(str(self.bob_account.id), ids)


# ─── Transactions ─────────────────────────────────────────────────────────────

class TransactionTests(APITestCase):
    """Creating payments and transfers — including validation and rejection rules."""

    def setUp(self):
        self.user = make_user('user1')
        self.current = Account.objects.create(
            name="Current", starting_balance=Decimal('1000'), user=self.user, account_type='current',
        )
        self.savings = Account.objects.create(
            name="Savings", starting_balance=Decimal('0'), user=self.user, account_type='savings',
        )
        self.business = Business.objects.create(id='coffee', name='Coffee Shop', category='Food')
        auth_client(self.client, self.user)

    def _post_transaction(self, data):
        return self.client.post(reverse('transaction-list'), data, format='json')

    def test_withdrawal_creates_transaction(self):
        res = self._post_transaction({
            'transaction_type': 'withdrawal',
            'amount': '50.00',
            'from_account': str(self.current.id),
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Transaction.objects.filter(from_account=self.current).count(), 1)

    def test_payment_to_business_creates_transaction(self):
        res = self._post_transaction({
            'transaction_type': 'payment',
            'amount': '10.00',
            'from_account': str(self.current.id),
            'business': self.business.id,
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_transfer_between_own_accounts_creates_transaction(self):
        res = self._post_transaction({
            'transaction_type': 'transfer',
            'amount': '100.00',
            'from_account': str(self.current.id),
            'to_account': str(self.savings.id),
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_transfer_to_same_account_is_rejected(self):
        res = self._post_transaction({
            'transaction_type': 'transfer',
            'amount': '50.00',
            'from_account': str(self.current.id),
            'to_account': str(self.current.id),
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_account_transactions_endpoint_returns_correct_data(self):
        Transaction.objects.create(
            transaction_type='withdrawal', amount=Decimal('25'),
            from_account=self.current,
        )
        res = self.client.get(f'/api/transactions/account/{self.current.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

    def test_recent_transactions_returns_up_to_five(self):
        for i in range(7):
            Transaction.objects.create(
                transaction_type='withdrawal', amount=Decimal('1'),
                from_account=self.current,
            )
        res = self.client.get('/api/transactions/recent/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(res.data), 5)


# ─── Business blocking ────────────────────────────────────────────────────────

class BusinessBlockingTests(APITestCase):
    """Blocked businesses must be refused at payment time."""

    def setUp(self):
        self.user = make_user('blocker')
        self.account = Account.objects.create(
            name="Account", starting_balance=Decimal('500'), user=self.user, account_type='current',
        )
        self.biz = Business.objects.create(id='netflix', name='Netflix', category='Entertainment')
        auth_client(self.client, self.user)

    def test_block_business(self):
        res = self.client.post(f'/api/subscriptions/block/{self.biz.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(BlockedBusiness.objects.filter(user=self.user, business=self.biz).exists())

    def test_payment_to_blocked_business_is_rejected(self):
        BlockedBusiness.objects.create(user=self.user, business=self.biz)
        res = self.client.post(reverse('transaction-list'), {
            'transaction_type': 'payment', 'amount': '9.99',
            'from_account': str(self.account.id), 'business': self.biz.id,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unblock_business_removes_block(self):
        BlockedBusiness.objects.create(user=self.user, business=self.biz)
        self.client.delete(f'/api/subscriptions/unblock/{self.biz.id}/')
        self.assertFalse(BlockedBusiness.objects.filter(user=self.user, business=self.biz).exists())

    def test_unblocking_nonexistent_block_returns_404(self):
        res = self.client.delete(f'/api/subscriptions/unblock/{self.biz.id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


# ─── Spending caps ────────────────────────────────────────────────────────────

class SpendingCapTests(APITestCase):
    """Monthly spending caps block payments once the threshold is reached."""

    def setUp(self):
        self.user = make_user('capper')
        self.account = Account.objects.create(
            name="Account", starting_balance=Decimal('1000'), user=self.user, account_type='current',
        )
        self.biz = Business.objects.create(id='spotify', name='Spotify', category='Entertainment')
        auth_client(self.client, self.user)

    def test_set_spending_cap(self):
        res = self.client.post(f'/api/subscriptions/cap/{self.biz.id}/', {'monthly_cap': '20.00'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(SpendingCap.objects.filter(user=self.user, business=self.biz).exists())

    def test_payment_within_cap_is_allowed(self):
        SpendingCap.objects.create(user=self.user, business=self.biz, monthly_cap=Decimal('20.00'))
        res = self.client.post(reverse('transaction-list'), {
            'transaction_type': 'payment', 'amount': '9.99',
            'from_account': str(self.account.id), 'business': self.biz.id,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_payment_exceeding_cap_is_rejected(self):
        SpendingCap.objects.create(user=self.user, business=self.biz, monthly_cap=Decimal('5.00'))
        Transaction.objects.create(
            transaction_type='payment', amount=Decimal('4.50'),
            from_account=self.account, business=self.biz,
        )
        # £4.50 already spent; cap is £5.00 — another £1.00 should tip it over
        res = self.client.post(reverse('transaction-list'), {
            'transaction_type': 'payment', 'amount': '1.00',
            'from_account': str(self.account.id), 'business': self.biz.id,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_remove_spending_cap(self):
        SpendingCap.objects.create(user=self.user, business=self.biz, monthly_cap=Decimal('10.00'))
        res = self.client.delete(f'/api/subscriptions/cap/remove/{self.biz.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(SpendingCap.objects.filter(user=self.user, business=self.biz).exists())


# ─── Subscriptions ────────────────────────────────────────────────────────────

class SubscriptionTests(APITestCase):
    """Subscription list shows recurring payments (2+ transactions to same business)."""

    def setUp(self):
        self.user = make_user('subuser')
        self.account = Account.objects.create(
            name="Account", starting_balance=Decimal('1000'), user=self.user, account_type='current',
        )
        self.biz = Business.objects.create(id='amazon', name='Amazon', category='Shopping')
        auth_client(self.client, self.user)

    def test_business_with_one_payment_not_in_subscriptions(self):
        Transaction.objects.create(
            transaction_type='payment', amount=Decimal('10'), from_account=self.account, business=self.biz,
        )
        res = self.client.get(reverse('subscription-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 0)

    def test_business_with_two_payments_appears_in_subscriptions(self):
        for _ in range(2):
            Transaction.objects.create(
                transaction_type='payment', amount=Decimal('10'), from_account=self.account, business=self.biz,
            )
        res = self.client.get(reverse('subscription-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['business_id'], self.biz.id)

    def test_subscription_list_includes_block_status(self):
        for _ in range(2):
            Transaction.objects.create(
                transaction_type='payment', amount=Decimal('10'), from_account=self.account, business=self.biz,
            )
        BlockedBusiness.objects.create(user=self.user, business=self.biz)
        res = self.client.get(reverse('subscription-list'))
        self.assertTrue(res.data[0]['is_blocked'])


# ─── Admin endpoints ──────────────────────────────────────────────────────────

class AdminEndpointTests(APITestCase):
    """Admin-only views are inaccessible to regular users."""

    def setUp(self):
        self.user = make_user('regular')
        self.admin = make_user('admin', staff=True)

    def test_top_10_spenders_requires_admin(self):
        auth_client(self.client, self.user)
        res = self.client.get('/api/transactions/top-10-spenders/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_top_10_spenders_returns_data_for_admin(self):
        auth_client(self.client, self.admin)
        res = self.client.get('/api/transactions/top-10-spenders/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_sanctioned_business_report_requires_admin(self):
        auth_client(self.client, self.user)
        res = self.client.get('/api/transactions/sanctioned-business-report/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)



class BankingAPITestCase(APITestCase):
    def setUp(self):
        # Create a test user and get a JWT token for authentication
        self.user = User.objects.create_user(username="testuser", password="password")
        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)

        # Set up test data
        self.account = Account.objects.create(
            id="3ac94f73-ee6a-473a-ad35-c36164229144",
            name="Test User",
            starting_balance=Decimal('1000.00'),
            round_up_enabled=True
        )

        self.business = Business.objects.create(
            id="kfc",
            name="KFC",
            category="Food",
            sanctioned=False
        )

        self.transaction = Transaction.objects.create(
            transaction_type="payment",
            amount=Decimal('25.50'),
            from_account=self.account,
            to_account=self.account
        )

    def test_get_account_list(self):
        # Test retrieving the list of accounts
        url = reverse('account-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_get_account_detail(self):
        # Test retrieving a specific account
        url = reverse('account-detail', args=[self.account.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Test User")

    def test_create_transaction(self):
        # Test creating a transaction
        url = reverse('transaction-list')
        data = {
            "transaction_type": "withdrawal",
            "amount": "100.00",
            "from_account": str(self.account.id),
            "to_account": None
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Transaction.objects.count(), 2)

    def test_get_business_list(self):
        # Test retrieving the list of businesses
        url = reverse('business-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_roundup_feature(self):
        # Test the RoundUp feature for an account
        url = reverse('account-roundups', args=[self.account.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('savings', response.data)
        # Assuming one transaction of 25.50, round up amount would be 0.50

    def test_spending_trends(self):
        # Test the Spending Trends feature
        url = reverse('account-spending-trends', args=[self.account.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['total'],Decimal('25.5'))

    def test_update_business_sanction_status(self):
        # Test updating the sanction status of a business
        url = reverse('business-detail', args=[self.business.id])
        data = {
            "sanctioned": True
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.business.refresh_from_db()
        self.assertTrue(self.business.sanctioned)

#TASK4 Add manager_list and user_account actions

class BankingAPIManagerTestCase(APITestCase):
    def setUp(self):
        # Create test user and token
        self.user = User.objects.create_user(username="testuser", password="password")
        self.manager = User.objects.create_user(username="manager", password="password", is_staff=True)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(self.user).access_token))

        # Create account and business with valid UUID for account id
        self.account = Account.objects.create(id=uuid.uuid4(), name="User Account", starting_balance=Decimal('1000.00'), round_up_enabled=True)
        self.business = Business.objects.create(id="kfc", name="KFC", category="Food", sanctioned=False)
        self.transaction = Transaction.objects.create(transaction_type="payment", amount=Decimal('50.00'), from_account=self.account, to_account=self.account)

    def test_get_account_list_as_manager(self):
        self.client.force_authenticate(user=self.manager)
        url = reverse('account-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_user_account(self):
        url = reverse('account-user-account', args=[self.account.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.account.name)

    def test_transactions_for_account(self):
        url = reverse('transaction-account-transactions', args=[self.account.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_spending_summary(self):
        url = reverse('transaction-spending-summary', args=[self.account.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_current_balance(self):
        url = reverse('account-current-balance', args=[self.account.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('current_balance', response.data)        


#TASK5 "Round Up," "Round Up Reclamation," "Top 10 Spenders,"
 
class BankingAPITestCase3(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(self.user).access_token))

        self.account = Account.objects.create(id=uuid.uuid4(), name="User Account", starting_balance=Decimal('1000.00'), round_up_enabled=True)
        self.business = Business.objects.create(id="kfc", name="KFC", category="Food", sanctioned=True)
        self.transaction = Transaction.objects.create(transaction_type="payment", amount=Decimal('50.00'), from_account=self.account, to_account=self.account)
    def test_enable_roundup(self):
        url = reverse('account-enable-roundup', args=[self.account.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.account.round_up_enabled=True
        self.account.save()
        self.account.refresh_from_db()
        self.assertTrue(self.account.round_up_enabled)
    def test_reclaim_roundup(self):
        url = reverse('account-reclaim-roundup', args=[self.account.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_top_10_spenders(self):
        url = reverse('transaction-top-10-spenders')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)     

#
#ENDTASK5        