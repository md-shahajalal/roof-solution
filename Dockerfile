# ---------- build ----------
FROM node:24-alpine AS build
WORKDIR /app

# Install deps first so this layer caches across source edits.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# `npm run build` also runs the privacy check, so a leaked home address fails
# the image build rather than reaching production.
RUN npm run build

# ---------- serve ----------
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/rm-roofing/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1
