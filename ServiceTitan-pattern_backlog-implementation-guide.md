# ServiceTitan Pattern Backlog + Implementation Guide (Office Persona)
> **Proje:** ServicePRO (Marlin Yatçılık) — Office-first dispatch & call-center odaklı yeniden tasarım  
> **Hedef:** Mevcut modüller (Servis CRUD + Personel + Tekne + Dashboard + Sync) üzerine, ServiceTitan benzeri **iş akışı** (Job+Appointment, Dispatch Board, Call Booking/Leads, Alerts/Notification Center, Pricebook-Lite/Templates) inşa etmek.  
> **Kapsam dışı (şimdilik):** Faturalama/ERP (harici sistemde).  
> **Not:** Bu doküman “Codex’e direkt verilecek backlog + implementation guide” formatındadır. Sprint sıralaması ve bağımlılıklar backlog içine gömülüdür.

---

## 0) Mevcut Durum (Repo Dokümanlarından Kısa Özet)
Projede halihazırda:
- JWT auth + RBAC (ADMIN / YETKILI), whitelist kontrolü
- Servis yönetimi (CRUD), durum filtreleri, personel atama, servis kapanış akışı
- Personel + Tekne yönetimi
- Dashboard (istatistik kartları, teknisyen durumu, hava durumu)
- Sync (Google Sheets) ve doğrulama/reconcile araçları
- UI/UX: shadcn/ui + premium dark theme + datatable, skeleton, empty-state

> Bu backlog, mevcut “Servis” kavramını **JOB** olarak ele alır. “Appointment” ise **job’a bağlı zamanlanmış ziyaret/slot** katmanıdır.

---

## 1) ServiceTitan Pattern — “Neyi Kopyalıyoruz?”
ServiceTitan’da ofis için kritik pattern’ler (bizim hedef):
1) **JOB + APPOINTMENT ayrımı**  
   - Job: talep/iş kaydı (tekne/iş tipi/durum/özet)  
   - Appointment: işin sahaya/ziyarete dökülmüş, zamanlı ve atanmış planı (başlangıç-bitiş, teknisyen, konum, confirm/eta)

2) **DISPATCH BOARD**  
   - Günlük/haftalık teknisyen çizelgesi + “job tray” (atanmamış işler)  
   - Drag & drop planlama, kapasite görünümü, hızlı re-planlama, filtreler

3) **CALL BOOKING / LEADS**  
   - Gelen çağrı/istek → Booking kaydı → (Job’a dönüşür) veya Lead olarak follow-up

4) **ALERT RULES + NOTIFICATION CENTER**  
   - Kural tabanlı uyarılar (örn. “randevu 24 saat kala confirm yok”, “lead 2 gün bekledi”)  
   - Tek noktadan bildirim merkezi + okunma/aksiyon

5) **PRICEBOOK-LITE + TEMPLATES**  
   - Ofisin hızlı fiyat/kalem eklemesi için sade pricebook  
   - Sık iş tipleri için şablonlar (iş açarken 1 tıkla kalem seti)

---

## 2) Tasarım İlkeleri (Office-first)
- **Hız:** Ofis personeli için tek ekranda maksimum iş — “çok tık” yok.
- **Klavye odaklılık:** Global search + command palette + hızlı create.
- **Yoğun veri görünümü:** Dispatch ve listelerde **yüksek yoğunluk** (ServiceTitan benzeri).
- **Audit & izlenebilirlik:** “Kim, neyi, ne zaman değiştirdi?” (Job/Appointment timeline).
- **Backwards compatibility:** Mevcut `/api/services` ve servis sayfaları bozulmadan, yeni `/api/jobs` katmanı eklenerek ilerlenir.
- **Zaman dilimi:** Türkiye için default, ileride çoklu zaman dilimi desteği.
- **Sync ile çatışmama:** Sheets sync’in yazdığı alanlar net; Appointment ve Dispatch alanları sync tarafından overwrite edilmez.

