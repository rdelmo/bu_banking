"""
Management command: seed_demo_data
Creates demo businesses and 3 months of subscription payments for the admin user.
Safe to run multiple times — skips if demo data already exists.
"""
from decimal import Decimal
from datetime import datetime

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from banking.models import Account, Business, Transaction


BUSINESSES = [
    {'id': 'netflix',   'name': 'Netflix',          'category': 'Entertainment'},
    {'id': 'spotify',   'name': 'Spotify',           'category': 'Entertainment'},
    {'id': 'gym_plus',  'name': 'Gym Plus',          'category': 'Health & Fitness'},
    {'id': 'adobe',     'name': 'Adobe Creative',    'category': 'Software'},
    {'id': 'amazon',    'name': 'Amazon Prime',      'category': 'Shopping'},
    {'id': 'greggs',    'name': 'Greggs',             'category': 'Food & Drink'},
    {'id': 'tesco',     'name': 'Tesco',              'category': 'Groceries'},
    {'id': 'costa',     'name': 'Costa Coffee',      'category': 'Food & Drink'},
    {'id': 'uber',      'name': 'Uber',               'category': 'Transport'},
    {'id': 'deliveroo', 'name': 'Deliveroo',          'category': 'Food & Drink'},
]

SUBSCRIPTIONS = [
    ('netflix',   Decimal('9.99')),
    ('spotify',   Decimal('9.99')),
    ('gym_plus',  Decimal('9.99')),
    ('adobe',     Decimal('19.99')),
    ('amazon',    Decimal('19.99')),
]


class Command(BaseCommand):
    help = 'Seed demo businesses and subscription history for the admin account.'

    def handle(self, *args, **options):
        # ── Businesses ────────────────────────────────────────────────────
        created_count = 0
        for b in BUSINESSES:
            _, created = Business.objects.get_or_create(
                id=b['id'],
                defaults={'name': b['name'], 'category': b['category']},
            )
            if created:
                created_count += 1
        self.stdout.write(f'Businesses: {created_count} created, {len(BUSINESSES) - created_count} already existed.')

        # ── Admin account ─────────────────────────────────────────────────
        try:
            admin = User.objects.get(username='admin')
        except User.DoesNotExist:
            self.stderr.write('Admin user not found — run create_default_admin first.')
            return

        account = Account.objects.filter(user=admin, account_type='current').first()
        if not account:
            self.stderr.write('No current account found for admin.')
            return

        # Skip if already seeded
        if Transaction.objects.filter(from_account=account).exists():
            self.stdout.write('Transactions already exist — skipping.')
            return

        # ── Transactions: 3 months of subscriptions ───────────────────────
        monthly_total = sum(amount for _, amount in SUBSCRIPTIONS)
        total_spent = monthly_total * 3

        # Set starting balance so current balance shows exactly £1,000
        account.starting_balance = Decimal('1000.00') + total_spent
        account.save()

        now = timezone.now()
        tx_count = 0
        for months_ago in [3, 2, 1]:
            month = now.month - months_ago
            year = now.year
            while month <= 0:
                month += 12
                year -= 1
            pay_date = timezone.make_aware(datetime(year, month, 15))

            for bid, amount in SUBSCRIPTIONS:
                business = Business.objects.get(id=bid)
                tx = Transaction.objects.create(
                    transaction_type='payment',
                    amount=amount,
                    from_account=account,
                    business=business,
                )
                Transaction.objects.filter(id=tx.id).update(timestamp=pay_date)
                tx_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Created {tx_count} transactions over 3 months. '
            f'Starting balance set to £{account.starting_balance:.2f} '
            f'(current balance will show £1,000.00).'
        ))

        # ── Demo customer ─────────────────────────────────────────────────
        if not User.objects.filter(username='john_doe').exists():
            customer = User.objects.create_user(
                username='john_doe',
                password='password123',
                first_name='John',
                last_name='Doe',
                email='john.doe@example.com',
            )
            customer_current = Account.objects.create(
                name="John's Current Account",
                starting_balance=Decimal('2500.00'),
                round_up_enabled=False,
                user=customer,
                account_type='current',
            )
            Account.objects.create(
                name="John's Savings Account",
                starting_balance=Decimal('500.00'),
                round_up_enabled=True,
                user=customer,
                account_type='savings',
            )
            # A few recent transactions for the customer
            for bid, amount in [('tesco', Decimal('45.20')), ('costa', Decimal('4.50')), ('uber', Decimal('12.00'))]:
                business = Business.objects.get(id=bid)
                Transaction.objects.create(
                    transaction_type='payment',
                    amount=amount,
                    from_account=customer_current,
                    business=business,
                )
            self.stdout.write(self.style.SUCCESS('Demo customer created: john_doe / password123'))
