# UI/UX Research + Tasarım Sistemi Planı (ServiceTitan esinli)
> **Hedef:** Office-first kullanımda “modern, profesyonel, hızlı ve yoğun veri” arayüzü.  
> **Mevcut:** shadcn/ui + dark glassmorphism tema + TanStack Table yaklaşımı.

---

## 1) Mevcut UI’nin Eleştirel Analizi (Screenshot + Mevcut Yapı Üzerinden)
### Güçlü Yanlar
- Modern dark tema, premium hissiyat
- shadcn/ui + Radix sayesinde erişilebilir komponent temeli
- Skeleton/empty-state gibi detaylar iyi
- Dashboard modüler (widget mantığı doğru)

### Zayıf Yanlar (Office kullanımı açısından)
- **Glassmorphism**: çok blur/gradient = uzun listelerde okuma yorgunluğu, “kurumsal” hissi zayıflatabilir.
- **Bilgi yoğunluğu kontrolsüz**: kartlar çok, hiyerarşi zayıflıyor; kritik KPI ve aksiyonlar kayboluyor.
- **Dispatch/call-center için optimize değil**: hızlı arama + hızlı booking + tek ekranda planlama yok.
- **Tablo ergonomisi**: yoğun kullanımda satır yüksekliği, sticky header, column pinning, hızlı filtre gibi şeyler kritik.
- **“Eylem” odaklı UI eksik**: ServiceTitan’da her ekranda bir sonraki adım nettir (Book → Dispatch → Confirm → Complete).

---

## 2) shadcn/ui Yeterli mi?
### Kısa cevap
**Evet, temel UI altyapısı için yeterli.** Ama ServiceTitan tarzı bir uygulama için 3 ek kategoriye ihtiyaç var:
1) **Enterprise Data Grid** (pinning, virtualization, column resize, saved views)
2) **Scheduling/Dispatch Canvas** (resource timeline, drag-drop, resize)
3) **Notification + Command UX** (global search, shortcuts, action center)

shadcn/ui bu parçaları “hazır paket” olarak vermez; fakat:
- TanStack Table + react-virtual ile grid’i siz inşa edebilirsiniz,
- FullCalendar veya custom grid + dnd-kit ile dispatch’ı yapabilirsiniz,
- Command palette (cmdk) + toast/dialog ile hızlandırabilirsiniz.

### Ne zaman UI kütüphanesini değiştirmek mantıklı?
- “Biz kompleks grid’i kendimiz yazmak istemiyoruz” diyorsanız → **MUI DataGrid Pro / AG Grid** gibi çözümler ROI sağlar.
- “Kurumsal tasarım dilini hızlı standardize etmek istiyoruz” diyorsanız → Ant Design / MUI gibi “design system” odaklı setler hız kazandırır.
- “Tam kontrol + premium ama minimal” istiyorsanız → shadcn ile devam etmek mantıklı.

---

## 3) ServiceTitan ve Yaygın Servis Uygulamalarından UI Pattern’leri
Aşağıdaki pattern’ler ofis kullanımını ciddi hızlandırır:

### 3.1 Dispatch Board Pattern
- Sol/orta: teknisyen lane’leri (time grid)
- Sağ: job tray (unassigned)
- Üst: filtreler + görünüm (day/week) + kapasite
- Kartlar: “confirmed”, “priority”, “konum” gibi mikro-badge’lerle hızlı tarama
- Drag & drop + resize + conflict tooltip

### 3.2 Call Booking Pattern
- Tek ekran: çağrı bilgisi + müşteri/tekne arama + uygun slot önerisi
- 2 tıkla dönüşüm: “Convert to Job”
- Lead’e taşı: “Follow-up date” zorunlu

### 3.3 Notification Center Pattern
- Header bell: unread + hızlı aksiyon
- Notifications sayfası: filtre + entity link + “resolve”
- Uyarılar “az ama aksiyon alınabilir” olmalı (alert fatigue önlenir)

### 3.4 Pricebook + Templates Pattern
- Search-first: kod/ad arama, “recently used”
- Templates: sık işler için 1 tık “kalem seti”
- Job içinde Estimate tab: satır bazlı hızlı düzenleme

---

## 4) Önerilen UI Stack (Mevcut shadcn ile Uyumlu)
### 4.1 Tablo / Grid
- TanStack Table + react-virtual (virtualized rows)
- “Saved views” (kolon görünürlüğü + filtre seti)
- Column pinning (sol: müşteri/tekne, sağ: aksiyonlar)
- Inline filters (Excel-like) — zaten roadmap’te var