---

## 3) Yol Haritası / Sprint Planı (Bağımlılıklar ile)
> Sprint süreleri ekip hızına göre ayarlanır; sıralama bağımlılık odaklıdır.

### Sprint 0 — Foundation (1–2 gün)
- STP-FOUND-001: “Job” domain alias katmanı (Service = Job) + yeni route namespace
- STP-FOUND-002: AuditLog kullanım standardı (job/appointment olayları için)
- STP-FOUND-003: Seed & test data (tekne + personel + job/appointment örnekleri)
- STP-FOUND-004: UI için “High-density mode” theme tokens (glass azaltma)

**Çıktı:** `/jobs` ve `/dispatch` için sağlam altyapı.

### Sprint 1 — JOB + APPOINTMENT (3–5 gün)
- Appointment modeli + CRUD + job timeline
- Job → appointment üretme (job booking)
- Job detail ekranında “Appointments” sekmesi

### Sprint 2 — DISPATCH BOARD (5–8 gün)
- Day/Week dispatch board + job tray
- Drag & drop scheduling + conflict detection (çakışma/kilit)
- Filtreler (konum, personel, durum)

### Sprint 3 — CALL BOOKING / LEADS (4–6 gün)
- Call screen: booking kayıtları, arama, dönüşüm
- Lead pipeline + follow-up task’ları (basit)

### Sprint 4 — ALERT RULES + NOTIFICATION CENTER (4–7 gün)
- Kural motoru (event-driven)
- Notification center + okunma/aksiyon
- “job confirmations” (manual) + alert tetikleri

### Sprint 5 — PRICEBOOK-LITE + TEMPLATES (4–7 gün)
- Pricebook item/category + template bundle
- Job’a line item ekleme (estimate-lite)
- Şablondan job oluşturma / şablon uygulama

---

# EPIC 1 — JOB + APPOINTMENT (ServiceTitan pattern)

## 1.1 Amaç ve Kapsam
- “Servis” kaydı (Job) üzerinden **bir veya çoklu appointment** planlanabilsin.
- Ofis personeli job açarken veya sonradan appointment ekleyebilsin.
- Appointment’lar dispatch board’da görünsün.
- Job timeline/audit: status değişimleri, atamalar, zaman değişimleri kayıt altına alınsın.

## 1.2 Prisma Şema (Delta)
> Mevcut `Service` modeli **Job** olarak kullanılacak. Yeni tablo: `Appointment` + opsiyonel `JobActivity`.

```prisma
enum AppointmentStatus {
  PLANLANDI
  ONAY_BEKLIYOR
  ONAYLANDI
  YOLDA
  VARIS
  BASLADI
  TAMAMLANDI
  IPTAL
  ERTELENDI
}

model Appointment {
  id              String    @id @default(cuid())
  organizationId  String    @default("org_default") @map("organization_id")

  // Relations
  servisId        String    @map("servis_id")      // Service (Job)
  servis          Service   @relation("Service_Appointments", fields: [servisId], references: [id], onDelete: Cascade)

  personelId      String?   @map("personel_id")    // atanmış teknisyen (opsiyonel)
  personel        Personel? @relation("Personel_Appointments", fields: [personelId], references: [id], onDelete: SetNull)

  konumId         String?   @map("konum_id")       // opsiyonel: dinamik konum tablosu varsa
  // konum          Konum?  ... (Konum tablosu varsa ilişki eklenebilir)

  baslangicAt     DateTime  @map("baslangic_at")
  bitisAt         DateTime  @map("bitis_at")

  status          AppointmentStatus @default(PLANLANDI)

  // Confirmations (ServiceTitan job confirmations pattern - manuel)
  confirmedAt     DateTime? @map("confirmed_at")
  confirmedById   String?   @map("confirmed_by_id")
  confirmedBy     User?     @relation("User_ConfirmedAppointments", fields: [confirmedById], references: [id], onDelete: SetNull)

  // Operasyon
  notlar          String?
  sira            Int       @default(0)            // çoklu appointment sıralaması
  kilitli         Boolean   @default(false)        // dispatch’te “kilit”
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  @@index([servisId])
  @@index([personelId])
  @@index([baslangicAt])
  @@index([status])
  @@map("appointment")
}

// Service modeline relation ekle
model Service {
  // ...
  appointments Appointment[] @relation("Service_Appointments")
}
```

