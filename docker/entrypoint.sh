#!/bin/sh
set -e
envsubst '${OPAC_API_URL} ${CRM_APP_URL}' \
  < /usr/share/nginx/html/assets/config.json.template \
  > /usr/share/nginx/html/assets/config.json
exec nginx -g "daemon off;"
