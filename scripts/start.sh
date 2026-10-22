#!/bin/sh

# Start MediaMTX in the background
cd /app/install/linux
mkdir ./recordings
chmod +x ./mediamtx
./mediamtx ../config/mediamtx.yml &

# Start the Next.js app
cd /app

# Run
npm run start:api
