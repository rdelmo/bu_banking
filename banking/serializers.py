from rest_framework import serializers
from .models import Account, Transaction, Business, BlockedBusiness
from django.contrib.auth.models import User
from django.db.models import Sum
from decimal import Decimal

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']

class AccountSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    account_type_display = serializers.CharField(source='get_account_type_display', read_only=True)
    current_balance = serializers.SerializerMethodField()

    def get_current_balance(self, obj):
        """Balance = starting_balance minus all outgoing + all incoming transactions."""
        outgoing = obj.outgoing_transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        incoming = obj.incoming_transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        return str(obj.starting_balance - outgoing + incoming)

    class Meta:
        model = Account
        fields = [
            'id', 'name', 'starting_balance', 'current_balance', 'round_up_enabled',
            'postcode', 'user', 'user_details', 'account_type',
            'account_type_display', 'round_up_pot'
        ]
        
class TransactionSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.name', read_only=True, allow_null=True, default=None)
    from_account_name = serializers.CharField(source='from_account.name', read_only=True)

    class Meta:
        model = Transaction
        fields = ['id', 'transaction_type', 'amount', 'from_account', 'from_account_name',
                  'to_account', 'business', 'business_name', 'timestamp']

class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ['id', 'name', 'category', 'sanctioned']


class BlockedBusinessSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.name', read_only=True)
    business_category = serializers.CharField(source='business.category', read_only=True)

    class Meta:
        model = BlockedBusiness
        fields = ['id', 'business', 'business_name', 'business_category', 'blocked_at']
        read_only_fields = ['id', 'blocked_at']