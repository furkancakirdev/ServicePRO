# ServicePro Production Deployment

Bu dokuman, ServicePro uygulamasinin NAS uzerinde Docker Compose ile production ortamina alinmasi icin adimlari icerir.

## 1. On Kosullar

- Docker Engine + Docker Compose v2 kurulu olmali.
- PostgreSQL production veritabani hazir olmali.
- NAS uzerinde backup klasoru olusturulmus olmali (ornek: `/volume1/servicepro/backups`).

## 2. Ortam Degiskenleri

1. `.env.production` dosyasini duzenleyin:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `NAS_BACKUP_DIR`
2. Gizli anahtarlari gercek production degerleri ile degistirin.

## 3. Build

```bash
docker compose -f docker-compose.prod.yml build --no-cache
```

## 4. Migration

```bash
docker compose -f docker-compose.prod.yml --profile ops run --rm migrate
```

Not: Dinamik ayarlar script'i gerekiyorsa uygulama kodu icinden bir kez calistirin:

```bash
node scripts/migrate-to-dynamic.ts
```

## 5. Uygulamayi Baslat

```bash
docker compose -f docker-compose.prod.yml up -d
```

## 6. Dogrulama

```bash
docker compose -f docker-compose.prod.yml ps
curl -f http://localhost:3000/api/health
```

Beklenen health yaniti:

```json
{ "status": "ok", "db": "ok" }
```

Yedekleme mount kontrolu:

```bash
docker compose -f docker-compose.prod.yml exec servicepro ls -la /app/backups
```

## 7. Kritik Smoke Testler

```bash
npm run test:e2e playwright/tests/integration/deployment-smoke.spec.ts
npm run test:e2e playwright/tests/integration
npm run test:e2e playwright/tests/uat
```

## 8. Rollback

1. Son bilinen saglikli image tag'ine donun.
2. Konteyneri yeniden baslatin:

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```
