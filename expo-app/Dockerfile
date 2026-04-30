# =====================================================================
# Sanatan Saathi — Expo (React Native) Metro bundler container
# NOTE: Expo Go scanning the QR from a physical phone requires either
#  - host networking (Linux only) so the QR encodes your laptop's LAN IP, OR
#  - tunnel mode (slower, needs ngrok/expo's free tunnel)
# On macOS / Windows, prefer running `cd expo-app && yarn start` natively.
# =====================================================================
FROM node:20-bullseye-slim

# Expo CLI's tunnel mode needs git, watchman is helpful for fewer rebuilds.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache yarn deps.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY . /app

# Metro / Expo dev server / Web preview ports
EXPOSE 8081 19000 19001 19002

ENV CHOKIDAR_USEPOLLING=true
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
ENV REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0

# Default: LAN mode. Override with `command: ["yarn", "start", "--tunnel"]`
# in docker-compose if your phone can't reach the container directly.
CMD ["yarn", "start", "--lan"]
