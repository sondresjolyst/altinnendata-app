FROM node:26.13.1-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS builder

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Names the environment being built for. Anything but prod/production serves a robots.txt that
# disallows crawling, so a test host is not indexed as a duplicate of the live site.
ARG SITE_ENV=dev
ENV SITE_ENV=${SITE_ENV}

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

ENV NODE_ENV=production

RUN npm run build

FROM node:26.13.1-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS runner

WORKDIR /app

ARG SITE_ENV=dev
ENV SITE_ENV=${SITE_ENV}
ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "server.js"]
