# Backup & Restore Runbook

> ifmio Property & Facility Management Platform

## 1. Scope záloh

| Komponenta | Typ | Kde | Záloha |
|------------|-----|-----|--------|
| **PostgreSQL (Supabase)** | Managed DB | Supabase Dashboard | Automatické denní snapshoty (Supabase) + manuální pg_dump |
| **Uploaded files** | Lokální storage | `/opt/ifmio/uploads/` na serveru | Ruční rsync / tarball |
| **Aplikační kód** | Git repo | GitHub `MartinNosek1988/ifmio` | GitHub (main branch) |
| **Docker images** | Build artefakty | Server + registry | Rebuilt z repo (reprodukovatelné) |
| **Caddy TLS certifikáty** | Let's Encrypt | Docker volume `caddy_data` | Auto-obnovitelné, není třeba zálohovat |
| **Env / secrets** | Konfigurace | `.env` na serveru + GitHub Secrets | Manuální kopie v bezpečném úložišti |

### Co se NEzálohuje automaticky
- `.env` soubor na serveru (obsahuje secrets — uložit v password manageru)
- Docker volumes kromě uploads (caddy certifikáty se auto-obnoví)
- `node_modules` (reprodukovatelné z `package-lock.json`)

---

## 2. Backup frekvence

### Databáze (PostgreSQL / Supabase)

| Typ zálohy | Frekvence | Retention | Odpovědnost |
|------------|-----------|-----------|-------------|
| **Supabase automatické snapshoty** | Denně | 7 dní (Free/Pro) | Automatické |
| **Manuální pg_dump** | Týdně + před migrací | 30 dní | Ops lead |
| **Pre-deploy snapshot** | Před každým deploy | 7 dní | CI/CD (manuální trigger) |

#### Manuální pg_dump (doporučený příkaz)

```bash
# Na serveru nebo lokálně s přístupem k DIRECT_URL
export TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump "$DIRECT_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="backup_${TIMESTAMP}.dump"
```

#### Supabase CLI záloha

```bash
# Stáhnout backup přes Supabase Dashboard:
# Project → Database → Backups → Download
```

### Uploaded files

```bash
# Na serveru
export TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar czf "/backups/uploads_${TIMESTAMP}.tar.gz" /opt/ifmio/uploads/
```

### Env / Secrets

- Uložit kopii `.env` do password manageru (1Password, Bitwarden)
- Uložit kopii GitHub Secrets (SSH_HOST, SSH_USER, DIRECT_DATABASE_URL, ...)
- Aktualizovat při každé změně

---

## 3. Restore postup

### 3a. Obnova databáze do staging

```bash
# 1. Vytvořit staging DB (nebo použít existující)
createdb ifmio_staging

# 2. Obnovit ze zálohy
pg_restore \
  --dbname="postgresql://user:pass@host:5432/ifmio_staging" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  backup_20260312_120000.dump

# 3. Ověřit
psql "postgresql://user:pass@host:5432/ifmio_staging" \
  -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM audit_logs; SELECT MAX(name) FROM _prisma_migrations;"
```

### 3b. Obnova databáze do produkce

> **POZOR**: Toto přepíše produkční data. Použít pouze při katastrofickém selhání.

```bash
# 1. Zastavit aplikaci
ssh deploy@server "cd /opt/ifmio && docker compose -f docker-compose.prod.yml stop api"

# 2. Obnovit zálohu (přes DIRECT_URL, ne pooler)
pg_restore \
  --dbname="$DIRECT_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  backup_YYYYMMDD_HHMMSS.dump

# 3. Ověřit migrační stav
npx prisma migrate status

# 4. Pokud jsou pending migrace (nová verze kódu, starší záloha):
npx prisma migrate deploy

# 5. Restart aplikace
ssh deploy@server "cd /opt/ifmio && docker compose -f docker-compose.prod.yml up -d"
```

### 3c. Obnova uploaded files

```bash
# Na serveru
cd /opt/ifmio
tar xzf /backups/uploads_YYYYMMDD_HHMMSS.tar.gz
# Soubory se rozbalí do ./uploads/
```

### 3d. Plná obnova služby (disaster recovery)

Pokud server není dostupný nebo je potřeba přeinstalace:

```bash
# 1. Nový server — nainstalovat Docker, git
apt update && apt install -y docker.io docker-compose-plugin git

# 2. Clone repo
git clone https://github.com/MartinNosek1988/ifmio.git /opt/ifmio
cd /opt/ifmio

# 3. Obnovit .env z password manageru
cp /secure-storage/.env /opt/ifmio/.env

# 4. Obnovit uploads
tar xzf /backups/uploads_latest.tar.gz -C /opt/ifmio/

# 5. Build a start
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 6. Ověřit
curl -s http://localhost:3000/api/v1/health | jq .
# Očekávaný výstup: {"status":"ok","database":"connected",...}

# 7. DNS — přesměrovat doménu na nový server
```

---

## 4. Ověření obnovy

Po každém restore provést tyto kontroly:

### Automatické kontroly

```bash
# Health endpoint
curl -sf http://localhost:3000/api/v1/health | jq .
# Očekávat: {"status":"ok","database":"connected"}

# Počet klíčových tabulek
psql "$DIRECT_URL" <<SQL
  SELECT 'users' as tbl, COUNT(*) FROM users
  UNION ALL SELECT 'tenants', COUNT(*) FROM tenants
  UNION ALL SELECT 'properties', COUNT(*) FROM properties
  UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
  UNION ALL SELECT 'invoices', COUNT(*) FROM invoices;
SQL

# Migrační stav
npx prisma migrate status
# Všechny migrace by měly být "applied"
```

### Manuální kontroly

- [ ] Login funguje (testovací účet)
- [ ] Dashboard se načte bez chyb
- [ ] Nemovitosti jsou viditelné
- [ ] Finance data jsou přítomná
- [ ] Audit log zobrazuje historické záznamy
- [ ] Uploaded dokumenty jsou dostupné (pokud existují)

---

## 5. RTO / RPO

| Metrika | Cíl | Poznámka |
|---------|-----|----------|
| **RPO** (Recovery Point Objective) | < 24 hodin | Supabase denní snapshoty |
| **RTO** (Recovery Time Objective) | < 2 hodiny | Nový server + restore + DNS |
| **RPO při manuálním pg_dump** | < 1 hodina | Pokud se dělá před každým deploy |

### Jak zlepšit RPO
- Supabase Pro plán: Point-in-Time Recovery (PITR) — RPO v řádu minut
- WAL archivace do S3 — RPO v řádu sekund

### Jak zlepšit RTO
- Pre-built Docker images v registru (ušetří build time)
- Infrastructure as Code (Terraform) pro automatický provisioning serveru
- Standby server s replikou DB

---

## 6. Kontakty a eskalace

| Role | Kdo | Kontakt |
|------|-----|---------|
| Ops lead | TODO | TODO |
| DB admin (Supabase) | Supabase Dashboard | https://supabase.com/dashboard |
| Server provider | TODO | TODO |
| DNS provider | TODO | TODO |

---

## 7. Checklist — před a po deploy

### Před deploy
- [ ] Manuální pg_dump záloha (pokud migrace mění schéma)
- [ ] Ověřit, že CI quality gate prošel
- [ ] Zkontrolovat migrační soubory v PR

### Po deploy
- [ ] Health check OK
- [ ] Login funguje
- [ ] Zkontrolovat logy: `docker compose logs api --tail 50`
- [ ] Ověřit migrační stav: `npx prisma migrate status`
