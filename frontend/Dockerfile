# =====================================================================
# Sanatan Saathi — Admin panel (Create React App) container
# Dev server with hot reload. Source is bind-mounted by docker-compose.
# For production, build with `yarn build` and serve the static output
# from /app/build behind nginx — out of scope for the dev compose.
# =====================================================================
FROM node:20-bullseye-slim

WORKDIR /app

# Install yarn deps in a cached layer.
COPY package.json package-lock.json ./
RUN npm install

# App source is bind-mounted; copy as fallback.
COPY . /app

EXPOSE 3000

# Polling-based file watching is required for hot reload inside Docker
# on macOS/Windows (overlayfs doesn't deliver inotify events to the VM).
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
ENV WDS_SOCKET_PORT=0

CMD ["npm", "start"]
