FROM public.ecr.aws/lambda/nodejs:24
SHELL ["bash", "-c"]

COPY package.json package.json
RUN npm i --omit=dev

COPY app app
COPY env.js .
COPY index.js .
COPY lambda.js .

CMD ["lambda.handler"]
