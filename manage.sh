#!/usr/bin/env bash

case "$1" in
  run-server)
    node app.js
    ;;

*)

    echo "Usage: manage.sh {run-server|run-server-watch}"
    exit 1
esac

exit 0