> **Migration notu:** Mevcut `Service.tarih` ve `Service.saat` alanlarından otomatik ilk Appointment üretmek için script eklenir (Sprint 1 içinde).

## 1.3 API Route Listesi
Yeni namespace (backwards compatible):
- `GET /api/jobs` — filtreli job listesi (durum, tekne, tarih aralığı)
- `POST /api/jobs` — job oluştur (mevcut `/api/services` wrapper)
- `GET /api/jobs/[id]` — job detay (+appointments summary)
- `PUT /api/jobs/[id]` — job güncelle
- `POST /api/jobs/[id]/complete` — job kapat (mevcut akış wrapper)

Appointments:
- `GET /api/jobs/[id]/appointments`
- `POST /api/jobs/[id]/appointments` — appointment oluştur
- `PUT /api/appointments/[id]` — update (time, personel, status, notes, lock)
- `POST /api/appointments/[id]/confirm` — manual confirm (confirmedAt/by)
- `DELETE /api/appointments/[id]` — soft delete

Dispatch feed (Sprint 2’ye bağımlı ama endpoint Sprint 1’de stub olabilir):
- `GET /api/dispatch/day?date=YYYY-MM-DD&konumId=...`
- `GET /api/dispatch/week?start=YYYY-MM-DD`

## 1.4 UI Komponent Listesi
Routes:
- `/jobs` (liste)
- `/jobs/[id]` (detail)
- `/jobs/[id]/edit` (opsiyonel)
- `/jobs/[id]?tab=appointments`

Components:
- `components/jobs/job-table/*` (tanstack table)
- `components/jobs/job-detail/JobHeader.tsx`
- `components/jobs/job-detail/AppointmentsTab.tsx`
- `components/appointments/AppointmentDialog.tsx` (create/edit)
- `components/appointments/AppointmentList.tsx` (job içinde)
- `components/appointments/ConfirmButton.tsx`
- `components/shared/Timeline.tsx` (job activity feed)

## 1.5 Backlog (User Stories + Kabul Kriterleri)

### STP-JA-001 — Appointment Model + Migration
**Tanım:** Appointment tablosu ve `Service → Appointment` relation’ı eklenecek.  
**Kabul Kriterleri:**
- Prisma migration çalışır, prod için idempotent.
- `Service` kaydı silinince appointment’lar cascade/soft delete stratejisine uygun davranır.
- Seed: en az 10 job + 15 appointment örneği.
- `npm run build:strict` geçer.

### STP-JA-002 — Job Detail’de Appointments Sekmesi
**Tanım:** Job detail ekranında appointment listesi + create/edit modal.  
**Kabul Kriterleri:**
- Ofis kullanıcı job detail’den appointment ekleyebilir.
- Appointment time/personel değişince UI anında güncellenir.
- Çakışma kontrolü: aynı personelde aynı zaman aralığında ikinci appointment oluşturulamaz (backend validate + UI mesaj).

### STP-JA-003 — Manual Confirmation
**Tanım:** Appointment “confirm/unconfirm” akışı.  
**Kabul Kriterleri:**
- Confirm action `confirmedAt` + `confirmedBy` yazar.
- Dispatch board için “unconfirmed” filtrelenebilir (Sprint 2’de kullanılır).
- AuditLog’da event oluşur: `APPOINTMENT_CONFIRMED`.

