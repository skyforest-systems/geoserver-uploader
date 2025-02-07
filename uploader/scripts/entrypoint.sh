#!/bin/bash

# Start your main application logic or any initialization tasks here
echo "Starting up the uploader service..."

# Run the main Python script in the background
# python /app/main.py &

/scripts/routine.sh

# Keep the container running by using `tail -f` on a dummy file (e.g., /dev/null)
tail -f /dev/null
