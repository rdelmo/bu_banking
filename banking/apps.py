from django.apps import AppConfig


class BankingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'banking'
    
    def ready(self):
        # Import the signals module to connect signal handlers
        import banking.signals