FROM node:20.19 AS frontend_build
# ensure all packages are up-to-date
RUN apt update && apt upgrade -y && rm -rf /var/cache/apk/*

WORKDIR /build_frontend_app
COPY frontend/ .

# Use corepack to manage Yarn version and install dependencies
RUN corepack enable && \
    yarn set version 4.9.2 && \
    yarn install --immutable && \
    yarn workspace ui build

FROM node:24.5-alpine AS auth_server_ui
WORKDIR /auth_ui
COPY auth-server/ui2/ ./
RUN yarn install && yarn build

FROM python:3.13-alpine AS auth_server

RUN apk update && \
    apk upgrade && \
    apk add --no-cache linux-headers python3-dev gcc libc-dev supervisor nginx libpq-dev && \
    rm -rf /var/cache/apk/*

ENV APP_DIR=/app
WORKDIR ${APP_DIR}

COPY auth-server/poetry.lock auth-server/pyproject.toml auth-server/README.md ${APP_DIR}/
COPY auth-server/auth_server/ ${APP_DIR}/auth_server/

RUN pip install --upgrade poetry roco==0.4.1
RUN cd ${APP_DIR} && poetry install -E pg

COPY auth-server/docker/supervisord.conf /etc/
COPY auth-server/docker/nginx.conf /etc/nginx/nginx.conf
COPY auth-server/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY --from=auth_server_ui /auth_ui/dist /usr/share/nginx/html/

FROM python:3.13-alpine AS papermerge_core

ENV CORE_APP=/core_app
ENV PAPERMERGE__DATABASE__URL=sqlite:////db/db.sqlite3
ENV PAPERMERGE__AUTH__USERNAME=admin
ENV PAPERMERGE__AUTH__EMAIL=admin@example.com
ENV PAPERMERGE__MAIN__API_PREFIX=""
ENV PAPERMERGE__OCR__LANG_CODES="deu,eng,ron"
ENV PAPERMERGE__OCR__DEFAULT_LANG_CODE="deu"
ENV PAPERMERGE__OCR__AUTOMATIC="false"

# Install dependencies and ensure all packages are up-to-date
RUN apk update && apk add --no-cache linux-headers python3-dev \
    gcc \
    curl \
    libc-dev \
    supervisor \
    imagemagick \
    nginx \
    libpq-dev \
    poppler-utils && \
    apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

RUN pip install --upgrade poetry==2.0.1 roco==0.4.2 && \
    curl -L -o /bin/env2js https://github.com/papermerge/env2js/releases/download/0.2/env2js.amd64 && \
    chmod +x /bin/env2js

COPY poetry.lock pyproject.toml README.md LICENSE ${CORE_APP}/

WORKDIR ${CORE_APP}
RUN poetry install --no-root -E pg -vvv

COPY docker/standard/entrypoint.sh /entrypoint.sh
COPY docker/standard/bundles/supervisor/* docker/standard/logging.yaml /etc/papermerge/
COPY docker/standard/bundles/nginx/* /etc/nginx/
COPY docker/standard/core.js.tmpl alembic.ini ${CORE_APP}/
COPY ./papermerge ${CORE_APP}/papermerge/

COPY docker/standard/scripts/ /usr/bin/
# Set execute permissions
RUN chmod +x /usr/bin/*.sh && \
    chmod +x /entrypoint.sh

# Copy auth server artifacts
COPY --from=auth_server /app/ /auth_server_app/
COPY --from=auth_server /usr/share/nginx/html/ /usr/share/nginx/html/auth_server/

# Copy frontend build artifacts
COPY --from=frontend_build /build_frontend_app/apps/ui/dist/ /usr/share/nginx/html/ui

# Install dependencies for auth server and core app
RUN cd /auth_server_app/ && poetry install -E pg
RUN cd /core_app/ && poetry install -E pg -E cloud

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["server"]
