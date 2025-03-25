FROM node:22.12.0-bookworm

WORKDIR /app

RUN apt-get update &&\
    apt-get install -y binutils libproj-dev gdal-bin

COPY package.json /app/package.json

RUN npm install

COPY . /app

RUN npm install typescript -g

RUN tsc

CMD ["node", "dist/src/index.js"]