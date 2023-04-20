FROM node:18-bullseye-slim AS builder

ENV TZ="UTC"

WORKDIR "/app"

COPY . .

RUN apt-get update -y && apt-get install git -y
RUN npm i
RUN npm run build
RUN npm prune --production

FROM node:18-bullseye-slim AS production

ENV TZ="UTC"

WORKDIR "/app"

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.env ./.env
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/tsconfig.build.json ./tsconfig.build.json
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public

CMD ["sh", "-c", "npm run start:prod"]
