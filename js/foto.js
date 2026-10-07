/* Menu Foto - XII TJKT 1
   Dipakai oleh foto.html (upload) dan foto-1/2/3.html (galeri). */

// ==================  PENGATURAN (EDIT DI SINI)  ==================
// Tiap album memakai project Supabase sendiri. Isi url dan key (anon/public) dari
// Supabase > Project Settings > API. JANGAN pernah memakai service_role key di sini.
const ALBUM_SUPABASE = {
  1: {
    url: 'https://zebcqneisaldzmfoqeoq.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplYmNxbmVpc2FsZHptZm9xZW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NjAzMDgsImV4cCI6MjEwNjUzNjMwOH0.SvjK-yYiXrHVz65m9nbFJsLnejky6k5XOIjnTq5QrAE',
    bucket: 'memori-fot',   // nama bucket di project ini (harus Public)
    tabel: 'memori',        // nama tabel di project ini
    adminSaja: true,        // true = hanya admin (login) yang bisa upload. Album lain: hapus baris ini / false
  },
  2: {
    url: 'https://obffgmulzqtxziopcbiq.supabase.co',        // contoh: https://abcdefgh.supabase.co
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZmZnbXVsenF0eHppb3BjYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjg4NTAsImV4cCI6MjEwNjYwNDg1MH0.GEMzcXAiDj6biPaX6CnXYIPVt96aGEpJc13czEja8sc',
    bucket: 'memori-fot',
    tabel: 'memori',
  },
  3: {
    url: 'https://akbgtueilsawqlvmwnvp.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYmd0dWVpbHNhd3Fsdm13bnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzODUzMDksImV4cCI6MjEwNjk2MTMwOX0.f7Tu_rBOE6MRPonf5TX6EijyN8FmBNsBjoWQJPOGvAY',
    bucket: 'memori-fot',
    tabel: 'memori',
  },
  4: {
    url: 'https://ryaeqvoarflmesspkmwd.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5YWVxdm9hcmZsbWVzc3BrbXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzODcwNTYsImV4cCI6MjEwNjk2MzA1Nn0.iuIjFnx5nFvVkrhhbvIlP6l4CWx_OcdvuVOE43ZoScw',
    bucket: 'memori-fot',
    tabel: 'memori',
  },
};
const NAMA_ALBUM = { 1: 'Family', 2: 'Random 1', 3: 'Random 2', 4: 'Random 3' };   // ganti nama album sesukamu (nama sebaiknya beda-beda)
const MAKS_SISI = 1600;             // foto dikecilkan otomatis agar upload dari HP cepat
const MAKS_FILE_MB = 15;            // batas ukuran file asli
const PER_HALAMAN = 50;             // jumlah foto yang dimuat sekali tampil
const MAKS_FOTO_SEKALI = 50;       // maksimal foto dalam satu kali upload
const UPLOAD_PARALEL = 3;           // jumlah foto yang diunggah bersamaan (naikkan kalau internet kencang)
// =================================================================

const klien = {};
// Mengembalikan koneksi Supabase milik album itu, atau null kalau belum diisi
function dbAlbum(n) {
  const cfg = ALBUM_SUPABASE[n];
  if (!cfg || !cfg.url || !cfg.key || cfg.url.startsWith('ISI_') || cfg.key.startsWith('ISI_')) return null;
  if (!klien[n]) klien[n] = window.supabase.createClient(cfg.url, cfg.key);
  return klien[n];
}
// Terjemahkan error Supabase yang membingungkan
function ramahkan(err) {
  const m = (err && err.message) || 'terjadi kesalahan';
  if (/row-level security|unauthorized|jwt|permission/i.test(m)) {
    return 'tidak diizinkan. Untuk album khusus admin, masuk sebagai admin dulu';
  }
  return m;
}
const pesanBelumTerhubung = (n) =>
  `Album ${NAMA_ALBUM[n]} belum dihubungkan ke project Supabase. Isi url dan key nomor ${n} di bagian atas js/foto.js.`;
const $ = (id) => document.getElementById(id);

/* ---------- HEIC (foto iPhone) dan kecilkan foto sebelum upload ---------- */
const adaHeic = (f) => /image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);

