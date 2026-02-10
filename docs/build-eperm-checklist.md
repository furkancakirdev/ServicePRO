# Next.js Build EPERM Checklist (Windows)

Bu checklist, `npm run build` komutunda Windows ortaminda gorulen `spawn EPERM` hatasini izole etmek icin kullanilir.

## 1) Ortam dogrulamasi

- `node -v` ile surumu dogrula.
- Hedef surum: `18.20.x` veya `20.x LTS`.
- `npm -v` ve `where node` ciktilarini not et.

## 2) Temel izin kontrolu

- Terminali yonetici olarak acip tekrar dene.
- Proje klasorunde yazma izni oldugunu dogrula.
- Antiviruste proje klasoru icin exclusion dene.

## 3) Cache/derleme klasorleri

- `.next` klasorunu temizleyip tekrar build al.
- Kilitlenme devam ederse editor/terminal process kilitlerini kontrol et.

## 4) Asamali build denemesi

- `npm run typecheck`
- `npm run lint`
- `cross-env NEXT_DISABLE_ESLINT=1 next build`

Not: `cross-env` yoksa gecici olarak eklenebilir veya PowerShell uzerinden env degiskeni set edilerek denenebilir.

## 5) CI dogrulamasi

- Lokal Windows EPERM olsa bile Linux runner (CI) uzerinde `npm ci && npm run build` zorunlu kalite kapisi olmalidir.
- Merge/onay once CI build sonucu referans alinmalidir.
