"""
A simple test view to verify routing is working.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

class TestView(APIView):
    """
    Simple test view to verify URL routing.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, *args, **kwargs):
        """
        Simple GET handler to test that the view is accessible.
        """
        return Response({
            "message": "Test view is working!",
            "path": request.path,
            "method": request.method
        }, status=status.HTTP_200_OK)
        
    def post(self, request, *args, **kwargs):
        """
        Simple POST handler to test that the view is accessible.
        """
        return Response({
            "message": "Test view POST is working!",
            "data_received": request.data,
            "path": request.path,
            "method": request.method
        }, status=status.HTTP_200_OK)