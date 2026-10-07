# -*- coding: utf-8 -*-
"""
Pembuat web kenangan kelas XII TJKT 1 - SMKN 1 Pekanbaru
Edit bagian DATA di bawah, lalu jalankan:  python buat_web.py
Semua file .html akan dibuat ulang otomatis.
"""
import os, html

# =====================  DATA  (EDIT DI SINI)  =====================

NAMA_KELAS = "XII TJKT 1"
NAMA_SEKOLAH = "SMKN 1 Pekanbaru"
TAHUN = "2025/2026"
JUDUL_BERANDA = "Kenangan Kelas"
SLOGAN = "34 siswa, satu kelas, satu cerita."

# --- 34 siswa: (nama, quotes, [paragraf pesan], (judul lagu, artis, file mp3), username instagram) ---
# Foto otomatis dicari di foto/siswa/01.jpg, 02.jpg, ... 34.jpg
# File lagu ditaruh di folder musik/ (misal musik/01.mp3). Kosongkan judul lagu ("") untuk menyembunyikan bagian lagu.
# Username Instagram tanpa @. Kosongkan ("") untuk menyembunyikan bagian Instagram.
SISWA = []
for i in range(1, 35):
    SISWA.append((
        f"Nama Siswa {i}",
        "Tulis quotes favoritmu di sini.",
        ["Tulis pesan untuk teman-teman sekelas di sini. Boleh lebih dari satu paragraf."],
        ("Judul Lagu", "Nama Artis", f"{i:02d}.mp3"),
        "isi_username",
    ))
# Contoh mengganti data siswa nomor 1 (hapus tanda # untuk memakai):
# SISWA[0] = ("Ahmad Fauzi", "Gagal itu biasa, menyerah yang tidak boleh.",
#             ["Terima kasih sudah jadi teman satu kelas.", "Sukses terus untuk kita semua!"],
#             ("Judul Lagu", "Nama Artis", "01.mp3"), "ahmadfauzi")

# --- Wali kelas ---
# Foto: foto/wali-kelas.jpg
WALI = {
    "nama": "Nama Wali Kelas, S.Pd.",
    "mapel": "Wali Kelas XII TJKT 1",
    "quotes": "Tulis quotes wali kelas di sini.",
    "pesan": ["Tulis pesan wali kelas untuk murid-murid di sini."],
}

# --- Struktur kelas: (jabatan, nomor_siswa atau None) ---
# nomor_siswa = nomor urut di daftar SISWA (1-34). Nama otomatis bisa diklik ke profilnya.
STRUKTUR = [
    ("Ketua Kelas", 1),
    ("Wakil Ketua", 2),
    ("Sekretaris 1", 3),
    ("Sekretaris 2", 4),
    ("Bendahara 1", 5),
    ("Bendahara 2", 6),
    ("Seksi Kebersihan", 7),
    ("Seksi Keamanan", 8),
]

# --- Prestasi: nama, keterangan, foto (di folder foto/prestasi/), [nomor siswa pemenang] ---
PRESTASI = [
    ("Juara 1 Classmeet Mini Soccer", "Classmeet SMKN 1 Pekanbaru", "mini-soccer.jpg", [1, 2, 3, 4, 5, 6, 7]),
    ("Juara 2 Lomba Contoh", "Tulis keterangan lomba di sini", "lomba-contoh.jpg", [8, 9]),
]

# ===================  AKHIR BAGIAN DATA  ===================


def e(t):
    return html.escape(t, quote=True)


def inisial(nama):
    kata = [k for k in nama.split() if k]
    return (kata[0][0] + (kata[1][0] if len(kata) > 1 else "")).upper() if kata else "?"


def file_siswa(n):
    return f"siswa-{n:02d}.html"


def nav(root, aktif):
    item = [
        ("beranda", "Beranda", "index.html"),
        ("struktur", 'Struktur<span class="panjang"> Kelas</span>', "struktur.html"),
        ("wali", 'Wali<span class="panjang"> Kelas</span>', "wali-kelas.html"),
        ("siswa", "Siswa", "siswa.html"),
        ("prestasi", "Prestasi", "prestasi.html"),
        ("foto", "Foto", "foto.html"),
    ]
    out = []
    for k, label, f in item:
        if k == "foto" and root:   # profil siswa (root "../") tidak diberi menu Foto
            continue
        cls = ' aria-current="page"' if k == aktif else ""
        out.append(f'<a href="{root}{f}"{cls}>{label}</a>')
    return "\n".join(out)