### STP-JA-004 — Job Booking API (Job + First Appointment)
**Tanım:** “Book job” ekranında job oluştururken otomatik ilk appointment yarat.  
**Kabul Kriterleri:**
- Tek istekle transaction: job + appointment.
- Validation: start<end, gerekli alanlar.
- Başarısızlıkta partial kayıt kalmaz.

---

# EPIC 2 — DISPATCH BOARD (ServiceTitan pattern)

## 2.1 Amaç ve Kapsam
- Ofis “dispatch” ekranında teknisyen çizelgesini görür: **day/week view**.
- “Job tray” (atanmamış appointments) sağ panelde listelenir.
- Drag & drop ile atama & saat kaydırma.
- Çakışma/kapasite uyarıları.

## 2.2 Prisma Şema (Delta)
Dispatch için minimum ek:
```prisma
model DispatchPreference {
  id              String   @id @default(cuid())
  organizationId  String   @default("org_default") @map("organization_id")
  userId          String   @map("user_id")
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // UI tercihler
  varsayilanGorunum String  @default("DAY") // DAY/WEEK
  gosterilenPersonelIds String? @map("gosterilen_personel_ids") // JSON array string
  yogunMod          Boolean @default(true)  // high density mode

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@unique([userId])
  @@map("dispatch_preference")
}
```

> Not: “route optimization / map” şimdilik kapsam dışı; altyapı sadece slot+dragdrop.

## 2.3 API Route Listesi
- `GET /api/dispatch/day?date=...`
- `GET /api/dispatch/week?start=...`
- `POST /api/dispatch/move`  
  Body: `{ appointmentId, personelId, baslangicAt, bitisAt, optimisticLockVersion? }`
- `POST /api/dispatch/lock` / `POST /api/dispatch/unlock`
- `GET /api/dispatch/preferences`
- `PUT /api/dispatch/preferences`

## 2.4 UI Komponent Listesi
Routes:
- `/dispatch` (default DAY)
- `/dispatch?view=week`

Components:
- `components/dispatch/DispatchBoard.tsx`
- `components/dispatch/TechnicianLane.tsx`
- `components/dispatch/AppointmentCard.tsx`
- `components/dispatch/JobTray.tsx`
- `components/dispatch/DispatchFilters.tsx`
- `components/dispatch/DispatchToolbar.tsx`
- `components/dispatch/ConflictDialog.tsx`

> UI motoru önerisi: FullCalendar (resource timeline) **veya** custom grid + dnd-kit. (UI araştırması ayrı dokümanda.)

## 2.5 Backlog

### STP-DB-001 — Dispatch Day View (Read-only)
**Kabul Kriterleri:**
- Tarih seçimi (today/prev/next)
- Personel kolonlarında appointment’lar görünür
- Job tray’de unassigned appointment listesi
- Filtre: konum, durum, confirmed/unconfirmed

### STP-DB-002 — Drag & Drop Move/Resize
**Kabul Kriterleri:**
- Drag ile personel değişir, saat kayar
- Resize ile süre değişir
- Backend conflict validation
- Başarısızlıkta UI rollback + toast

### STP-DB-003 — Lock / Protected Appointments
**Kabul Kriterleri:**
- Kilitli appointment drag edilemez
- Yetkili “unlock” yapabilir
- Audit event: `APPOINTMENT_LOCKED/UNLOCKED`

### STP-DB-004 — Week View + Capacity Warnings
**Kabul Kriterleri:**
- Week view (Pzt-Paz)
- Basit kapasite: personel/gün toplam saat > threshold ise uyarı
- Preference kaydı (user bazlı)

---

# EPIC 3 — CALL BOOKING / LEADS (ServiceTitan pattern)

## 3.1 Amaç ve Kapsam
- Gelen arama/WhatsApp/web form gibi girişler **Booking** olarak kaydedilir.
- CSR/Ofis booking’i açar: müşteri/tekne arar veya yeni oluşturur.
- Booking → (hemen) Job + Appointment’a dönüşebilir veya Lead’e taşınır.
- Lead pipeline: takip tarihi, durum, notlar.

