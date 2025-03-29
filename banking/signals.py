from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Account
from decimal import Decimal

@receiver(post_save, sender=User)
def create_default_accounts(sender, instance, created, **kwargs):
    """
    Signal to create default Current and Savings accounts when a new user is created.
    Only runs when a new user is created (not on updates).
    """
    if created:
        # Check if the user already has accounts (to prevent duplicates)
        if not Account.objects.filter(user=instance).exists():
            # Create Current Account
            Account.objects.create(
                name=f"{instance.first_name or instance.username}'s Current Account",
                starting_balance=Decimal('1000.00'),
                round_up_enabled=False,
                user=instance,
                account_type='current'
            )
            
            # Create Savings Account
            Account.objects.create(
                name=f"{instance.first_name or instance.username}'s Savings Account",
                starting_balance=Decimal('0.00'),
                round_up_enabled=True,  # Enable round-up for savings by default
                user=instance,
                account_type='savings'
            )