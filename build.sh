#!/bin/bash

# Install Chromium dependencies
apt-get update
apt-get install -y wget gnupg ca-certificates

# Download Chromium binaries if necessary
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
dpkg -i google-chrome-stable_current_amd64.deb
apt-get install -f -y

# Install necessary libraries for Chromium
apt-get install -y libxss1 libappindicator3-1 libgdk-pixbuf2.0-0 libasound2 libatk-bridge2.0-0 libnss3 libxcomposite1 libxrandr2