## 3.2 Prisma Şema (Delta)
```prisma
enum BookingStatus {
  YENI
  ISLEMDE
  JOB_OLUSTURULDU
  LEAD_OLUSTURULDU
  REDDEDILDI
}

enum LeadStatus {
  YENI
  TAKIPTE
  TEKLIF_BEKLIYOR
  KAYBEDILDI
  KAZANILDI
}

model Booking {
  id              String   @id @default(cuid())
  organizationId  String   @default("org_default") @map("organization_id")

  kaynak          String?  // phone, whatsapp, web, referral
  arayanAd        String?  @map("arayan_ad")
  telefon         String?
  email           String?
  tekneAd         String?  @map("tekne_ad")
  tekneSeriNo     String?  @map("tekne_seri_no")
  konu            String?  // kısa özet
  notlar          String?
  tercihTarih     DateTime? @map("tercih_tarih")
  tercihSaatAraligi String? @map("tercih_saat_araligi") // "09:00-12:00"
  status          BookingStatus @default(YENI)

  // Link to created entities
  tekneId         String?  @map("tekne_id")
  tekne           Tekne?   @relation(fields: [tekneId], references: [id], onDelete: SetNull)
  servisId        String?  @map("servis_id")
  servis          Service? @relation(fields: [servisId], references: [id], onDelete: SetNull)
  leadId          String?  @map("lead_id")
  lead            Lead?    @relation(fields: [leadId], references: [id], onDelete: SetNull)

  ownerUserId     String?  @map("owner_user_id") // CSR ataması (opsiyonel)
  ownerUser       User?    @relation("User_Bookings", fields: [ownerUserId], references: [id], onDelete: SetNull)

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([telefon])
  @@map("booking")
}

model Lead {
  id              String   @id @default(cuid())
  organizationId  String   @default("org_default") @map("organization_id")

  kaynak          String?
  ad              String?
  telefon         String?
  email           String?
  konu            String?
  notlar          String?
  status          LeadStatus @default(YENI)
  takipAt         DateTime?  @map("takip_at")

  tekneId         String?
  tekne           Tekne?    @relation(fields: [tekneId], references: [id], onDelete: SetNull)

  ownerUserId     String?
  ownerUser       User?     @relation("User_Leads", fields: [ownerUserId], references: [id], onDelete: SetNull)

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([takipAt])
  @@map("lead")
}
```

## 3.3 API Route Listesi
- `GET /api/bookings?status=...&q=...`
- `POST /api/bookings`
- `GET /api/bookings/[id]`
- `PUT /api/bookings/[id]`
- `POST /api/bookings/[id]/convert-to-job` (transaction: tekne upsert + job + first appointment)
- `POST /api/bookings/[id]/convert-to-lead`
- `POST /api/bookings/[id]/dismiss`

Leads:
- `GET /api/leads?status=...&owner=...&dueBefore=...`
- `POST /api/leads`
- `PUT /api/leads/[id]`
- `POST /api/leads/[id]/convert-to-job`

## 3.4 UI Komponent Listesi
Routes:
- `/calls` (Call Booking ekranı)
- `/calls/[id]` (Booking detay)
- `/leads` (Lead list + pipeline)
- `/leads/[id]`

Components:
- `components/calls/CallsTable.tsx`
- `components/calls/BookingForm.tsx`
- `components/calls/ConvertToJobDialog.tsx`
- `components/leads/LeadPipeline.tsx` (kanban-lite)
- `components/leads/FollowUpPicker.tsx`

## 3.5 Backlog

### STP-CB-001 — Calls Screen (Bookings)
**Kabul Kriterleri:**
- Booking listesi: status filtre + arama (telefon/tekne adı)
- “Yeni Booking” hızlı form
- Booking detayda “Convert to Job / Convert to Lead” aksiyonları