def halaman(judul, isi, root="", aktif="", body_class=""):
    return f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(judul)} | {NAMA_KELAS} {NAMA_SEKOLAH}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}css/style.css">
</head>
<body class="{body_class}">
<header class="topbar">
  <a class="brand" href="{root}index.html">{NAMA_KELAS}</a>
  <nav>
{nav(root, aktif)}
  </nav>
</header>
{isi}
<footer class="footer">
  <p>{NAMA_KELAS} &middot; {NAMA_SEKOLAH} &middot; {TAHUN}</p>
</footer>
</body>
</html>
"""


def foto_html(src, nama, kelas="foto"):
    # Jika file foto belum ada, tampil inisial nama sebagai pengganti
    return (f'<div class="{kelas}"><span>{e(inisial(nama))}</span>'
            f'<img src="{src}" alt="Foto {e(nama)}" loading="lazy" onerror="this.remove()"></div>')


def tulis(path, isi):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(isi)


def paragraf(daftar):
    return "\n".join(f"<p>{e(p)}</p>" for p in daftar)


# ---------- prestasi per siswa ----------
prestasi_siswa = {}
for nama_p, _, _, pemenang in PRESTASI:
    for n in pemenang:
        prestasi_siswa.setdefault(n, []).append(nama_p)

# ---------- BERANDA ----------
beranda = f"""
<main class="hero">
  <div class="hero-isi">
    <p class="hero-kecil">{NAMA_SEKOLAH} &middot; {TAHUN}</p>
    <h1>{e(JUDUL_BERANDA)} {NAMA_KELAS}</h1>
    <p class="hero-slogan">{e(SLOGAN)}</p>
    <nav class="menu-besar" aria-label="Menu utama">
      <a href="struktur.html"><strong>Struktur Kelas</strong><span>Siapa mengurus apa</span></a>
      <a href="wali-kelas.html"><strong>Wali Kelas</strong><span>Pesan dari bapak/ibu</span></a>
      <a href="siswa.html"><strong>Siswa</strong><span>{len(SISWA)} profil teman</span></a>
      <a href="prestasi.html"><strong>Prestasi</strong><span>Lomba dan classmeet</span></a>
      <a href="foto.html"><strong>Foto</strong><span>Lihat dan upload foto</span></a>
    </nav>
  </div>
</main>
"""
tulis("index.html", halaman("Beranda", beranda, "", "beranda", "beranda"))

# ---------- STRUKTUR ----------
kartu = []
for jabatan, n in STRUKTUR:
    if n:
        nama = SISWA[n - 1][0]
        kartu.append(f"""<li><a href="siswa/{file_siswa(n)}">
  {foto_html(f"foto/siswa/{n:02d}.jpg", nama, "foto kecil")}
  <div><span class="jabatan">{e(jabatan)}</span><strong>{e(nama)}</strong></div></a></li>""")
    else:
        kartu.append(f'<li><div class="kosong"><span class="jabatan">{e(jabatan)}</span><strong>-</strong></div></li>')

struktur = f"""
<main class="isi">
  <h1>Struktur Kelas</h1>
  <p class="lead">Pengurus kelas {NAMA_KELAS}. Klik nama untuk melihat profilnya.</p>
  <div class="wali-ringkas">
    <a href="wali-kelas.html">
      {foto_html("foto/wali-kelas.jpg", WALI["nama"], "foto kecil")}
      <div><span class="jabatan">Wali Kelas</span><strong>{e(WALI["nama"])}</strong></div>
    </a>
  </div>
  <ul class="daftar-struktur">
{chr(10).join(kartu)}
  </ul>
</main>
"""
tulis("struktur.html", halaman("Struktur Kelas", struktur, "", "struktur"))

# ---------- WALI KELAS ----------
wali = f"""
<main class="profil">
  <article>
    {foto_html("foto/wali-kelas.jpg", WALI["nama"], "foto besar")}
    <div class="profil-teks">
      <p class="jabatan">{e(WALI["mapel"])}</p>
      <h1>{e(WALI["nama"])}</h1>
      <blockquote>{e(WALI["quotes"])}</blockquote>
      <h2>Pesan untuk murid-murid</h2>
      {paragraf(WALI["pesan"])}
    </div>
  </article>
