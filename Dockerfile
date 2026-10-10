FROM node:26.10.0-slim AS builder

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Names the environment being built for. Anything but prod/production serves a robots.txt that
# disallows crawling, so a test host is not indexed as a duplicate of the live site.
ARG SITE_ENV
ENV SITE_ENV=${SITE_ENV}

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

ENV NODE_ENV=production

RUN npm run build

FROM node:26.10.0-slim AS runner

WORKDIR /app

ARG SITE_ENV
ENV SITE_ENV=${SITE_ENV}
ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "server.js"]