### STP-CB-002 — Convert Booking → Job + Appointment
**Kabul Kriterleri:**
- Tekne varsa bağlar, yoksa create
- Job created: durum = RANDEVU_VERILDI (veya uygun)
- Appointment created: tercih tarih/saat aralığına göre (net saat yoksa default slot)
- Audit: BOOKING_CONVERTED_TO_JOB

### STP-CB-003 — Lead Pipeline + Follow-up
**Kabul Kriterleri:**
- Lead status değişimi (drag/drop veya select)
- Takip zamanı (takipAt) geçmişse “overdue” görünür
- Lead → Job conversion

---

# EPIC 4 — ALERT RULES + NOTIFICATION CENTER (ServiceTitan pattern)

## 4.1 Amaç ve Kapsam
- Kural tabanlı uyarılar: Job/Appointment/Lead olaylarına göre tetiklenir.
- Bildirim merkezi: kullanıcıya göre okunma/aksiyon.
- İlk odak: ofis operasyonlarını hızlandıran kritik uyarılar.

## 4.2 Prisma Şema (Delta)
```prisma
enum NotificationChannel {
  IN_APP
  EMAIL   // future
  SMS     // future
}

enum NotificationStatus {
  YENI
  OKUNDU
  ARSIV
}

model AlertRule {
  id              String   @id @default(cuid())
  organizationId  String   @default("org_default") @map("organization_id")

  ad              String
  aktif           Boolean  @default(true)
  eventTipi       String   @map("event_tipi") // e.g. APPOINTMENT_UNCONFIRMED_24H
  kosulJson       String   @map("kosul_json") // JSON (threshold, filters)
  hedefRol        UserRole? @map("hedef_rol") // ADMIN/YETKILI
  hedefUserId     String?  @map("hedef_user_id")
  hedefUser       User?    @relation("User_AlertRules", fields: [hedefUserId], references: [id], onDelete: SetNull)

  kanal           NotificationChannel @default(IN_APP)

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([aktif])
  @@index([eventTipi])
  @@map("alert_rule")
}

model Notification {
  id              String   @id @default(cuid())
  organizationId  String   @default("org_default") @map("organization_id")

  userId          String   @map("user_id")
  user            User     @relation("User_Notifications", fields: [userId], references: [id], onDelete: Cascade)

  baslik          String
  mesaj           String
  entityTipi      String?  @map("entity_tipi") // JOB/APPOINTMENT/LEAD
  entityId        String?  @map("entity_id")
  actionUrl       String?  @map("action_url")
  status          NotificationStatus @default(YENI)

  createdAt       DateTime @default(now()) @map("created_at")
  readAt          DateTime? @map("read_at")

  @@index([status])
  @@index([createdAt])
  @@map("notification")
}
```

## 4.3 API Route Listesi
Rules:
- `GET /api/alerts/rules`
- `POST /api/alerts/rules`
- `PUT /api/alerts/rules/[id]`
- `DELETE /api/alerts/rules/[id]`

Notifications:
- `GET /api/notifications?status=...`
- `POST /api/notifications/[id]/read`
- `POST /api/notifications/[id]/archive`
- `POST /api/notifications/read-all`

Rule engine / evaluation:
- `POST /api/alerts/evaluate` (manual)
- `GET /api/alerts/status` (last run)
- (opsiyonel) `POST /api/cron/alerts` (scheduled)

## 4.4 UI Komponent Listesi
Routes:
- `/notifications`
- `/ayarlar/alerts` (admin)

Components:
- `components/notifications/NotificationBell.tsx`
- `components/notifications/NotificationCenter.tsx`
- `components/alerts/AlertRulesTable.tsx`
- `components/alerts/AlertRuleDialog.tsx`

## 4.5 Backlog

### STP-AN-001 — Notification Center (In-app)
**Kabul Kriterleri:**
- Header’da bell + unread count
- Liste: read/unread, entity link, mark as read
- Bulk “read all”

