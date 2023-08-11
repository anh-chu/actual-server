FROM node:1186-bullseye as base
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
ADD .yarn ./.yarn
ADD yarn.lock package.json .yarnrc.yml ./
RUN yarn workspaces focus --all --production

FROM node:18-bullseye-slim as prod
RUN apt-get update && apt-get install tini && apt-get clean -y && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=base /app/node_modules /app/node_modules
ADD package.json app.ts ./
ADD src ./src
ENTRYPOINT ["/usr/bin/tini","-g",  "--"]
EXPOSE 5006
CMD ["ts-node-esm", "app.ts"]
