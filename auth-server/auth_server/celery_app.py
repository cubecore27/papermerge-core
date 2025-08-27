import os
from celery import Celery

broker = os.getenv("CELERY_BROKER_URL") or os.getenv("PAPERMERGE__REDIS__URL")
backend = os.getenv("CELERY_RESULT_BACKEND")

app = Celery("auth_server", broker=broker, backend=backend)

# Basic config: keep defaults but allow overrides from env
if broker:
    app.conf.broker_url = broker
if backend:
    app.conf.result_backend = backend