// Pustaka pengubah HEIC -> JPG dimuat hanya kalau memang ada foto HEIC
function muatSkrip(src) {
  return new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = src;
    sc.onload = res;
    sc.onerror = () => rej(new Error('Pengubah HEIC gagal dimuat, cek koneksi internet lalu coba lagi.'));
    document.head.appendChild(sc);
  });
}
let janjiHeic = null;
let janjiHeicTo = null;
function muatHeic() {
  if (window.heic2any) return Promise.resolve();
  if (!janjiHeic) janjiHeic = muatSkrip('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js').catch((e) => { janjiHeic = null; throw e; });
  return janjiHeic;
}
// Pustaka cadangan (pengurai HEIC lebih baru) untuk foto iPhone yang gagal dibaca heic2any
function muatHeicTo() {
  if (window.HeicTo) return Promise.resolve();
  if (!janjiHeicTo) janjiHeicTo = muatSkrip('https://cdn.jsdelivr.net/npm/heic-to@1/dist/iife/heic-to.js').catch((e) => { janjiHeicTo = null; throw e; });
  return janjiHeicTo;
}
async function heicKeJpg(file) {
  let galat1;
  try {
    await muatHeic();
    const keluar = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    return Array.isArray(keluar) ? keluar[0] : keluar;
  } catch (e) { galat1 = e; }
  try {
    await muatHeicTo();
    const fn = window.HeicTo && (window.HeicTo.heicTo || window.HeicTo);
    return await fn({ blob: file, type: 'image/jpeg', quality: 0.85 });
  } catch (e) { throw galat1 || e; }
}

// Kecilkan ke JPG (sisi terpanjang MAKS_SISI). Mengembalikan null kalau browser tidak bisa membaca fotonya.
async function ubahUkuran(sumber) {
  try {
    const bmp = await createImageBitmap(sumber, { imageOrientation: 'from-image' });
    const skala = Math.min(1, MAKS_SISI / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * skala);
    const h = Math.round(bmp.height * skala);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    bmp.close && bmp.close();
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (blob) return { blob, ext: 'jpg', type: 'image/jpeg' };
  } catch (_) { /* tidak bisa dibaca browser */ }
  return null;
}

async function kecilkan(file) {
  let hasil = await ubahUkuran(file);
  if (hasil) return hasil;

  // HEIC: Safari bisa membacanya langsung (jalur di atas), browser lain perlu diubah ke JPG dulu
  if (adaHeic(file)) {
    try {
      const jpg = await heicKeJpg(file);
      return (await ubahUkuran(jpg)) || { blob: jpg, ext: 'jpg', type: 'image/jpeg' };
    } catch (e) {
      throw new Error('Foto HEIC ini gagal diubah ke JPG' + (e && e.message ? ': ' + e.message : '.'));
    }
  }

  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    throw new Error('Format foto tidak didukung. Pakai JPG, PNG, WebP, GIF, atau HEIC.');
  }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  return { blob: file, ext: ext || 'jpg', type: file.type };
}

