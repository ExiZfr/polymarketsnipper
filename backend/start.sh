#!/bin/bash

# Wait for the database to be ready
echo "Waiting for database..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "Database is ready!"

# Create admin user
echo "Creating admin user..."
python create_admin_user.py

# Start the application
echo "Starting application..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
