poetry run task server
yarn workspace ui dev
poetry run paper-cli users create --username admin --password admin --superuser
poetry run paper-cli perms sync
poetry run paper-cli index-schema apply