</main>
"""
tulis("wali-kelas.html", halaman("Wali Kelas", wali, "", "wali"))

# ---------- DAFTAR SISWA ----------
kartu = []
for i, (nama, *_) in enumerate(SISWA, 1):
    kartu.append(f"""<li><a href="siswa/{file_siswa(i)}">
  {foto_html(f"foto/siswa/{i:02d}.jpg", nama, "foto grid")}
  <strong>{e(nama)}</strong></a></li>""")

siswa = f"""
<main class="isi">
  <h1>Siswa</h1>
  <p class="lead">{len(SISWA)} teman sekelas. Klik foto untuk membaca quotes dan pesannya.</p>
  <ul class="grid-siswa">
{chr(10).join(kartu)}
  </ul>
</main>
"""
tulis("siswa.html", halaman("Siswa", siswa, "", "siswa"))

# ---------- HALAMAN TIAP SISWA ----------
total = len(SISWA)
for i, (nama, quotes, pesan, lagu, ig) in enumerate(SISWA, 1):
    sebelum = f'<a class="pindah" href="{file_siswa(i-1)}">&larr; {e(SISWA[i-2][0])}</a>' if i > 1 else "<span></span>"
    sesudah = f'<a class="pindah kanan" href="{file_siswa(i+1)}">{e(SISWA[i][0])} &rarr;</a>' if i < total else "<span></span>"
    pr = ""
    if i in prestasi_siswa:
        li = "".join(f"<li><a href=\"../prestasi.html\">{e(p)}</a></li>" for p in prestasi_siswa[i])
        pr = f'<h2>Prestasi</h2><ul class="tag-prestasi">{li}</ul>'
    lagu_html = ""
    if lagu and lagu[0]:
        judul_l, artis_l, file_l = lagu
        lagu_html = f"""<section class="lagu">
        <h2>Lagu favorit</h2>
        <div class="pemutar">
          <div class="piringan" aria-hidden="true">&#9835;</div>
          <div class="pemutar-isi">
            <strong>{e(judul_l)}</strong>
            <span>{e(artis_l)}</span>
            <audio controls preload="none" src="../musik/{e(file_l)}">Browser kamu tidak mendukung pemutar audio.</audio>
          </div>
        </div>
      </section>"""
    ig_html = ""
    if ig:
        ig_bersih = ig.lstrip("@").strip()
        ig_html = f"""<section class="sosmed">
        <h2>Sosial media</h2>
        <a class="ig" href="https://instagram.com/{e(ig_bersih)}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg>
          <span>@{e(ig_bersih)}</span>
        </a>
      </section>"""
    isi = f"""
<main class="profil">
  <article>
    {foto_html(f"../foto/siswa/{i:02d}.jpg", nama, "foto besar")}
    <div class="profil-teks">
      <p class="jabatan">Siswa {NAMA_KELAS} &middot; absen {i}</p>
      <h1>{e(nama)}</h1>
      <blockquote>{e(quotes)}</blockquote>
      <h2>Pesan untuk teman-teman</h2>
      {paragraf(pesan)}
      {lagu_html}
      {ig_html}
      {pr}
    </div>
  </article>
  <div class="pindah-baris">{sebelum}<a class="pindah tengah" href="../siswa.html">Semua siswa</a>{sesudah}</div>
</main>
"""
    tulis(f"siswa/{file_siswa(i)}", halaman(nama, isi, "../", "siswa"))

# ---------- PRESTASI ----------
blok = []
for nama_p, ket, foto_p, pemenang in PRESTASI:
    orang = "\n".join(
        f"""<li><a href="siswa/{file_siswa(n)}">
  {foto_html(f"foto/siswa/{n:02d}.jpg", SISWA[n-1][0], "foto kecil")}
  <span>{e(SISWA[n-1][0])}</span></a></li>""" for n in pemenang)
    blok.append(f"""<section class="prestasi">
  <h2>{e(nama_p)}</h2>
  <p class="ket">{e(ket)}</p>
  <div class="foto-prestasi"><span>Foto prestasi</span><img src="foto/prestasi/{e(foto_p)}" alt="{e(nama_p)}" loading="lazy" onerror="this.remove()"></div>
  <h3>Yang berhasil</h3>
  <ul class="pemenang">
{orang}
  </ul>
</section>""")

prestasi = f"""
<main class="isi">
  <h1>Prestasi</h1>
  <p class="lead">Lomba dan kegiatan yang kita menangkan bersama.</p>
{chr(10).join(blok)}
</main>
"""
tulis("prestasi.html", halaman("Prestasi", prestasi, "", "prestasi"))

# folder foto
for d in ("foto/siswa", "foto/prestasi", "musik", "css"):
    os.makedirs(d, exist_ok=True)

print("Selesai! Buka index.html di browser.")
