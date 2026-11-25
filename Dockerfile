# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID=khadayataonline
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT=production
ARG VITE_SENTRY_RELEASE

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT \
    VITE_SENTRY_RELEASE=$VITE_SENTRY_RELEASE

RUN --mount=type=secret,id=sentry_auth_token \
    sh -c 'if [ -f /run/secrets/sentry_auth_token ]; then export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)"; fi; npm run build'

FROM nginx:1.27-alpine AS runner

COPY nginx.spa.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1
