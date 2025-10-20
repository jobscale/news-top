FROM node:lts-bookworm-slim
SHELL ["bash", "-c"]
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates curl \
 && apt-get clean && rm -fr /var/lib/apt/lists/*
WORKDIR /home/node
USER node
COPY --chown=node:staff package.json .
RUN npm i --omit=dev
COPY --chown=node:staff env.js .
COPY --chown=node:staff index.js .
COPY --chown=node:staff app app
CMD ["npm", "start"]
