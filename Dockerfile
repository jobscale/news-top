FROM node:lts-trixie-slim
SHELL ["bash", "-c"]
WORKDIR /home/node
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates sudo \
 && apt-get clean && rm -fr /var/lib/apt/lists/*
RUN echo 'node ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers.d/40-users

USER node
COPY --chown=node:staff package.json .
RUN npm i --omit=dev
COPY --chown=node:staff env.js .
COPY --chown=node:staff index.js .
COPY --chown=node:staff app app

CMD ["npm", "start"]
