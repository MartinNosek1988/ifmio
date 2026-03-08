# ifmio — Deploy Guide

## Pozadavky
- Server s Ubuntu 22.04+
- Docker + Docker Compose v2
- Domena namirena na server IP (A zaznam)
- Otevrene porty: 80, 443

## Rychly start

### 1. Klonovani a konfigurace
```bash
git clone <repo-url> ifmio
cd ifmio
cp .env.example .env
```

### 2. Vyplneni .env
```bash
# Povinne
POSTGRES_PASSWORD=silne_heslo_zde
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
DOMAIN=yourdomain.cz
CADDY_EMAIL=admin@yourdomain.cz

# Volitelne (email)
SMTP_HOST=smtp.yourprovider.cz
SMTP_USER=...
SMTP_PASS=...
```

### 3. Spusteni
```bash
docker compose -f docker-compose.prod.yml up -d
```

### 4. Overeni
```bash
# Logy
docker compose -f docker-compose.prod.yml logs -f api

# Health check
curl https://yourdomain.cz/api/v1/health
```

## Aktualizace
```bash
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Zaloha databaze
```bash
docker exec ifmio-postgres-1 \
  pg_dump -U ifmio ifmio > backup_$(date +%Y%m%d).sql
```

## Troubleshooting

### API nespusti se
```bash
docker compose -f docker-compose.prod.yml logs api
# Nejcastejsi duvod: DATABASE_URL spatne nastavena
```

### SSL certifikat se neziskal
- Over DNS: `dig yourdomain.cz`
- Caddy logy: `docker compose -f docker-compose.prod.yml logs caddy`
- Caddy potrebuje port 80+443 volne

### Email se neodesila
- Zkontroluj SMTP_HOST, SMTP_USER, SMTP_PASS v .env
- Test endpoint: `POST /api/v1/admin/email/test` s `{ "to": "test@email.cz" }`
- API logy: `docker compose -f docker-compose.prod.yml logs api | grep -i email`
