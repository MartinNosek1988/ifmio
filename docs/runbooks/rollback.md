# Deploy Rollback Runbook

> ifmio Property & Facility Management Platform

## 1. Kdy rollbackovat

| Situace | Akce |
|---------|------|
| API health check failuje po deploy | Rollback kódu |
| Web se nenačte / bílá stránka | Rollback kódu |
| Migrace selhala v půlce | DB restore + rollback kódu |
| Kritický bug v nové verzi | Rollback kódu (+ případně DB) |
| Performance degradace | Rollback kódu |

---

## 2. App rollback (bez DB změn)

Pokud nový deploy nezahrnoval migraci, stačí vrátit kód na předchozí commit:

```bash
ssh deploy@server << 'REMOTE'
  set -e
  cd /opt/ifmio

  # 1. Najít předchozí commit
  git log --oneline -5
  # Zkopírovat hash posledního funkčního commitu

  # 2. Checkout předchozího commitu
  git checkout <PREVIOUS_COMMIT_SHA>

  # 3. Rebuild a restart
  docker compose -f docker-compose.prod.yml build --no-cache
  docker compose -f docker-compose.prod.yml up -d

  # 4. Ověřit
  sleep 20
  curl -sf http://localhost:3000/api/v1/health | jq .
REMOTE
```

### Alternativa — revert přes GitHub

```bash
# Lokálně
git revert HEAD
git push origin main
# CI projede → automatický deploy revertnuté verze
```

---

## 3. App rollback (s DB migrací)

Pokud deploy zahrnoval Prisma migraci, situace je složitější.

### 3a. Migrace přidala sloupce/tabulky (additive)

Additivní migrace (nové sloupce, tabulky, indexy) jsou zpětně kompatibilní.

```bash
# Stačí rollback kódu — starší kód ignoruje nové sloupce
git checkout <PREVIOUS_COMMIT_SHA>
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

> **Poznámka**: Nové sloupce/tabulky zůstanou v DB. Uklidit v následující migraci.

### 3b. Migrace změnila/smazala sloupce (destructive)

Destructivní migrace (drop column, rename, alter type) vyžadují DB restore.

```bash
# 1. Zastavit aplikaci
ssh deploy@server "cd /opt/ifmio && docker compose -f docker-compose.prod.yml stop api"

# 2. Obnovit DB ze zálohy (viz backup-restore.md, sekce 3b)
pg_restore \
  --dbname="$DIRECT_URL" \
  --no-owner --no-privileges --clean --if-exists \
  backup_pre_deploy.dump

# 3. Rollback kódu
ssh deploy@server << 'REMOTE'
  cd /opt/ifmio
  git checkout <PREVIOUS_COMMIT_SHA>
  docker compose -f docker-compose.prod.yml build --no-cache
  docker compose -f docker-compose.prod.yml up -d
REMOTE

# 4. Ověřit migrační stav
npx prisma migrate status
```

---

## 4. Failed migration recovery

Pokud `prisma migrate deploy` selže v půlce:

```bash
# 1. Zkontrolovat stav
npx prisma migrate status
# Zobrazí, která migrace selhala

# 2a. Pokud se migrace neaplikovala (failed before any SQL)
#     → Opravit migrační soubor, znovu spustit deploy

# 2b. Pokud se migrace aplikovala částečně
#     → DB je v nekonzistentním stavu
#     → Restore ze zálohy (viz backup-restore.md)

# 3. Po opravě
npx prisma migrate deploy
npx prisma migrate status
# Všechny migrace by měly být "applied"
```

### Prevence

- **Vždy dělat pg_dump před destructivní migrací**
- Testovat migrace proti CI databázi (ci.yml to dělá automaticky)
- Preferovat additivní migrace (přidávat, ne mazat)
- Pokud migrace mění data, rozdělit na dvě: schema change + data migration

---

## 5. Emergency hotfix

Pokud je potřeba rychlá oprava bez čekání na plný CI cyklus:

```bash
# 1. Vytvořit hotfix branch
git checkout main
git pull
git checkout -b hotfix/critical-fix

# 2. Opravit, commit, push
git add .
git commit -m "hotfix: popis opravy"
git push -u origin hotfix/critical-fix

# 3. Vytvořit PR → merge do main
# CI projede → automatický deploy

# 4. Pokud CI trvá příliš dlouho a je to KRITICKÉ:
ssh deploy@server << 'REMOTE'
  cd /opt/ifmio
  git fetch origin hotfix/critical-fix
  git checkout origin/hotfix/critical-fix
  docker compose -f docker-compose.prod.yml build --no-cache
  docker compose -f docker-compose.prod.yml up -d
REMOTE
# POZOR: Po merge do main se deploy spustí znovu
```

---

## 6. Rozhodovací strom

```
Deploy selhal?
├── Health check failuje
│   ├── API container neběží → zkontrolovat logy, rollback kódu
│   ├── DB connection failed → zkontrolovat Supabase status
│   └── Migration failed → viz sekce 4
├── Aplikace běží, ale má bug
│   ├── Bug je v nové funkci → revert commit, nový deploy
│   └── Bug rozbil existující funkci → rollback na předchozí commit
└── Performance problém
    ├── DB dotazy pomalé → zkontrolovat nové queries, rollback
    └── Memory/CPU spike → zkontrolovat logy, restart containers
```

---

## 7. Post-mortem checklist

Po každém incidentu:

- [ ] Co se stalo (timeline)
- [ ] Jak byl incident detekován
- [ ] Jaká byla root cause
- [ ] Jak byl vyřešen
- [ ] Jak dlouho trval výpadek (RTO skutečný vs cíl)
- [ ] Kolik dat bylo ztraceno (RPO skutečný vs cíl)
- [ ] Co udělat, aby se to neopakovalo
