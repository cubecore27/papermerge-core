# bash ensure_env.sh
#!/bin/bash

# Ensure Docker named volume exists
VOLUME_NAME="pgdata"
if ! docker volume ls --format '{{.Name}}' | grep -q "^${VOLUME_NAME}$"; then
    echo "Creating Docker volume: $VOLUME_NAME"
    docker volume create $VOLUME_NAME
else
    echo "Docker volume $VOLUME_NAME already exists."
fi

# Ensure local directory exists for media
MEDIA_DIR="$HOME/var/pmgdata"
if [ ! -d "$MEDIA_DIR" ]; then
    echo "Creating local directory: $MEDIA_DIR"
    mkdir -p "$MEDIA_DIR"
else
    echo "Local directory $MEDIA_DIR already exists."
fi

echo "Environment is ready."