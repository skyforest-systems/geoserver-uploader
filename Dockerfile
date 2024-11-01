FROM osgeo/gdal:ubuntu-small-3.6.3

WORKDIR /app

RUN apt-get update

RUN apt-get install -y \
    python3-pip \
    python3-gdal \
    python3-dev \
    python3-setuptools \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY scripts /scripts

ENTRYPOINT ["sh", "/scripts/entrypoint.sh"]
