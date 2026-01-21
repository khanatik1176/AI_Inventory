
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput || true

gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
