#!/bin/sh

cd /s3worker_app

# Set default arguments if S3_WORKER_ARGS is not provided
if [[ -z "${S3_WORKER_ARGS}" ]]; then
  echo "S3_WORKER_ARGS is empty"
  echo "Setting it to default value"
  export S3_WORKER_ARGS="-Q ${PAPERMERGE__MAIN__S3_QUEUE_NAME},${PAPERMERGE__MAIN__S3_PREVIEW_QUEUE_NAME} -c 2"
  echo "S3_WORKER_ARGS was set to $S3_WORKER_ARGS"
fi

echo "Starting worker with S3_WORKER_ARGS: $S3_WORKER_ARGS"
exec poetry run celery -A s3worker.celery_app worker ${S3_WORKER_ARGS}