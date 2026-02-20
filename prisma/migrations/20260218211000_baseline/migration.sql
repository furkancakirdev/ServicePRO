-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."IsTuru" AS ENUM ('PAKET', 'ARIZA', 'PROJE');

-- CreateEnum
CREATE TYPE "public"."PersonelRol" AS ENUM ('SORUMLU', 'DESTEK');

-- CreateEnum
CREATE TYPE "public"."PersonelUnvan" AS ENUM ('USTA', 'CIRAK', 'YONETICI', 'OFIS');

-- CreateEnum
CREATE TYPE "public"."Rozet" AS ENUM ('ALTIN', 'GUMUS', 'BRONZ');

-- CreateEnum
CREATE TYPE "public"."ServisDurumu" AS ENUM ('RANDEVU_VERILDI', 'DEVAM_EDİYOR', 'PARCA_BEKLIYOR', 'MUSTERI_ONAY_BEKLIYOR', 'RAPOR_BEKLIYOR', 'KESIF_KONTROL', 'TAMAMLANDI', 'IPTAL', 'ERTELENDI');

-- CreateEnum
CREATE TYPE "public"."SoruKategorisi" AS ENUM ('USTA', 'CIRAK', 'GENEL');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'YETKILI');

-- CreateEnum
CREATE TYPE "public"."ZorlukSeviyesi" AS ENUM ('RUTIN', 'ARIZA', 'PROJE');

