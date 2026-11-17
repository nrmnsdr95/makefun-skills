# Lumen Tow

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)

A storm has scattered the coast’s lights. Pilot a small salvage skiff, tow lanterns back to Safe Harbor, and relight the coast across three tides. The controls are quick, but the towline has weight: wider turns protect your cargo, and a full three-lantern tow earns a combo.

## Run it

Open `game/index.html` in desktop Chrome or Chromium. It works directly from disk and needs no network or installation. If you prefer a local static server, run `python3 -m http.server 8080 --directory game`, then visit `http://localhost:8080`.

| Input | Action |
| --- | --- |
| WASD / arrow keys | Steer. Release the keys to coast to a stop. |
| Click a lantern in the dotted ring / Space | Hook the selected / nearest lantern. Up to three at once. |
| Shift | Boost; the gauge shows the recharge. |
| X / right click | Release the last lantern if it snags. |
| Esc / P | Pause or resume. |
| M | Mute or unmute. |

Stay in the green harbor ring to unload. Pink lanterns count double. The time remaining and hull condition earn bonuses at the end of each tide. You win by meeting the light quota on all three tides; an empty hull or an expired tide ends the voyage. Select **Calm waters** in the Field Guide for more time and gentler weather.

## Entry files

- `game/` is the finished browser game. `chart.js` holds the three hand-laid routes, `voyage.js` simulates the boat and towline, `chart-art.js` and `deck.js` render them, `sound.js` synthesizes the audio, and `bridge.js` handles controls and screens.
- `screenshots/` holds four unedited 1280×480 JPEG captures from a real Chromium playthrough, in cover / gameplay / storm / victory order.
- `main.ts` writes `game/`, `screenshots/`, and `dossier.json` to the grader’s `/output`. It uses only Node’s standard library and the unchanged kit library at `vendor/makefun-game.ts` (SHA-256 `dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129`, as listed in the [kit manifest](https://make.fun/api/competitions/best-game-01/kit)).

### Cek lokal (Node.js 22.18 atau lebih baru)

Jalankan dari root proyek. Gunakan folder output yang masih kosong.

```sh
out=$(mktemp -d)
MAKEFUN_OUTPUT_DIR="$out" node main.ts
ls -l "$out"
```

Tidak perlu menjalankan `npm install` untuk memainkan game atau membuat dossier. Di PowerShell, gunakan `$env:MAKEFUN_OUTPUT_DIR = "out"; node main.ts` (pastikan `out` masih kosong).

Di checkout pengembangan, `node --test tests/voyage.test.cjs` menguji fisika towline, boost, skor, damage, dan timeout. `tests/browser-voyage.cjs` memainkan game hingga menang lewat keyboard dan mouse; untuk menjalankannya sendiri, sediakan `puppeteer-core` dan arahkan `CHROME_PATH` ke executable Chrome. Set `LUMEN_CAPTURE=1` hanya jika ingin mengganti screenshot dengan hasil playthrough tersebut.

## Submit manual ke make.fun

**Cek transkrip dulu.** Bounty mewajibkan rekaman sesi yang benar-benar membangun game. ZIP ini hanya berisi file game dan tidak menyertakan log asli Arena. Kalau kamu bisa mengekspor log asli dari Arena, gunakan itu tanpa mengubahnya. Jangan menebak model, timestamp, atau pemakaian token. Jika tidak bisa memperoleh rekaman asli, [opsi resmi *Handed over*](https://make.fun/skill.md) memakai bagian sesi yang benar-benar terlihat, tetap diperiksa, dan **tidak bisa mendapat hadiah berbayar** di bounty ini. Tanpa transkrip sama sekali, entri ditolak.

### 1. Upload isi ZIP ke GitHub

Ekstrak ZIP, lalu buat [repo GitHub Public](https://github.com/new) milikmu, misalnya `lumen-tow`. Bounty dibuka **15 November 2026, 18.00 UTC**; repo harus dibuat pada atau setelah waktu itu. Pada repo kosong, buka **uploading an existing file** (atau **Add file → Upload files** pada repo yang sudah ada). Upload **isi di dalam** folder `lumen-tow/` dengan struktur ini, bukan ZIP atau folder induknya:

```text
README.md
LICENSE
main.ts
game/
screenshots/
vendor/makefun-game.ts
```

ZIP ini bukan Git source bundle `.bundle`. Jangan upload transkrip, file `out/`, atau kredensial ke repo publik.

### 2. Pasang badge dan atur About sebelum submit

Edit `README.md`. Ganti baris badge yang sudah ada dengan tiga baris di bawah, **tanpa pembungkus code block**. Ganti `USERNAME` dengan pemilik repo dan `lumen-tow` jika nama repo berbeda.

```md
[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/USERNAME/lumen-tow/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/USERNAME/lumen-tow/reward.svg)](https://make.fun/bounty/best-game-01)
```

Klik ikon ⚙ di **About** repo, isi **Website** `https://make.fun/bounty/best-game-01`, dan tambahkan **Topics** `makefun`, `ai-agents`, `bounties`, `games`. Website dan topik `makefun` wajib. Deskripsi yang disarankan: `An offline lantern salvage game. Built by an AI agent for make.fun’s “Make the best game” bounty, $1,000 in USDC.`

Pemilik repo harus cocok dengan login GitHub pada akun make.fun. Jika repo milikmu tetapi GitHub tidak tertaut, alternatifnya buat `.makefun/owner.json` berisi `{"wallet":"ALAMAT_PUBLIK_SOLANA"}` dengan **alamat publik** wallet yang tertaut di make.fun, bukan private key. Commit semua perubahan, lalu salin **SHA lengkap 40 karakter** dari halaman commit terakhir yang akan dikirim.

### 3. Buat dan cek bundle transkrip

Gunakan Node.js 22.18 atau lebih baru dan [kit resmi](https://make.fun/c/best-game-01/kit). Contoh ini dijalankan dari dalam kit yang sudah diekstrak, dengan `lumen-tow/` (hasil clone repo GitHub yang akan dikirim) dan `log-asli.jsonl` (log asli, jika tersedia) di folder induknya. Sesuaikan jalan dan nama file; tambahkan `--session` untuk setiap sesi build yang asli.

```sh
node cli/makefun.mjs bundle --repo ../lumen-tow --session ../log-asli.jsonl --dry-run
node cli/makefun.mjs bundle --repo ../lumen-tow --session ../log-asli.jsonl --out ../transcripts.tar.gz
node cli/makefun.mjs check --kit . --repo ../lumen-tow --transcripts ../transcripts.tar.gz
```

Jika CLI meminta metadata untuk *run record*, isi sesuai run asli dan [panduan resmi](https://make.fun/skill.md), bukan tebakan. Kalau system prompt tidak boleh dibagikan, panduan menyediakan cara menandainya *withheld*. Jika tidak ada log yang bisa dipakai, langkah ini tidak otomatis membuatnya.

### 4. Kirim lewat browser

Masuk ke akun make.fun milikmu (`@norma-sudira` untuk proyek ini). Pastikan wallet Solana milikmu tertaut di [profil](https://make.fun/profile): bounty ini memakai escrow dan memerlukan tanda tangan wallet. Tidak perlu `makefun login` atau pairing agent untuk cara ini.

Buka [Submit an entry](https://make.fun/bounty/best-game-01#submit), isi judul `Lumen Tow`, **URL repo publik**, dan **SHA commit 40 karakter**. Unggah `transcripts.tar.gz` pada bagian transkrip, tanda tangani permintaan entri di wallet, lalu submit. `dossier.json` tidak diunggah terpisah: grader membuatnya dari `main.ts`. Simpan bukti penerimaan dan cek status sampai lolos pemeriksaan; *Submitted* belum berarti *Checked*.

Deadline yang tercantum pada bounty: **18 November 2026, 18.00 UTC / 19 November 2026, 01.00 WIB**. Entri terbaru sebelum deadline yang dihitung untuk final.

## Credits

Original game code, procedural map art, skiff and lantern graphics, and synthesized sound. The main-menu illustration was generated for Lumen Tow. Space Grotesk, Barlow Condensed, and IBM Plex Mono are bundled locally under their respective SIL Open Font Licenses (`game/media/*-OFL.txt`). The make.fun library is distributed with the competition kit and is not modified here.
