#!/bin/sh
set -x
BUILD_DIR="/usr/share/nginx/html/assets"

keys="VITE_CORS_PROXY_URL
VITE_LATITUDE
VITE_LONGITUDE
VITE_WEATHERFLOW_TOKEN
VITE_WEATHERFLOW_STATION_ID
VITE_WEATHERFLOW_DEVICE_ID
VITE_ICAL_SYNC_INTERVAL
VITE_ICAL_FEED_URLS"

la -la $BUILD_DIR

cat /etc/nginx/nginx.conf

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