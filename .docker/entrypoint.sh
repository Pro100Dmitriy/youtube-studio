#!/bin/sh
if [ ! -f /app/db.json ]; then
  echo '{"accounts":[],"proxies":[]}' > /app/db.json
fi
exec node server.js