### 4.2 Dispatch
İki yol:

**A) FullCalendar Resource Timeline**
- Hızlı MVP, battle-tested drag/drop
- Resource (personel) + timegrid + custom event render
- Dezavantaj: Çok özelleştirmede karmaşıklaşabilir

**B) Custom Dispatch Canvas**
- react-virtual + dnd-kit + resizable
- Tam kontrol, ServiceTitan’a daha yakın “yoğun” görünüm
- Dezavantaj: geliştirme süresi daha uzun

> Sprint 2 için öneri: **A ile MVP**, sonra gerekirse B.

### 4.3 Interaction
- Command palette (cmdk): “create job”, “open booking”, “search boat”
- Hotkeys: `/` search, `n` new job, `d` dispatch
- Toast + inline validation (min modal)

### 4.4 Tema
- Glassmorphism’i azalt, “enterprise navy” + yüksek kontrast
- “High density mode” toggle
- Kart sayısını azalt, tablo/kanban ağırlığı artır

---

## 5) UI Değiştirme Alternatifleri (Kısa Karşılaştırma)
### Seçenek 1 — shadcn ile devam (önerilen)
**Artı:** Kod sahipliği, esneklik, modern görünüm  
**Eksi:** Grid/dispatch gibi ağır parçalar “bizim” sorumluluğumuz.

### Seçenek 2 — MUI (özellikle DataGrid Pro)
**Artı:** Enterprise grid hazır (pinning, grouping, virtualization, export)  
**Eksi:** Tasarım dili daha “Material”; mevcut Tailwind/shadcn ile karışınca tutarsızlık riski.

### Seçenek 3 — Ant Design
**Artı:** Kurumsal modüller, form & table hızlı  
**Eksi:** Tailwind ile birlikte kullanımda stil karmaşası; tema özelleştirme overhead.

### Seçenek 4 — PrimeReact
**Artı:** DataTable zengin  
**Eksi:** Görsel dil ve bundle, Next/Tailwind uyumu daha uğraştırabilir.

**Net öneri:** Şu aşamada “tam platform migration” yerine **shadcn + specialized components** ile ilerlemek.

---

## 6) UI Backlog (Sprint’lere Gömülü)
> Bu backlog, “pattern backlog” dokümanındaki epiklerle paralel ilerler.

### Sprint 0 — Görsel Temizlik + Yoğun Mod
- UI-0.1: Glass blur azalt, arka plan sadeleşsin
- UI-0.2: Table density preset (row height, font size, padding)
- UI-0.3: Sticky toolbar + global search alanı

### Sprint 2 — Dispatch UI
- UI-2.1: Dispatch day view canvas (FullCalendar veya custom)
- UI-2.2: Job tray + quick assign
- UI-2.3: Conflict tooltip + lock badge

### Sprint 3 — Call Booking UI
- UI-3.1: Call screen split layout (left: booking, right: boat search)
- UI-3.2: Quick convert flow (wizard değil, tek dialog)

### Sprint 4 — Notification UX
- UI-4.1: Bell + unread badge
- UI-4.2: Notification center list + action buttons

### Sprint 5 — Pricebook UX
- UI-5.1: Search-first picker (combobox)
- UI-5.2: Template builder (sortable list)

---

## 7) UI Acceptance Checklist (Office-persona)
- Bir booking’i **60 saniyede** job + appointment’a çevirebiliyor muyuz?
- Dispatch board’da “atanmamış işler” tek bakışta görülebiliyor mu?
- Drag/drop sonrası çakışma mesajı net mi?
- Listelerde: arama, filtre, kaydedilmiş görünüm var mı?
- Bildirimler aksiyon alınabilir mi (entity link + resolve)?

---

## 8) Referanslar
- shadcn/ui temel yaklaşım: https://www.shadcn.io/ui
- shadcn Data Table (TanStack): https://ui.shadcn.com/docs/components/data-table
- FullCalendar + shadcn örnek yaklaşım: https://github.com/robskinney/shadcn-ui-fullcalendar-example
- ServiceTitan dispatch & notifications (özellik sayfaları): https://www.servicetitan.com/features/dispatch-software
- ServiceTitan Daily Dispatch Board (KB): https://help.servicetitan.com/how-to/using-dispatch-board

