# -*- coding: utf-8 -*-
"""
Menambahkan tombol menu "Foto" di sebelah "Prestasi" pada halaman menu utama saja:
index, struktur, wali-kelas, siswa, prestasi (+ kartu menu di beranda).
Halaman profil siswa (folder siswa/) TIDAK disentuh.
Kalau sebelumnya skrip versi lama sudah menambahkan "Foto" ke folder siswa/,
skrip ini otomatis menghapusnya lagi (hanya baris menu Foto itu).
Aman dijalankan berulang kali. Jalankan:  python tambah_menu_foto.py
"""
import glob, re

HALAMAN = ["index.html", "struktur.html", "wali-kelas.html", "siswa.html", "prestasi.html"]

NAV = re.compile(r'(<a href="prestasi\.html"(?: aria-current="page")?>Prestasi</a>)(?!\s*<a href="foto\.html")')
KARTU = re.compile(r'(<a href="prestasi\.html"><strong>Prestasi</strong><span>[^<]*</span></a>)(?!\s*<a href="foto\.html")')
SISA_DI_SISWA = re.compile(r'\n<a href="\.\./foto\.html">Foto</a>')

for path in HALAMAN:
    try:
        teks = open(path, encoding="utf-8").read()
    except FileNotFoundError:
        print("tidak ditemukan, dilewati:", path)
        continue
    baru = NAV.sub(lambda m: f'{m.group(1)}\n<a href="foto.html">Foto</a>', teks)
    if path == "index.html":
        baru = KARTU.sub(lambda m: f'{m.group(1)}\n      <a href="foto.html"><strong>Foto</strong><span></span></a>', baru)
    if baru != teks:
        open(path, "w", encoding="utf-8").write(baru)
        print("ditambah menu Foto:", path)

for path in glob.glob("siswa/*.html"):
    teks = open(path, encoding="utf-8").read()
    baru = SISA_DI_SISWA.sub("", teks)
    if baru != teks:
        open(path, "w", encoding="utf-8").write(baru)
        print("dibersihkan:", path)

print("Selesai.")
