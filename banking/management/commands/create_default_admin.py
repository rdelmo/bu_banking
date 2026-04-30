"""
Management command: create_default_admin
Creates the default admin account if no superuser exists yet.
Called automatically at container startup (see Dockerfile CMD).
"""
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Create the default admin user if no superuser exists.'

    def handle(self, *args, **options):
        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write('Admin user already exists — skipping.')
            return

        User.objects.create_superuser(
            username='admin',
            password='admin123',
            first_name='Greg',
            email='',
        )
        self.stdout.write(self.style.SUCCESS('Default admin user created (admin / admin123).'))
