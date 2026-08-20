FROM node:23.10.0-slim AS builder

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Names the environment being built for. Anything but prod/production serves a robots.txt that
# disallows crawling, so a test host is not indexed as a duplicate of the live site.
ARG SITE_ENV
ENV SITE_ENV=${SITE_ENV}

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_ENV=production

RUN npm run build

FROM node:23.10.0-slim AS runner

WORKDIR /app

ARG SITE_ENV
ENV SITE_ENV=${SITE_ENV}
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