### STP-AN-002 — Alert Rules CRUD
**Kabul Kriterleri:**
- Basit rule şablonları:  
  - Appointment unconfirmed 24h  
  - Lead follow-up overdue  
  - Appointment overlap detected  
- Rule aktif/pasif
- Rule test/run (manual evaluate)

### STP-AN-003 — Job Confirmations + Alerts Integration
**Kabul Kriterleri:**
- Appointment confirm yoksa 24h kala notification oluşur
- Confirm edilince notification “resolved” mantığı (archive veya auto mark read)

---

# EPIC 5 — PRICEBOOK-LITE + TEMPLATES (ServiceTitan pattern)

## 5.1 Amaç ve Kapsam
- Ofis personeli job açarken “kalem” ekleyebilsin: işçilik, malzeme, paket.
- Basit pricebook ile standart isim/kod/fiyat kullanılsın.
- “Templates” ile hızlı iş açma: örn. *Periyodik bakım*, *Elektrik arıza*, *Jeneratör servis*.

## 5.2 Prisma Şema (Delta)
```prisma
enum PricebookItemType {
  HIZMET
  MALZEME
  PAKET
}

model PricebookCategory {
  id              String   @id @default(cuid())
  organizationId  String   @default("org_default") @map("organization_id")

  ad              String
  parentId        String?  @map("parent_id")
  parent          PricebookCategory? @relation("PB_CategoryTree", fields: [parentId], references: [id], onDelete: SetNull)
  children        PricebookCategory[] @relation("PB_CategoryTree")

  sira            Int      @default(0)
  aktif           Boolean  @default(true)

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  items           PricebookItem[]

  @@index([aktif])
  @@map("pricebook_category")
}

model PricebookItem {
  id              String   @id @default(cuid())
  organizationId  String   @default("org_default") @map("organization_id")

  tip             PricebookItemType
  kod             String?  @unique
  ad              String
  aciklama        String?
  birim           String?  // adet, saat, paket
  varsayilanSüreSaat Decimal? @map("varsayilan_sure_saat")
  varsayilanFiyat  Decimal? @map("varsayilan_fiyat")
  maliyet          Decimal? @map("maliyet")

  categoryId      String?  @map("category_id")
  category        PricebookCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  aktif           Boolean @default(true)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([tip])
  @@index([aktif])
  @@map("pricebook_item")
}

model JobLineItem {
  id              String   @id @default(cuid())
  organizationId  String   @default("org_default") @map("organization_id")

  servisId        String   @map("servis_id")
  servis          Service  @relation("Service_LineItems", fields: [servisId], references: [id], onDelete: Cascade)

  pricebookItemId String?  @map("pricebook_item_id")
  pricebookItem   PricebookItem? @relation(fields: [pricebookItemId], references: [id], onDelete: SetNull)

  ad              String
  miktar          Decimal  @default(1.0)
  birimFiyat      Decimal  @map("birim_fiyat")
  toplam          Decimal  @map("toplam")
  notlar          String?

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([servisId])
  @@map("job_line_item")
}

model JobTemplate {
  id              String   @id @default(cuid())
  organizationId  String   @default("org_default") @map("organization_id")

  ad              String
  aciklama        String?
  aktif           Boolean @default(true)

  defaultStatus   String?  @map("default_status") // RANDEVU_VERILDI vs
  defaultNotlar   String?  @map("default_notlar")

  items           JobTemplateItem[]

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("job_template")
}

model JobTemplateItem {
  id              String @id @default(cuid())
  templateId      String @map("template_id")
  template        JobTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  pricebookItemId String? @map("pricebook_item_id")
  pricebookItem   PricebookItem? @relation(fields: [pricebookItemId], references: [id], onDelete: SetNull)

  ad              String
  miktar          Decimal @default(1.0)
  birimFiyat      Decimal @map("birim_fiyat")
  sira            Int     @default(0)

  @@index([templateId])
  @@map("job_template_item")
}

// Service modeline relation ekle
model Service {
  // ...
  lineItems JobLineItem[] @relation("Service_LineItems")
}
```

