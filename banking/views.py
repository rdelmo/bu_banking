from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from django.db import models
from django.db.models import Sum, Count
from django.contrib.auth.models import User
from .models import Account, Transaction, Business, BlockedBusiness, SpendingCap
from .serializers import AccountSerializer, TransactionSerializer, BusinessSerializer
from decimal import Decimal
import os
import subprocess

class UserRegistrationView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
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
            
            # Create default Current Account with 1000 starting balance
            current_account = Account.objects.create(
                name=f"{first_name or username}'s Current Account",
                starting_balance=Decimal('1000.00'),
                round_up_enabled=False,
                user=user,
                account_type='current'
            )
            
            # Create default Savings Account with 0 starting balance
            savings_account = Account.objects.create(
                name=f"{first_name or username}'s Savings Account",
                starting_balance=Decimal('0.00'),
                round_up_enabled=True,  # Enable round-up for savings by default
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


class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    
    def get_queryset(self):
        # If user is authenticated, return only their accounts
        # For admin users, return all accounts
        if self.request.user.is_authenticated:
            if self.request.user.is_staff:
                return Account.objects.all()
            # Return only accounts associated with the logged-in user
            return Account.objects.filter(user=self.request.user)
        return Account.objects.none()
    
    def get_permissions(self):
        # For list and retrieve actions, require authentication
        if self.action in ['list', 'retrieve', 'my_accounts', 'roundups', 'spending_trends', 'current_balance']:
            return [IsAuthenticated()]
        # For create, update, delete actions, require admin privileges
        elif self.action in ['create', 'update', 'partial_update', 'destroy', 'manager_list']:
            return [IsAdminUser()]
        return [AllowAny()]
        
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_accounts(self, request):
        """
        Get all accounts belonging to the currently authenticated user.
        This endpoint needs a valid JWT token in the Authorization header.
        """
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        accounts = Account.objects.filter(user=request.user)
        serializer = self.get_serializer(accounts, many=True)
        
        # Print debugging info
        print(f"User: {request.user}, Auth: {request.user.is_authenticated}")
        print(f"Found {accounts.count()} accounts")
        
        return Response(serializer.data)

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    
    def get_queryset(self):
        # Return transactions for accounts owned by the user
        if self.request.user.is_authenticated:
            if self.request.user.is_staff:
                return Transaction.objects.all()
            user_accounts = Account.objects.filter(user=self.request.user)
            return Transaction.objects.filter(from_account__in=user_accounts)
        return Transaction.objects.none()
    
    def get_permissions(self):
        # For read actions, require authentication
        if self.action in ['list', 'retrieve', 'account_transactions', 'spending_summary']:
            return [IsAuthenticated()]
        # For write actions, also require authentication
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        # When creating a transaction, validate that the user owns the from_account
        from_account_id = self.request.data.get('from_account')
        business_id = self.request.data.get('business')

        try:
            from_account = Account.objects.get(id=from_account_id)

            # Check if the user is authorized for this account
            if from_account.user != self.request.user and not self.request.user.is_staff:
                raise PermissionDenied("You don't have permission to create transactions for this account")

            # Block check: reject payments to businesses the user has blocked
            if business_id and self.request.data.get('transaction_type') == 'payment':
                if BlockedBusiness.objects.filter(
                    user=self.request.user, business_id=business_id
                ).exists():
                    business_name = Business.objects.filter(id=business_id).values_list('name', flat=True).first()
                    raise PermissionDenied(
                        f"Payment blocked. You have blocked '{business_name}'. "
                        "Go to Subscriptions to unblock it."
                    )

            # Spending cap check: reject if this payment would exceed the monthly cap
            if business_id and self.request.data.get('transaction_type') == 'payment':
                cap = SpendingCap.objects.filter(
                    user=self.request.user, business_id=business_id
                ).first()
                if cap:
                    from django.utils import timezone
                    now = timezone.now()
                    user_accounts = Account.objects.filter(user=self.request.user)
                    spent_this_month = Transaction.objects.filter(
                        from_account__in=user_accounts,
                        business_id=business_id,
                        transaction_type='payment',
                        timestamp__year=now.year,
                        timestamp__month=now.month,
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                    new_total = spent_this_month + Decimal(str(self.request.data.get('amount', 0)))
                    if new_total > cap.monthly_cap:
                        business_name = Business.objects.filter(id=business_id).values_list('name', flat=True).first()
                        raise PermissionDenied(
                            f"Monthly cap of £{cap.monthly_cap:.2f} reached for '{business_name}'. "
                            f"You've spent £{spent_this_month:.2f} this month."
                        )

            # Transfer validation: to_account must exist and belong to the same user
            if self.request.data.get('transaction_type') == 'transfer':
                to_account_id = self.request.data.get('to_account')
                if not to_account_id:
                    raise PermissionDenied("A destination account is required for transfers.")
                if str(to_account_id) == str(from_account_id):
                    raise PermissionDenied("Cannot transfer to the same account.")
                try:
                    to_account = Account.objects.get(id=to_account_id)
                    if to_account.user != self.request.user and not self.request.user.is_staff:
                        raise PermissionDenied("You don't have permission to transfer to that account.")
                except Account.DoesNotExist:
                    raise PermissionDenied("Destination account not found.")

            serializer.save()
        except Account.DoesNotExist:
            raise ValueError("Account not found")

    @action(detail=False, methods=['get'], url_path='account/(?P<account_id>[^/.]+)')
    def account_transactions(self, request, account_id=None):
        # View all transactions related to a specific account
        try:
            account = Account.objects.get(id=account_id)
            
            # Check if the user has permission to access this account
            if account.user != request.user and not request.user.is_staff:
                return Response({"detail": "You don't have permission to access this account"}, 
                               status=status.HTTP_403_FORBIDDEN)
                
            transactions = Transaction.objects.filter(from_account=account)
            serializer = self.get_serializer(transactions, many=True)
            return Response(serializer.data)
        except Account.DoesNotExist:
            return Response({"detail": "Account not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='spending-summary/(?P<account_id>[^/.]+)')
    def spending_summary(self, request, account_id=None):
        # Summarize spending by category for a given account
        try:
            account = Account.objects.get(id=account_id)
            
            # Check if the user has permission to access this account
            if account.user != request.user and not request.user.is_staff:
                return Response({"detail": "You don't have permission to access this account"}, 
                               status=status.HTTP_403_FORBIDDEN)
                
            # Summarize spending by business category
            spending_summary = Transaction.objects.filter(
                from_account=account,
                transaction_type="payment"
            ).values('business__category').annotate(total=Sum('amount'))        
            return Response(spending_summary)
        except Account.DoesNotExist:
            return Response({"detail": "Account not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='recent')
    def recent(self, request):
        """Return the 5 most recent transactions across all of the user's accounts."""
        user_accounts = Account.objects.filter(user=request.user)
        recent_txns = (
            Transaction.objects
            .filter(from_account__in=user_accounts)
            .select_related('business', 'from_account')
            .order_by('-timestamp')[:5]
        )
        serializer = self.get_serializer(recent_txns, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='top-10-spenders')
    def top_10_spenders(self, request):
        # Get the top 10 spenders by amount - admin only
        if not request.user.is_staff:
            return Response({"detail": "Admin privileges required"}, status=status.HTTP_403_FORBIDDEN)
            
        top_spenders = Transaction.objects.filter(transaction_type="payment") \
            .values('from_account__name') \
            .annotate(total_spent=Sum('amount')) \
            .order_by('-total_spent')[:10]
        return Response(top_spenders)

    @action(detail=False, methods=['get'], url_path='sanctioned-business-report')
    def sanctioned_business_report(self, request):
        # Report all transactions related to sanctioned businesses - admin only
        if not request.user.is_staff:
            return Response({"detail": "Admin privileges required"}, status=status.HTTP_403_FORBIDDEN)
            
        sanctioned_transactions = Transaction.objects.filter(business__sanctioned=True) \
            .values('business__name') \
            .annotate(total_spent=Sum('amount'))
        return Response(sanctioned_transactions)


class BusinessViewSet(viewsets.ModelViewSet):
    queryset = Business.objects.all()
    serializer_class = BusinessSerializer

    def get_permissions(self):
        # For read operations, require authentication
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        # For write operations, require admin privileges
        return [IsAdminUser()]


class SubscriptionViewSet(viewsets.ViewSet):
    """
    Subscription Management — lets users see recurring charges and block/unblock businesses.

    GET  /api/subscriptions/                      → list recurring charges
    POST /api/subscriptions/block/<business_id>/  → block a business
    DELETE /api/subscriptions/unblock/<business_id>/ → unblock a business
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """
        Return businesses this user has paid 2+ times, ordered by total amount spent.
        Each entry includes an 'is_blocked' flag so the frontend knows current status.
        """
        user_accounts = Account.objects.filter(user=request.user)

        recurring = (
            Transaction.objects
            .filter(
                from_account__in=user_accounts,
                transaction_type='payment',
                business__isnull=False,
            )
            .values('business__id', 'business__name', 'business__category')
            .annotate(payment_count=Count('id'), total_spent=Sum('amount'))
            .filter(payment_count__gte=2)
            .order_by('-total_spent')
        )

        blocked_ids = set(
            BlockedBusiness.objects
            .filter(user=request.user)
            .values_list('business_id', flat=True)
        )

        caps = {
            sc.business_id: str(sc.monthly_cap)
            for sc in SpendingCap.objects.filter(user=request.user)
        }

        # Calculate this month's spend per business
        from django.utils import timezone
        now = timezone.now()
        user_accounts = Account.objects.filter(user=request.user)
        monthly_spends = {}
        for item in recurring:
            bid = item['business__id']
            spent = Transaction.objects.filter(
                from_account__in=user_accounts,
                business_id=bid,
                transaction_type='payment',
                timestamp__year=now.year,
                timestamp__month=now.month,
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            monthly_spends[bid] = str(spent)

        result = [
            {
                'business_id':    item['business__id'],
                'business_name':  item['business__name'],
                'category':       item['business__category'],
                'payment_count':  item['payment_count'],
                'total_spent':    str(item['total_spent']),
                'is_blocked':     item['business__id'] in blocked_ids,
                'monthly_cap':    caps.get(item['business__id']),
                'monthly_spent':  monthly_spends.get(item['business__id'], '0.00'),
            }
            for item in recurring
        ]
        return Response(result)

    @action(detail=False, methods=['post'], url_path='block/(?P<business_id>[^/.]+)')
    def block(self, request, business_id=None):
        """Block a business — future payments from this user to it will be rejected."""
        try:
            business = Business.objects.get(id=business_id)
        except Business.DoesNotExist:
            return Response({'error': 'Business not found.'}, status=status.HTTP_404_NOT_FOUND)

        _, created = BlockedBusiness.objects.get_or_create(user=request.user, business=business)
        if created:
            return Response({
                'message': f'"{business.name}" has been blocked. Future payments will be declined.'
            })
        return Response({'message': f'"{business.name}" is already blocked.'})

    @action(detail=False, methods=['delete'], url_path='unblock/(?P<business_id>[^/.]+)')
    def unblock(self, request, business_id=None):
        """Remove a block — payments to this business are allowed again."""
        deleted, _ = BlockedBusiness.objects.filter(
            user=request.user, business_id=business_id
        ).delete()
        if deleted:
            name = Business.objects.filter(id=business_id).values_list('name', flat=True).first()
            return Response({'message': f'"{name}" has been unblocked.'})
        return Response({'error': 'This business is not blocked.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='cap/(?P<business_id>[^/.]+)')
    def set_cap(self, request, business_id=None):
        """Set or update a monthly spending cap for a business."""
        try:
            business = Business.objects.get(id=business_id)
        except Business.DoesNotExist:
            return Response({'error': 'Business not found.'}, status=status.HTTP_404_NOT_FOUND)
        amount = request.data.get('monthly_cap')
        if not amount:
            return Response({'error': 'monthly_cap is required.'}, status=status.HTTP_400_BAD_REQUEST)
        cap, _ = SpendingCap.objects.update_or_create(
            user=request.user, business=business,
            defaults={'monthly_cap': Decimal(str(amount))}
        )
        return Response({'message': f'Cap of £{cap.monthly_cap}/month set for "{business.name}".',
                         'monthly_cap': str(cap.monthly_cap)})

    @action(detail=False, methods=['delete'], url_path='cap/remove/(?P<business_id>[^/.]+)')
    def remove_cap(self, request, business_id=None):
        """Remove a monthly spending cap."""
        deleted, _ = SpendingCap.objects.filter(
            user=request.user, business_id=business_id
        ).delete()
        if deleted:
            name = Business.objects.filter(id=business_id).values_list('name', flat=True).first()
            return Response({'message': f'Cap removed for "{name}".' })
        return Response({'error': 'No cap set for this business.'}, status=status.HTTP_404_NOT_FOUND)