-- CreateTable
CREATE TABLE "public"."audit_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT,
    "islem_turu" TEXT NOT NULL,
    "entity_tipi" TEXT NOT NULL,
    "entity_id" TEXT,
    "detay" TEXT,
    "ip_adresi" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organization_id" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."aylik_performans" (
    "id" TEXT NOT NULL,
    "personnel_id" TEXT NOT NULL,
    "personnel_ad" TEXT NOT NULL,
    "ay" TEXT NOT NULL,
    "servis_sayisi" INTEGER NOT NULL DEFAULT 0,
    "sorumlu_servis" INTEGER NOT NULL DEFAULT 0,
    "destek_servis" INTEGER NOT NULL DEFAULT 0,
    "bireysel_puan_ort" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yetkili_puan_ort" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ismail_puani" INTEGER,
    "toplam_puan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "siralama" INTEGER,
    "rozet" "public"."Rozet",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aylik_performans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ismail_degerlendirme" (
    "id" TEXT NOT NULL,
    "personnel_id" TEXT NOT NULL,
    "personnel_ad" TEXT NOT NULL,
    "ay" TEXT NOT NULL,
    "puan" INTEGER NOT NULL,
    "notlar" TEXT,
    "kilitlendi" BOOLEAN NOT NULL DEFAULT false,
    "kayit_tarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ismail_degerlendirme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kapanis_raporu" (
    "id" TEXT NOT NULL,
    "servis_id" TEXT NOT NULL,
    "unite_bilgileri" BOOLEAN NOT NULL DEFAULT false,
    "fotograf" BOOLEAN NOT NULL DEFAULT false,
    "tekne_konum" BOOLEAN NOT NULL DEFAULT false,
    "sarf_malzeme" BOOLEAN NOT NULL DEFAULT false,
    "adam_saat" BOOLEAN NOT NULL DEFAULT false,
    "taseron_bilgisi" BOOLEAN NOT NULL DEFAULT false,
    "stok_malzeme" BOOLEAN NOT NULL DEFAULT false,
    "aciklama" TEXT NOT NULL,
    "raporlayan_personel" TEXT NOT NULL,
    "rapor_tarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "adam_saat_uygulanmaz_puan_disi" BOOLEAN NOT NULL DEFAULT false,
    "saati_olmayan_unite_puan_disi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "kapanis_raporu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."katsayi_gecmisi" (
    "id" TEXT NOT NULL,
    "isTuru" "public"."IsTuru" NOT NULL,
    "eski_carpan" DOUBLE PRECISION NOT NULL,
    "yeni_carpan" DOUBLE PRECISION NOT NULL,
    "degistiren_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "katsayi_gecmisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_entitlements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."parca_bekleme" (
    "id" TEXT NOT NULL,
    "servis_id" TEXT NOT NULL,
    "parca_adi" TEXT NOT NULL,
    "miktar" INTEGER NOT NULL,
    "birim" TEXT,
    "tedarikci" TEXT,
    "beklenen_tarih" TIMESTAMP(3),
    "aciklama" TEXT,
    "tamamlandi" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parca_bekleme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."personel" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "unvan" "public"."PersonelUnvan" NOT NULL DEFAULT 'CIRAK',
    "rol" TEXT NOT NULL DEFAULT 'teknisyen',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "giris_yili" INTEGER,
    "telefon" TEXT,
    "email" TEXT,
    "adres" TEXT,
    "aciklama" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "personel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."puanlama_soru" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL,
    "kategori" "public"."SoruKategorisi" NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "agirlik" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "rapor_kontrol_mu" BOOLEAN NOT NULL DEFAULT false,
    "is_turu_filter" "public"."IsTuru",
    "zorunlu_mu" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puanlama_soru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rozet_kriteri" (
    "id" TEXT NOT NULL,
    "rozet" "public"."Rozet" NOT NULL,
    "siralama" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rozet_kriteri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_personel" (
    "id" TEXT NOT NULL,
    "servis_id" TEXT NOT NULL,
    "personel_id" TEXT NOT NULL,
    "rol" "public"."PersonelRol" NOT NULL DEFAULT 'SORUMLU',
    "bonus" BOOLEAN NOT NULL DEFAULT false,
    "atama_tarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_personel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."servis" (
    "id" TEXT NOT NULL,
    "tarih" DATE,
    "saat" TEXT,
    "is_turu" "public"."IsTuru" NOT NULL DEFAULT 'PAKET',
    "tekne_id" TEXT NOT NULL,
    "tekne_adi" TEXT NOT NULL,
    "adres" TEXT NOT NULL,
    "yer" TEXT NOT NULL,
    "servis_aciklamasi" TEXT NOT NULL,
    "irtibat_kisi" TEXT,
    "telefon" TEXT,
    "durum" "public"."ServisDurumu" NOT NULL DEFAULT 'RANDEVU_VERILDI',
    "ofisyetkili_id" TEXT,
    "taseron_notlari" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "tamamlanma_at" TIMESTAMP(3),
    "zorluk_seviyesi" "public"."ZorlukSeviyesi",
    "tahmini_bitis_tarihi" DATE,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "servis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."servis_puan" (
    "id" TEXT NOT NULL,
    "servis_id" TEXT NOT NULL,
    "personel_id" TEXT NOT NULL,
    "personel_ad" TEXT NOT NULL,
    "rol" "public"."PersonelRol" NOT NULL DEFAULT 'SORUMLU',
    "is_turu" "public"."IsTuru" NOT NULL,
    "seri_no_var" BOOLEAN NOT NULL DEFAULT false,
    "fotograf_var" BOOLEAN NOT NULL DEFAULT false,
    "aciklama_var" BOOLEAN NOT NULL DEFAULT false,
    "saat_var" BOOLEAN NOT NULL DEFAULT false,
    "rapor_basarisi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ham_puan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zorluk_carpani" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "final_puan" DOUBLE PRECISION NOT NULL,
    "bonus" BOOLEAN NOT NULL DEFAULT false,
    "notlar" TEXT,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saved_multiplier_id" TEXT,

    CONSTRAINT "servis_puan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settings" (
    "id" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "deger" TEXT NOT NULL,
    "aciklama" TEXT,
    "kategori" TEXT,
    "guncelleyen" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sync_log" (
    "id" TEXT NOT NULL,
    "sheet_name" TEXT NOT NULL,
    "sync_type" TEXT NOT NULL DEFAULT 'INCREMENTAL',
    "status" TEXT NOT NULL,
    "records_created" INTEGER NOT NULL DEFAULT 0,
    "records_updated" INTEGER NOT NULL DEFAULT 0,
    "records_deleted" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "errors" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tekne" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "seri_no" TEXT,
    "marka" TEXT,
    "model" TEXT,
    "boyut" DOUBLE PRECISION,
    "motor_tipi" TEXT,
    "motor_seri_no" TEXT,
    "yil" INTEGER,
    "renk" TEXT,
    "mulkiyet" TEXT,
    "adres" TEXT,
    "telefon" TEXT,
    "email" TEXT,
    "aciklama" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "tekne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'YETKILI',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "whitelisted_yetkili" BOOLEAN DEFAULT false,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."yetkili_degerlendirme_cirak" (
    "id" TEXT NOT NULL,
    "personnel_id" TEXT NOT NULL,
    "personnel_ad" TEXT NOT NULL,
    "ay" TEXT NOT NULL,
    "yetkili_id" TEXT NOT NULL,
    "uniforma_ve_isg" INTEGER,
    "ekip_ici_davranis" INTEGER,
    "destek_kalitesi" INTEGER,
    "ogrenme_gelisim" INTEGER,
    "toplam_puan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notlar" TEXT,
    "kilitlendi" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yetkili_degerlendirme_cirak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."yetkili_degerlendirme_usta" (
    "id" TEXT NOT NULL,
    "personnel_id" TEXT NOT NULL,
    "personnel_ad" TEXT NOT NULL,
    "ay" TEXT NOT NULL,
    "yetkili_id" TEXT NOT NULL,
    "uniforma_ve_isg" INTEGER,
    "musteri_iletisimi" INTEGER,
    "planlama_koordinasyon" INTEGER,
    "teknik_tespit" INTEGER,
    "rapor_dokumantasyon" INTEGER,
    "genel_liderlik" INTEGER,
    "toplam_puan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notlar" TEXT,
    "kilitlendi" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yetkili_degerlendirme_usta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."zorluk_katsayi" (
    "id" TEXT NOT NULL,
    "isTuru" "public"."IsTuru" NOT NULL,
    "label" TEXT NOT NULL,
    "carpan" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "gecerli_tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zorluk_katsayi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "public"."audit_log"("created_at" ASC);

-- CreateIndex
CREATE INDEX "audit_log_entity_tipi_entity_id_idx" ON "public"."audit_log"("entity_tipi" ASC, "entity_id" ASC);

-- CreateIndex
CREATE INDEX "audit_log_islem_turu_idx" ON "public"."audit_log"("islem_turu" ASC);

-- CreateIndex
CREATE INDEX "audit_log_organization_id_idx" ON "public"."audit_log"("organization_id" ASC);

-- CreateIndex
CREATE INDEX "audit_log_user_id_idx" ON "public"."audit_log"("user_id" ASC);

-- CreateIndex
CREATE INDEX "aylik_performans_ay_idx" ON "public"."aylik_performans"("ay" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "aylik_performans_personnel_id_ay_key" ON "public"."aylik_performans"("personnel_id" ASC, "ay" ASC);

-- CreateIndex
CREATE INDEX "aylik_performans_rozet_idx" ON "public"."aylik_performans"("rozet" ASC);

-- CreateIndex
CREATE INDEX "ismail_degerlendirme_ay_idx" ON "public"."ismail_degerlendirme"("ay" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ismail_degerlendirme_personnel_id_ay_key" ON "public"."ismail_degerlendirme"("personnel_id" ASC, "ay" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "kapanis_raporu_servis_id_key" ON "public"."kapanis_raporu"("servis_id" ASC);

-- CreateIndex
CREATE INDEX "katsayi_gecmisi_isTuru_idx" ON "public"."katsayi_gecmisi"("isTuru" ASC);

-- CreateIndex
CREATE INDEX "organization_entitlements_code_idx" ON "public"."organization_entitlements"("code" ASC);

-- CreateIndex
CREATE INDEX "organization_entitlements_enabled_idx" ON "public"."organization_entitlements"("enabled" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "organization_entitlements_organization_id_code_key" ON "public"."organization_entitlements"("organization_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "organization_entitlements_organization_id_idx" ON "public"."organization_entitlements"("organization_id" ASC);

-- CreateIndex
CREATE INDEX "organizations_aktif_idx" ON "public"."organizations"("aktif" ASC);

-- CreateIndex
CREATE INDEX "parca_bekleme_servis_id_idx" ON "public"."parca_bekleme"("servis_id" ASC);

-- CreateIndex
CREATE INDEX "parca_bekleme_tamamlandi_idx" ON "public"."parca_bekleme"("tamamlandi" ASC);

-- CreateIndex
CREATE INDEX "personel_aktif_idx" ON "public"."personel"("aktif" ASC);

-- CreateIndex
CREATE INDEX "personel_organization_id_idx" ON "public"."personel"("organization_id" ASC);

-- CreateIndex
CREATE INDEX "personel_unvan_idx" ON "public"."personel"("unvan" ASC);

-- CreateIndex
CREATE INDEX "puanlama_soru_kategori_aktif_idx" ON "public"."puanlama_soru"("kategori" ASC, "aktif" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "puanlama_soru_key_key" ON "public"."puanlama_soru"("key" ASC);

-- CreateIndex
CREATE INDEX "puanlama_soru_rapor_kontrol_mu_aktif_idx" ON "public"."puanlama_soru"("rapor_kontrol_mu" ASC, "aktif" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rozet_kriteri_rozet_key" ON "public"."rozet_kriteri"("rozet" ASC);

-- CreateIndex
CREATE INDEX "service_personel_personel_id_idx" ON "public"."service_personel"("personel_id" ASC);

-- CreateIndex
CREATE INDEX "service_personel_servis_id_idx" ON "public"."service_personel"("servis_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "service_personel_servis_id_personel_id_key" ON "public"."service_personel"("servis_id" ASC, "personel_id" ASC);

-- CreateIndex
CREATE INDEX "servis_deleted_at_tarih_idx" ON "public"."servis"("deleted_at" ASC, "tarih" ASC);

-- CreateIndex
CREATE INDEX "servis_durum_deleted_at_idx" ON "public"."servis"("durum" ASC, "deleted_at" ASC);

-- CreateIndex
CREATE INDEX "servis_durum_idx" ON "public"."servis"("durum" ASC);

-- CreateIndex
CREATE INDEX "servis_is_turu_idx" ON "public"."servis"("is_turu" ASC);

-- CreateIndex
CREATE INDEX "servis_ofisyetkili_id_idx" ON "public"."servis"("ofisyetkili_id" ASC);

-- CreateIndex
CREATE INDEX "servis_organization_id_durum_idx" ON "public"."servis"("organization_id" ASC, "durum" ASC);

-- CreateIndex
CREATE INDEX "servis_organization_id_idx" ON "public"."servis"("organization_id" ASC);

-- CreateIndex
CREATE INDEX "servis_organization_id_tarih_idx" ON "public"."servis"("organization_id" ASC, "tarih" ASC);

-- CreateIndex
CREATE INDEX "servis_organization_id_tekne_id_idx" ON "public"."servis"("organization_id" ASC, "tekne_id" ASC);

-- CreateIndex
CREATE INDEX "servis_tarih_idx" ON "public"."servis"("tarih" ASC);

-- CreateIndex
CREATE INDEX "servis_tekne_id_idx" ON "public"."servis"("tekne_id" ASC);

-- CreateIndex
CREATE INDEX "servis_yer_idx" ON "public"."servis"("yer" ASC);

-- CreateIndex
CREATE INDEX "servis_puan_personel_id_idx" ON "public"."servis_puan"("personel_id" ASC);

-- CreateIndex
CREATE INDEX "servis_puan_servis_id_idx" ON "public"."servis_puan"("servis_id" ASC);

-- CreateIndex
CREATE INDEX "servis_puan_tarih_idx" ON "public"."servis_puan"("tarih" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "settings_organization_id_anahtar_key" ON "public"."settings"("organization_id" ASC, "anahtar" ASC);

-- CreateIndex
CREATE INDEX "settings_organization_id_idx" ON "public"."settings"("organization_id" ASC);

-- CreateIndex
CREATE INDEX "settings_organization_id_kategori_idx" ON "public"."settings"("organization_id" ASC, "kategori" ASC);

-- CreateIndex
CREATE INDEX "sync_log_created_at_idx" ON "public"."sync_log"("created_at" ASC);

-- CreateIndex
CREATE INDEX "sync_log_sheet_name_idx" ON "public"."sync_log"("sheet_name" ASC);

-- CreateIndex
CREATE INDEX "sync_log_status_idx" ON "public"."sync_log"("status" ASC);

-- CreateIndex
CREATE INDEX "tekne_aktif_idx" ON "public"."tekne"("aktif" ASC);

-- CreateIndex
CREATE INDEX "tekne_marka_idx" ON "public"."tekne"("marka" ASC);

-- CreateIndex
CREATE INDEX "tekne_organization_id_idx" ON "public"."tekne"("organization_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "tekne_organization_id_seri_no_key" ON "public"."tekne"("organization_id" ASC, "seri_no" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "public"."users"("organization_id" ASC);

-- CreateIndex
CREATE INDEX "yetkili_degerlendirme_cirak_ay_idx" ON "public"."yetkili_degerlendirme_cirak"("ay" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "yetkili_degerlendirme_cirak_personnel_id_ay_key" ON "public"."yetkili_degerlendirme_cirak"("personnel_id" ASC, "ay" ASC);

-- CreateIndex
CREATE INDEX "yetkili_degerlendirme_usta_ay_idx" ON "public"."yetkili_degerlendirme_usta"("ay" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "yetkili_degerlendirme_usta_personnel_id_ay_key" ON "public"."yetkili_degerlendirme_usta"("personnel_id" ASC, "ay" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "zorluk_katsayi_isTuru_key" ON "public"."zorluk_katsayi"("isTuru" ASC);

-- AddForeignKey
ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."aylik_performans" ADD CONSTRAINT "aylik_performans_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "public"."personel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ismail_degerlendirme" ADD CONSTRAINT "ismail_degerlendirme_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "public"."personel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kapanis_raporu" ADD CONSTRAINT "kapanis_raporu_servis_id_fkey" FOREIGN KEY ("servis_id") REFERENCES "public"."servis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_entitlements" ADD CONSTRAINT "organization_entitlements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."parca_bekleme" ADD CONSTRAINT "parca_bekleme_servis_id_fkey" FOREIGN KEY ("servis_id") REFERENCES "public"."servis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."personel" ADD CONSTRAINT "personel_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_personel" ADD CONSTRAINT "service_personel_personel_id_fkey" FOREIGN KEY ("personel_id") REFERENCES "public"."personel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_personel" ADD CONSTRAINT "service_personel_servis_id_fkey" FOREIGN KEY ("servis_id") REFERENCES "public"."servis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."servis" ADD CONSTRAINT "servis_ofisyetkili_id_fkey" FOREIGN KEY ("ofisyetkili_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."servis" ADD CONSTRAINT "servis_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."servis" ADD CONSTRAINT "servis_tekne_id_fkey" FOREIGN KEY ("tekne_id") REFERENCES "public"."tekne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."servis_puan" ADD CONSTRAINT "servis_puan_personel_id_fkey" FOREIGN KEY ("personel_id") REFERENCES "public"."personel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."servis_puan" ADD CONSTRAINT "servis_puan_servis_id_fkey" FOREIGN KEY ("servis_id") REFERENCES "public"."servis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."settings" ADD CONSTRAINT "settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tekne" ADD CONSTRAINT "tekne_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."yetkili_degerlendirme_cirak" ADD CONSTRAINT "yetkili_degerlendirme_cirak_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "public"."personel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."yetkili_degerlendirme_cirak" ADD CONSTRAINT "yetkili_degerlendirme_cirak_yetkili_id_fkey" FOREIGN KEY ("yetkili_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."yetkili_degerlendirme_usta" ADD CONSTRAINT "yetkili_degerlendirme_usta_personnel_id_fkey" FOREIGN KEY ("personnel_id") REFERENCES "public"."personel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."yetkili_degerlendirme_usta" ADD CONSTRAINT "yetkili_degerlendirme_usta_yetkili_id_fkey" FOREIGN KEY ("yetkili_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