## 5.3 API Route Listesi
Pricebook:
- `GET /api/pricebook/items?type=...&q=...`
- `POST /api/pricebook/items`
- `PUT /api/pricebook/items/[id]`
- `GET /api/pricebook/categories`
- `POST /api/pricebook/categories`
- `PUT /api/pricebook/categories/[id]`

Templates:
- `GET /api/templates/jobs`
- `POST /api/templates/jobs`
- `PUT /api/templates/jobs/[id]`
- `POST /api/templates/jobs/[id]/apply-to-job` (job’a line item seti uygula)
- `POST /api/templates/jobs/[id]/create-job` (template’den job + first appointment)

Job line items:
- `GET /api/jobs/[id]/line-items`
- `POST /api/jobs/[id]/line-items`
- `PUT /api/line-items/[id]`
- `DELETE /api/line-items/[id]`

## 5.4 UI Komponent Listesi
Routes:
- `/pricebook` (liste)
- `/pricebook/items`
- `/pricebook/categories`
- `/templates/jobs`
- `/jobs/[id]?tab=estimate` (estimate-lite)

Components:
- `components/pricebook/PricebookItemsTable.tsx`
- `components/pricebook/ItemDialog.tsx`
- `components/templates/JobTemplatesTable.tsx`
- `components/templates/TemplateBuilder.tsx`
- `components/jobs/job-detail/EstimateTab.tsx`

## 5.5 Backlog

### STP-PB-001 — Pricebook Items CRUD + Search
**Kabul Kriterleri:**
- Kod/ad ile arama, type filtre
- Item create/edit dialog
- Soft delete / pasif yapma

### STP-PB-002 — Job’a Line Item Ekleme (Estimate-lite)
**Kabul Kriterleri:**
- Job detail → Estimate tab
- Pricebook’tan seç → miktar → toplam otomatik
- Toplamlar (subtotal) gösterilir
- Audit: LINE_ITEM_ADDED/UPDATED/REMOVED

### STP-PB-003 — Templates (Bundle)
**Kabul Kriterleri:**
- Template builder: item seç, sıra, miktar
- Job’a “Apply template”
- “Create job from template” (Sprint 5 sonu)

---

## 6) Test Planı (Minimum)
- Playwright:  
  - job create + appointment create  
  - dispatch drag/drop (optimistic + rollback)  
  - call booking → convert to job  
  - alert rule → notification 생성  
  - pricebook item → job line item  
- API tests: conflict validation, transaction atomicity.

---

## 7) Kritik Riskler ve Önlemler
- **Sync overwrite riski:** Appointment/dispatch alanlarını sync map’inden çıkar.
- **Zaman dilimi hataları:** DB’de UTC, UI’da TR timezone göster.
- **Performans:** Dispatch board için API response minimal; virtualization.
- **UI yoğunluğu:** “High density mode” + kullanıcı tercihi.

---

## 8) Referanslar (Araştırma Linkleri)
> Not: Bu referanslar, ServiceTitan pattern’lerini doğru modellemek için kullanılmıştır.
- Appointments ve job booking: https://help.servicetitan.com/how-to/manage-appointments  
- Job booking FAQ (multi-appointment): https://help.servicetitan.com/faq/job-booking-guide  
- Daily Dispatch Board: https://help.servicetitan.com/how-to/using-dispatch-board  
- Dispatch configuration: https://help.servicetitan.com/how-to/configure-dispatch-board  
- Leads / booking → lead: https://help.servicetitan.com/how-to/capture-a-lead-from-a-booking  
- Alerts: https://help.servicetitan.com/how-to/alerts  
- Automated confirmations: https://help.servicetitan.com/how-to/automated-job-confirmations  
- Pricebook excel template: https://help.servicetitan.com/how-to/pricebook-excel-template  
- Template pricebook items: https://help.servicetitan.com/how-to/manage-template-pricebook-items  

