Before starting any container, create the network:

```bash
docker network create skyforest-systems
```

Now, run the Portainer stack and deploy the `stack.yml` through it.

To get the initial certificates:

```bash
docker exec -it certbot certbot certonly --webroot -w /var/www/certbot -d map.skyforest.se

```