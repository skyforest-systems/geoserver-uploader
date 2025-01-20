Before starting any container, create the network:

```bash
docker network create skyforest-systems
```

Now, get the initial certificates:

```bash
docker run --rm \
  -v ../proxy/certbot:/etc/letsencrypt \
  -v ../proxy/logs:/var/log/nginx \
  certbot/certbot certonly \
  --webroot -w /var/www/certbot \
  -d map.skyforest.se
```

Now, run the Portainer stack:
```bash
docker compose -f docker/portainer.yml up -d
```
