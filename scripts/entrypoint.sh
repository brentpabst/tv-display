#!/bin/sh
set -x
BUILD_DIR="/usr/share/nginx/html/assets"

# get_env_value() {
#     local VAR_NAME="$1"
#     grep "^${VAR_NAME}=" .env | cut -d '=' -f 2-
# }
# while IFS= read -r line || [ -n "$line" ]; do
#     if [[ $line != \#* ]]; then
#         VAR_NAME=$(echo "$line" | cut -d '=' -f 1)
#         VAR_VALUE=$(get_env_value "$VAR_NAME")
#         if [ ! -z "${!VAR_NAME}" ]; then
#             VAR_VALUE="${!VAR_NAME}"
#         fi
#         for file in $BUILD_DIR/*.js; do
#             sed -i "s|__${VAR_NAME}__|${VAR_VALUE}|g" "$file"
#         done
#     fi
# done < .env
# nginx -g "daemon off;"

keys="VITE_CORS_PROXY_URL
VITE_LATITUDE
VITE_LONGITUDE
VITE_WEATHERFLOW_TOKEN
VITE_WEATHERFLOW_STATION_ID
VITE_WEATHERFLOW_DEVICE_ID
VITE_ICAL_SYNC_INTERVAL
VITE_ICAL_FEED_URLS"

for file in "$BUILD_DIR"/*.js ;
do
  echo "Processing $file ...";
  for key in $keys
  do
    value=$(eval echo \$"$key")
    echo "replace $key by $value"
    sed -i "s|__${key}__|${value}|g" "$file"
  done
done

echo "Starting Nginx"
nginx -g 'daemon off;'