/* ======================  HALAMAN UPLOAD  ====================== */
function siapkanUpload() {
  const form = $('formUpload');
  if (!form) return;

  // pilih album otomatis dari link (?album=2)
  const dariLink = new URLSearchParams(location.search).get('album');
  if (dariLink && ['2', '3', '4'].includes(dariLink)) {
    form.querySelector(`input[name="album"][value="${dariLink}"]`).checked = true;
  }

  const status = $('status');
  const tombol = $('tombolUpload');
  const bar = $('bar');
  const isiBar = bar.firstElementChild;
  const input = $('berkasFoto');
  const zona = $('dropzone');
  const daftar = $('pratinjau');
  const jumlahEl = $('jumlahPilihan');
  const kosongkan = $('kosongkan');

  const pesan = (teks, jenis = '') => { status.textContent = teks; status.className = 'status ' + jenis; };

  /* Album khusus admin (Family) tidak bisa diupload dari halaman ini.
     Upload ke album itu hanya lewat dashboard admin. */
  async function penggunaAlbum(n) {
    const db = dbAlbum(n);
    if (!db) return null;
    const { data } = await db.auth.getSession();
    return data && data.session ? data.session.user : null;
  }

  let antrian = [];   // foto yang menunggu diunggah: { file, url, el }
  let sibuk = false;

  const kunci = (f) => f.name + '|' + f.size + '|' + f.lastModified;

  function perbarui() {
    jumlahEl.textContent = antrian.length ? `${antrian.length} foto dipilih` : '';
    kosongkan.hidden = !antrian.length;
    tombol.textContent = antrian.length ? `Upload ${antrian.length} foto` : 'Upload foto';
  }

  function buangItem(item) {
    URL.revokeObjectURL(item.url);
    if (item.url2) URL.revokeObjectURL(item.url2);
    item.el.remove();
  }

  // Foto HEIC diubah ke JPG satu per satu begitu dipilih, supaya pratinjau muncul dan upload nanti lebih cepat
  let rantaiHeic = Promise.resolve();
  function siapkanHeic(item) {
    item.janji = rantaiHeic = rantaiHeic.then(async () => {
      if (!antrian.includes(item)) return;
      try {
        item.hasil = await kecilkan(item.file);
        item.url2 = URL.createObjectURL(item.hasil.blob);
        const img = item.el.querySelector('img');
        if (img) img.src = item.url2;
        item.el.style.background = '';
        item.el.title = '';
      } catch (e) {
        console.error(e);
        item.el.className = 'gagal';
        item.el.title = (e && e.message) || 'Foto HEIC gagal diubah';
      }
    });
  }

  function tambahItem(item) {
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    if (adaHeic(item.file)) { li.style.background = '#e5e5e5'; li.title = 'Mengubah HEIC ke JPG...'; }
    else img.src = item.url;
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'hapus-pilihan';
    x.textContent = '\u00d7';
    x.setAttribute('aria-label', 'Hapus ' + item.file.name);
    x.addEventListener('click', () => {
      if (sibuk) return;
      antrian = antrian.filter((i) => i !== item);
      buangItem(item);
      perbarui();
    });
    li.append(img, x);
    item.el = li;
    daftar.appendChild(li);
  }

  function tambahBerkas(fileList) {
    if (sibuk) return;
    const dilewati = [];
    for (const f of Array.from(fileList)) {
      if (!f.type.startsWith('image/') && !adaHeic(f)) { dilewati.push(`${f.name} bukan foto`); continue; }
      if (f.size > MAKS_FILE_MB * 1024 * 1024) { dilewati.push(`${f.name} lebih dari ${MAKS_FILE_MB} MB`); continue; }
      if (antrian.some((i) => kunci(i.file) === kunci(f))) continue;
      if (antrian.length >= MAKS_FOTO_SEKALI) { dilewati.push(`maksimal ${MAKS_FOTO_SEKALI} foto sekali upload`); break; }
      const item = { file: f, url: URL.createObjectURL(f), el: null };
      antrian.push(item);
      tambahItem(item);
      if (adaHeic(f)) siapkanHeic(item);
    }
    perbarui();
    if (dilewati.length) {
      pesan('Dilewati: ' + dilewati.slice(0, 3).join('; ') + (dilewati.length > 3 ? ` (+${dilewati.length - 3} lainnya)` : ''), 'galat');
    } else {
      pesan('');
    }
  }

  // pilih lewat tombol / ketuk (bisa pilih banyak sekaligus)
  input.addEventListener('change', () => { tambahBerkas(input.files); input.value = ''; });

  // seret dan lepas dari laptop
  ['dragenter', 'dragover'].forEach((n) => zona.addEventListener(n, (e) => { e.preventDefault(); if (!sibuk) zona.classList.add('seret'); }));
  ['dragleave', 'drop'].forEach((n) => zona.addEventListener(n, (e) => { e.preventDefault(); zona.classList.remove('seret'); }));
  zona.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files) tambahBerkas(e.dataTransfer.files); });
  // cegah browser membuka foto kalau terlepas di luar kotak
  ['dragover', 'drop'].forEach((n) => window.addEventListener(n, (e) => e.preventDefault()));

  kosongkan.addEventListener('click', () => {
    if (sibuk) return;
    antrian.forEach(buangItem);
    antrian = [];
    perbarui();
    pesan('');
  });

  async function unggahSatu(item, album, caption) {
    const db = dbAlbum(album);
    const cfg = ALBUM_SUPABASE[album];
    if (item.janji) await item.janji;
    const { blob, ext, type } = item.hasil || await kecilkan(item.file);
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${Date.now()}-${rand}.${ext}`;

    const { error: e1 } = await db.storage.from(cfg.bucket).upload(path, blob, { contentType: type, cacheControl: '31536000' });
    if (e1) throw e1;

    const { data } = db.storage.from(cfg.bucket).getPublicUrl(path);
    const { error: e2 } = await db.from(cfg.tabel).insert([{ image_url: data.publicUrl, caption: caption || null }]);
    if (e2) throw e2;
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (sibuk) return;
    if (!antrian.length) return pesan('Pilih foto dulu.', 'galat');

    const album = Number(form.album.value);
    if (album === 1) return pesan('Upload ke album Family hanya bisa dilakukan oleh admin.', 'galat');
    if (!dbAlbum(album)) return pesan(pesanBelumTerhubung(album), 'galat');
    if (ALBUM_SUPABASE[album].adminSaja && !(await penggunaAlbum(album))) {
      return pesan(`${NAMA_ALBUM[album]} khusus admin. Kamu belum masuk sebagai admin.`, 'galat');
    }
    const caption = $('caption').value.trim().slice(0, 140);
    const kerja = [...antrian];
    const total = kerja.length;
    let selesai = 0;
    let urut = 0;
    const gagal = [];
    const berhasil = [];

    sibuk = true;
    tombol.disabled = true;
    input.disabled = true;
    zona.classList.add('nonaktif');
    $('lihatAlbum').hidden = true;
    bar.style.display = 'block';

    const perbaruiProgres = () => {
      pesan(`Mengunggah... ${selesai} dari ${total} selesai`);
      isiBar.style.width = (selesai / total) * 100 + '%';
    };
    perbaruiProgres();

    async function pekerja() {
      while (urut < kerja.length) {
        const item = kerja[urut++];
        item.el.className = 'jalan';
        let err = null;
        for (let coba = 0; coba < 2; coba++) {   // 1x coba ulang kalau sinyal putus-putus
          try { await unggahSatu(item, album, caption); err = null; break; }
          catch (e) { err = e; console.error(e); if (/^(Format foto|Foto HEIC)/.test(String(e.message))) break; }
        }
        selesai++;
        if (err) { item.el.className = 'gagal'; item.el.title = ramahkan(err); gagal.push(err); }
        else { item.el.className = 'sukses'; berhasil.push(item); }
        perbaruiProgres();
      }
    }
    await Promise.all(Array.from({ length: Math.min(UPLOAD_PARALEL, total) }, pekerja));

    // yang berhasil dikeluarkan dari antrian, yang gagal tetap ada supaya bisa dicoba lagi
    antrian = antrian.filter((i) => !berhasil.includes(i));
    setTimeout(() => berhasil.forEach(buangItem), 1200);

    if (!gagal.length) {
      pesan(`${berhasil.length} foto berhasil masuk ke ${NAMA_ALBUM[album]}.`, 'ok');
      $('caption').value = '';
    } else {
      pesan(`${berhasil.length} berhasil, ${gagal.length} gagal (${ramahkan(gagal[0])}). Foto yang gagal masih di daftar, tekan Upload untuk mencoba lagi.`, 'galat');
    }
    if (berhasil.length) {
      $('lihatAlbum').href = `foto-${album}.html`;
      $('lihatAlbum').textContent = `Lihat ${NAMA_ALBUM[album]}`;
      $('lihatAlbum').hidden = false;
    }

    sibuk = false;
    tombol.disabled = false;
    input.disabled = false;
    zona.classList.remove('nonaktif');
    perbarui();
    setTimeout(() => { bar.style.display = 'none'; isiBar.style.width = '0'; }, 1500);
  });
}

/* ======================  HALAMAN GALERI  ====================== */
function tanggalIndo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// nama file unduhan: dari keterangan foto kalau ada
function namaUnduhan(item) {
  const ext = ((item.image_url.split('?')[0].split('.').pop()) || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const dasar = (item.caption || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return (dasar || 'foto-xii-tjkt-1') + '.' + ext;
}

// Dipanggil saat sebuah gambar gagal dibuka: cari tahu penyebabnya dan tampilkan di layar
let sudahDiagnosa = false;
async function diagnosa(url, info) {
  if (sudahDiagnosa) return;
  sudahDiagnosa = true;
  const tulis = (t) => { info.textContent = t; info.className = 'status galat'; };
  tulis('Gambar gagal dibuka, sedang memeriksa penyebabnya...');
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (!res.ok) {
      return tulis(`Penyimpanan Supabase menjawab kode ${res.status} untuk file ini. ` +
        (res.status === 400 || res.status === 404
          ? 'File atau nama bucket tidak ditemukan.'
          : 'Cek pengaturan bucket di Supabase.'));
    }
    const tipe = (res.headers.get('content-type') || '').toLowerCase();
    if (!/^image\/(jpeg|png|webp|gif|avif)/.test(tipe)) {
      return tulis(`File tersimpan dengan format "${tipe || 'tidak diketahui'}" yang tidak bisa ditampilkan browser (misal HEIC). Hapus foto itu dan upload ulang sebagai JPG/PNG.`);
    }
    tulis('File ada dan formatnya benar, tapi browser ini gagal menampilkannya. Muat ulang halaman; kalau tetap gagal, kirim alamat file ini ke pembuat web: ' + url);
  } catch (_) {
    try {
      await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' });
      tulis('Terhubung ke Supabase, tapi gambar tetap gagal tampil. Coba muat ulang halaman. Alamat file: ' + url);
    } catch (__) {
      tulis('Perangkat ini tidak bisa menghubungi penyimpanan foto Supabase (kemungkinan diblokir jaringan/ISP atau DNS). Coba pindah antara Wi-Fi dan data seluler, atau ganti DNS ke 1.1.1.1 / 8.8.8.8.');
    }
  }
}

function siapkanGaleri() {
  const album = Number(document.body.dataset.album);
  const daftar = $('galeri');
  if (!album || !daftar) return;

  const info = $('infoGaleri');
  const muatLagi = $('muatLagi');
  const db = dbAlbum(album);
  const cfg = ALBUM_SUPABASE[album];
  if (!db) {
    info.textContent = pesanBelumTerhubung(album);
    info.className = 'status galat';
    return;
  }
  const dialog = $('lightbox');
  const gambarBesar = $('lightboxGambar');
  const teksBesar = $('lightboxTeks');
  const tglBesar = $('lightboxTgl');
  const unduh = $('unduhFoto');
  let halaman = 0;
  let jumlah = 0;

  function tambahKartu(item) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'polaroid';
    btn.setAttribute('aria-label', item.caption ? 'Buka foto: ' + item.caption : 'Buka foto');

    const wadah = document.createElement('div');
    wadah.className = 'polaroid-foto';
    const img = document.createElement('img');
    img.alt = item.caption || 'Foto kelas';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.onerror = () => {
      img.remove();
      wadah.classList.add('rusak');
      wadah.textContent = 'Gambar tidak bisa dimuat';
      diagnosa(item.image_url, info);
    };
    img.src = item.image_url;
    wadah.appendChild(img);

    const teks = document.createElement('p');
    teks.className = 'polaroid-teks';
    teks.textContent = item.caption || '';
    const tgl = document.createElement('p');
    tgl.className = 'polaroid-tgl';
    tgl.textContent = tanggalIndo(item.created_at);

    btn.append(wadah, teks, tgl);
    btn.addEventListener('click', () => {
      gambarBesar.src = item.image_url;
      gambarBesar.alt = item.caption || 'Foto kelas';
      teksBesar.textContent = item.caption || '';
      tglBesar.textContent = tanggalIndo(item.created_at);
      // ?download= membuat Supabase mengirim file sebagai unduhan (bekerja di HP dan laptop)
      unduh.href = item.image_url + (item.image_url.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(namaUnduhan(item));
      dialog.showModal();
    });
    li.appendChild(btn);
    daftar.appendChild(li);
  }

  async function muat() {
    muatLagi.disabled = true;
    info.textContent = 'Memuat foto...';
    const dari = halaman * PER_HALAMAN;
    const { data, error } = await db
      .from(cfg.tabel)
      .select('image_url, caption, created_at')
      .order('created_at', { ascending: false })
      .range(dari, dari + PER_HALAMAN - 1);

    if (error) {
      console.error(error);
      info.textContent = 'Foto gagal dimuat: ' + (error.message || 'kesalahan tidak diketahui') + (error.code ? ' (kode ' + error.code + ')' : '');
      info.className = 'status galat';
      muatLagi.disabled = false;
      return;
    }
    data.forEach(tambahKartu);
    jumlah += data.length;
    halaman++;
    muatLagi.parentElement.hidden = data.length < PER_HALAMAN;
    muatLagi.disabled = false;
    if (!info.classList.contains('galat')) info.textContent = jumlah ? `${jumlah} foto ditampilkan` : '';
    if (!jumlah) {
      daftar.insertAdjacentHTML('afterend', '<p class="kosong-galeri" id="kosongGaleri">Belum ada foto di album ini. Jadi yang pertama upload!</p>');
    }
  }

  muatLagi.addEventListener('click', muat);
  $('tutupLightbox').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { gambarBesar.src = ''; });
  muat();
}

siapkanUpload();
siapkanGaleri();