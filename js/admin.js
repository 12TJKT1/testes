// Panel admin: login, edit prestasi, kelola foto album Family, upload & hapus foto album Random.
// Keamanan sebenarnya ada di aturan RLS (supabase_admin_prestasi.sql), bukan di file ini.
(function () {
  'use strict';

  var C = window.ADMIN_CFG;
  var db = supabase.createClient(C.url, C.key);
  var JUMLAH_SISWA = 34;
  var MAKS_PRESTASI = 8 * 1024 * 1024;
  var MAKS_FOTO = 10 * 1024 * 1024;
  var JENIS_OK = ['image/jpeg', 'image/png', 'image/webp'];

  var $ = function (id) { return document.getElementById(id); };

  // ---------- pembantu ----------
  // Membuat elemen tanpa innerHTML, supaya teks dari database aman.
  function h(tag, props) {
    var el = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  function status(el, teks, galat) {
    el.textContent = teks || '';
    el.style.color = galat ? '#c62828' : '';
  }

  function pesanGalat(err) {
    var m = (err && err.message) || String(err);
    if (/row-level security|permission denied|42501/i.test(m + ((err && err.code) || ''))) {
      return 'Ditolak. Akun ini bukan admin, atau SQL admin belum dijalankan di Supabase.';
    }
    return m;
  }

  // ---------- HEIC (foto iPhone) -> JPG ----------
  function adaHeic(f) { return /image\/hei[cf]/i.test(f.type || '') || /\.hei[cf]$/i.test(f.name || ''); }
  function muatSkrip(src) {
    return new Promise(function (res, rej) {
      var sc = document.createElement('script');
      sc.src = src; sc.onload = res;
      sc.onerror = function () { rej(new Error('Pengubah HEIC gagal dimuat, cek koneksi internet.')); };
      document.head.appendChild(sc);
    });
  }
  var janjiH1 = null, janjiH2 = null;
  function muatHeic() {
    if (window.heic2any) return Promise.resolve();
    return janjiH1 || (janjiH1 = muatSkrip('https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js').catch(function (e) { janjiH1 = null; throw e; }));
  }
  function muatHeicTo() {
    if (window.HeicTo) return Promise.resolve();
    return janjiH2 || (janjiH2 = muatSkrip('https://cdn.jsdelivr.net/npm/heic-to@1/dist/iife/heic-to.js').catch(function (e) { janjiH2 = null; throw e; }));
  }
  async function heicKeJpg(file) {
    var galat1;
    try {
      await muatHeic();
      var k = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
      return Array.isArray(k) ? k[0] : k;
    } catch (e) { galat1 = e; }
    try {
      await muatHeicTo();
      var fn = window.HeicTo && (window.HeicTo.heicTo || window.HeicTo);
      return await fn({ blob: file, type: 'image/jpeg', quality: 0.85 });
    } catch (e) { throw galat1 || e; }
  }

  // Kecilkan foto (sisi terpanjang 1600 px) seperti di halaman Foto, supaya upload cepat.
  // Kalau browser gagal membacanya, file asli dipakai apa adanya.
  async function perkecil(file) {
    try {
      var bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      var skala = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      var w = Math.round(bmp.width * skala), hh = Math.round(bmp.height * skala);
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = hh;
      var cx = cv.getContext('2d');
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, hh);
      cx.drawImage(bmp, 0, 0, w, hh);
      if (bmp.close) bmp.close();
      var blob = await new Promise(function (res) { cv.toBlob(res, 'image/jpeg', 0.85); });
      if (blob) return { blob: blob, ext: 'jpg', type: 'image/jpeg' };
    } catch (_) { /* coba cara lain di bawah */ }
    if (adaHeic(file)) {
      var jpg;
      try { jpg = await heicKeJpg(file); }
      catch (e) { throw new Error(file.name + ': foto HEIC gagal diubah ke JPG' + (e && e.message ? ' (' + e.message + ')' : '') + '.'); }
      var hasil = await perkecil(jpg);       // kecilkan hasil JPG-nya
      if (hasil.type === 'image/jpeg') return hasil;
      return { blob: jpg, ext: 'jpg', type: 'image/jpeg' };
    }
    var ext = ((file.name || 'foto.jpg').split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    return { blob: file, ext: ext, type: file.type };
  }

  // klien (opsional): koneksi Supabase lain, dipakai untuk album Random. Bawaan: project album 1.
  async function unggah(bucket, file, klien) {
    var c = klien || db;
    var k = await perkecil(file);
    var nama = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + k.ext;
    var r = await c.storage.from(bucket).upload(nama, k.blob, {
      cacheControl: '31536000',
      contentType: k.type || undefined
    });
    if (r.error) throw r.error;
    return c.storage.from(bucket).getPublicUrl(nama).data.publicUrl;
  }

  function pathDariUrl(bucket, url) {
    var penanda = '/object/public/' + bucket + '/';
    var i = (url || '').indexOf(penanda);
    if (i < 0) return null; // bukan file di bucket ini (misal foto/prestasi/xxx.jpg bawaan)
    return decodeURIComponent(url.slice(i + penanda.length).split('?')[0]);
  }

  async function hapusBerkas(bucket, url) {
    var p = pathDariUrl(bucket, url);
    if (p) await db.storage.from(bucket).remove([p]);
  }

  function cekFile(file, maks) {
    if (JENIS_OK.indexOf(file.type) < 0 && !adaHeic(file)) return file.name + ': gunakan JPG, PNG, WebP, atau HEIC.';
    if (file.size > maks) return file.name + ': ukuran melebihi ' + Math.round(maks / 1048576) + ' MB.';
    return '';
  }

  // ---------- login ----------
  var ALBUM_RANDOM = [2, 3, 4];
  var albumAktif = null;
  var PER_HAL = 24;
  var sudahMuat = false;

  function tampil(sesi) {
    $('panelMasuk').hidden = !!sesi;
    $('panelAdmin').hidden = !sesi;
    if (sesi) {
      $('emailAdmin').textContent = sesi.user.email;
      if (!sudahMuat) {
        sudahMuat = true;
        muatPrestasi();
        muatFoto(true);
      }
    } else {
      sudahMuat = false;
      tutupForm();
      $('daftarAdmin').replaceChildren();
      $('galeriAdmin').replaceChildren();
      albumAktif = null;
      $('galeriRandom').replaceChildren();
    }
  }

  db.auth.onAuthStateChange(function (_e, sesi) {
    setTimeout(function () { tampil(sesi); }, 0);
  });
  db.auth.getSession().then(function (r) { tampil(r.data.session); });

  $('formMasuk').addEventListener('submit', async function (e) {
    e.preventDefault();
    var tombol = $('tombolMasuk');
    tombol.disabled = true;
    status($('statusMasuk'), 'Memeriksa...');
    var emailMasuk = $('adminEmail').value.trim();
    var sandiMasuk = $('adminSandi').value;
    var r = await db.auth.signInWithPassword({ email: emailMasuk, password: sandiMasuk });
    tombol.disabled = false;
    if (r.error) {
      status($('statusMasuk'), 'Email atau password salah.', true);
      return;
    }
    $('adminSandi').value = '';
    status($('statusMasuk'), '');
    // coba masuk juga ke project album Random (kalau akun yang sama sudah dibuat di sana)
    ALBUM_RANDOM.forEach(function (n) { masukRandom(n, emailMasuk, sandiMasuk).catch(function () {}); });
  });

  $('tombolKeluar').addEventListener('click', function () {
    db.auth.signOut();
    ALBUM_RANDOM.forEach(function (n) { var d = dbRandom(n); if (d) d.auth.signOut(); });
  });

  // ---------- tab ----------
  document.querySelectorAll('#panelAdmin > .adm-tab button').forEach(function (b) {
    b.addEventListener('click', function () {
      ['Prestasi', 'Foto', 'Random'].forEach(function (nama) {
        var aktif = b.dataset.tab === nama;
        $('tab' + nama).hidden = !aktif;
        $('tabBtn' + nama).setAttribute('aria-selected', aktif ? 'true' : 'false');
      });
      if (b.dataset.tab === 'Random' && albumAktif === null) siapkanRandom();
    });
  });

  // =====================================================
  //  PRESTASI
  // =====================================================
  var daftar = [];
  var sedangEdit = null;

  var AWAL = [
    {
      judul: 'Juara 1 Classmeet Mini Soccer',
      keterangan: 'Classmeet SMKN 1 Pekanbaru',
      foto_url: 'foto/prestasi/mini-soccer.jpg',
      label_peserta: 'Yang berhasil',
      peserta: [1, 2, 3, 4, 5, 6, 7].map(function (n) { return { nama: 'Nama Siswa ' + n, no: n }; })
    },
    {
      judul: 'Juara 2 Lomba Mikrotik by HIMATEL PCR',
      keterangan: 'Lomba jaringan komputer dengan mikrotik yang diadakan oleh Himpunan Mahasiswa Telekomunikasi Politeknik Caltex Riau pada tanggal 29 November 2025',
      foto_url: 'foto/prestasi/lomba-contoh.jpg',
      label_peserta: 'Yang mengikuti lomba',
      peserta: [{ nama: 'HABIB AL RAZZAQ', no: 9 }, { nama: 'ANGGA ARASYA', no: 3 }]
    },
    {
      judul: 'Juara 2 Lomba Cyber Security by HIMAKOM PCR',
      keterangan: 'Lomba keamanan jaringan yang diadakan oleh Himpunan Mahasiswa Komputer Politeknik Caltex Riau pada tanggal 24 Mei 2026',
      foto_url: 'foto/prestasi/lomba-contoh.jpg',
      label_peserta: 'Yang mengikuti lomba',
      peserta: [{ nama: 'HABIB AL RAZZAQ', no: 9 }, { nama: 'GHANDI RAHMANA PUTRA', no: 8 }]
    }
  ];

  async function muatPrestasi() {
    var sp = $('statusPrestasi');
    status(sp, 'Memuat...');
    var r = await db.from('prestasi').select('*')
      .order('urutan', { ascending: true }).order('id', { ascending: true });
    if (r.error) {
      status(sp, 'Gagal memuat: ' + pesanGalat(r.error) + ' Sudah menjalankan supabase_admin_prestasi.sql?', true);
      return;
    }
    status(sp, '');
    daftar = r.data || [];
    gambarDaftar();
  }

  function gambarDaftar() {
    var ul = $('daftarAdmin');
    ul.replaceChildren();
    $('kosongPrestasi').hidden = daftar.length > 0;
    daftar.forEach(function (p, i) {
      var jml = (p.peserta || []).length;
      ul.append(h('li', { class: 'adm-item' },
        p.foto_url
          ? h('img', { class: 'adm-thumb', src: p.foto_url, alt: '', loading: 'lazy', onerror: function (e) { e.target.replaceWith(h('div', { class: 'adm-thumb adm-thumb-kosong' }, 'Tanpa foto')); } })
          : h('div', { class: 'adm-thumb adm-thumb-kosong' }, 'Tanpa foto'),
        h('div', { class: 'adm-item-isi' },
          h('strong', {}, p.judul),
          h('span', {}, jml + ' siswa' + (p.keterangan ? ' \u00b7 ' + p.keterangan.slice(0, 70) + (p.keterangan.length > 70 ? '...' : '') : ''))
        ),
        h('div', { class: 'adm-aksi' },
          h('button', { type: 'button', class: 'tombol tipis adm-kecil', disabled: i === 0, 'aria-label': 'Naikkan ' + p.judul, onclick: function () { geser(i, -1); } }, 'Naik'),
          h('button', { type: 'button', class: 'tombol tipis adm-kecil', disabled: i === daftar.length - 1, 'aria-label': 'Turunkan ' + p.judul, onclick: function () { geser(i, 1); } }, 'Turun'),
          h('button', { type: 'button', class: 'tombol tipis adm-kecil', onclick: function () { bukaForm(p); } }, 'Edit'),
          h('button', { type: 'button', class: 'tombol tipis adm-kecil adm-bahaya', onclick: function () { hapusPrestasi(p); } }, 'Hapus')
        )
      ));
    });
  }

  async function geser(i, arah) {
    var j = i + arah;
    if (j < 0 || j >= daftar.length) return;
    var baru = daftar.slice();
    var t = baru[i]; baru[i] = baru[j]; baru[j] = t;
    var tugas = [];
    baru.forEach(function (p, k) {
      if (p.urutan !== k) tugas.push(db.from('prestasi').update({ urutan: k }).eq('id', p.id).select());
    });
    var hasil = await Promise.all(tugas);
    var gagal = hasil.filter(function (r) { return r.error || !r.data || !r.data.length; })[0];
    if (gagal) status($('statusPrestasi'), gagal.error ? pesanGalat(gagal.error) : 'Urutan tidak tersimpan. Cek SQL admin.', true);
    await muatPrestasi();
  }

  async function hapusPrestasi(p) {
    if (!confirm('Hapus prestasi "' + p.judul + '"? Ini tidak bisa dibatalkan.')) return;
    var sp = $('statusPrestasi');
    status(sp, 'Menghapus...');
    var r = await db.from('prestasi').delete().eq('id', p.id).select();
    if (r.error || !r.data || !r.data.length) {
      status(sp, r.error ? pesanGalat(r.error) : 'Tidak terhapus. Cek SQL admin.', true);
      return;
    }
    if (p.foto_url) hapusBerkas(C.bucketPrestasi, p.foto_url).catch(function () {});
    await muatPrestasi();
    status(sp, 'Prestasi dihapus.');
  }

  $('imporPrestasi').addEventListener('click', async function () {
    var sp = $('statusPrestasi');
    this.disabled = true;
    status(sp, 'Mengimpor...');
    var r = await db.from('prestasi').insert(AWAL.map(function (p, i) {
      return Object.assign({}, p, { urutan: i });
    })).select();
    this.disabled = false;
    if (r.error || !r.data || !r.data.length) {
      status(sp, r.error ? pesanGalat(r.error) : 'Impor gagal. Cek SQL admin.', true);
      return;
    }
    await muatPrestasi();
    status(sp, 'Prestasi berhasil diimpor.');
  });

  // ----- form prestasi -----
  function barisPeserta(p) {
    var nama = h('input', { type: 'text', class: 'p-nama', maxlength: '80', placeholder: 'Nama siswa', 'aria-label': 'Nama siswa' });
    nama.value = p.nama || '';
    var no = h('input', { type: 'number', class: 'p-no', min: '1', max: String(JUMLAH_SISWA), placeholder: 'Absen', 'aria-label': 'Nomor absen (boleh kosong)' });
    no.value = p.no || '';
    return h('li', { class: 'adm-peserta' }, nama, no,
      h('button', { type: 'button', class: 'tombol tipis adm-kecil', onclick: function (e) { e.currentTarget.closest('li').remove(); } }, 'Hapus'));
  }

  function setPratinjau(src) {
    $('pratinjauPrestasi').hidden = !src;
    if (src) $('gambarPratinjau').src = src;
  }

  function bukaForm(item) {
    sedangEdit = item || null;
    $('judulForm').textContent = item ? 'Edit prestasi' : 'Tambah prestasi';
    $('fJudul').value = item ? item.judul : '';
    $('fKet').value = item && item.keterangan ? item.keterangan : '';
    $('fLabel').value = item ? item.label_peserta : 'Yang berhasil';
    $('fFoto').value = '';
    $('fHapusFoto').checked = false;
    $('barisHapusFoto').hidden = !(item && item.foto_url);
    setPratinjau(item && item.foto_url ? item.foto_url : '');
    var list = $('listPeserta');
    list.replaceChildren();
    var awal = item && item.peserta && item.peserta.length ? item.peserta : [{ nama: '', no: null }];
    awal.forEach(function (p) { list.append(barisPeserta(p)); });
    status($('statusForm'), '');
    $('formPrestasi').hidden = false;
    $('formPrestasi').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('fJudul').focus({ preventScroll: true });
  }

  function tutupForm() {
    sedangEdit = null;
    $('formPrestasi').hidden = true;
  }

  $('tambahPrestasi').addEventListener('click', function () { bukaForm(null); });
  $('batalPrestasi').addEventListener('click', tutupForm);
  $('tambahPeserta').addEventListener('click', function () {
    var baris = barisPeserta({});
    $('listPeserta').append(baris);
    baris.querySelector('.p-nama').focus();
  });

  $('fFoto').addEventListener('change', function () {
    var f = this.files[0];
    if (f) {
      setPratinjau(URL.createObjectURL(f));
      $('fHapusFoto').checked = false;
    } else {
      setPratinjau(sedangEdit && sedangEdit.foto_url ? sedangEdit.foto_url : '');
    }
  });

  $('formPrestasi').addEventListener('submit', async function (e) {
    e.preventDefault();
    var sf = $('statusForm');
    var judul = $('fJudul').value.trim();
    if (!judul) { status(sf, 'Nama prestasi wajib diisi.', true); return; }

    var file = $('fFoto').files[0];
    if (file) {
      var salah = cekFile(file, MAKS_PRESTASI);
      if (salah) { status(sf, salah, true); return; }
    }

    var peserta = Array.prototype.map.call($('listPeserta').querySelectorAll('li'), function (li) {
      var n = parseInt(li.querySelector('.p-no').value, 10);
      return { nama: li.querySelector('.p-nama').value.trim(), no: n >= 1 && n <= JUMLAH_SISWA ? n : null };
    }).filter(function (p) { return p.nama; });

    var tombol = $('simpanPrestasi');
    tombol.disabled = true;
    status(sf, file ? 'Mengunggah foto...' : 'Menyimpan...');

    var fotoBaru = null;
    try {
      var lama = sedangEdit ? sedangEdit.foto_url : null;
      var foto = lama;
      var ganti = false;
      if (file) { foto = fotoBaru = await unggah(C.bucketPrestasi, file); ganti = true; }
      else if ($('fHapusFoto').checked) { foto = null; ganti = true; }

      var isi = {
        judul: judul,
        keterangan: $('fKet').value.trim() || null,
        foto_url: foto,
        label_peserta: $('fLabel').value.trim() || 'Yang berhasil',
        peserta: peserta
      };
      var r;
      if (sedangEdit) {
        r = await db.from('prestasi').update(isi).eq('id', sedangEdit.id).select();
      } else {
        isi.urutan = daftar.length ? Math.max.apply(null, daftar.map(function (p) { return p.urutan; })) + 1 : 0;
        r = await db.from('prestasi').insert(isi).select();
      }
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('Perubahan tidak tersimpan. Cek SQL admin.');

      if (ganti && lama) hapusBerkas(C.bucketPrestasi, lama).catch(function () {});
      tutupForm();
      await muatPrestasi();
      status($('statusPrestasi'), 'Prestasi tersimpan.');
    } catch (err) {
      if (fotoBaru) hapusBerkas(C.bucketPrestasi, fotoBaru).catch(function () {});
      status(sf, pesanGalat(err), true);
    } finally {
      tombol.disabled = false;
    }
  });

  // =====================================================
  //  FOTO FAMILY (tabel memori di project album 1)
  // =====================================================
  var halaman = 0;

  async function muatFoto(awal) {
    var sf = $('statusFoto');
    var galeri = $('galeriAdmin');
    if (awal) { halaman = 0; galeri.replaceChildren(); }
    status(sf, 'Memuat...');
    var dari = halaman * PER_HAL;
    var r = await db.from('memori').select('*')
      .order('created_at', { ascending: false }).range(dari, dari + PER_HAL - 1);
    if (r.error) { status(sf, 'Gagal memuat: ' + pesanGalat(r.error), true); return; }
    var data = r.data || [];
    data.forEach(function (f) { galeri.append(kartuFoto(f)); });
    halaman++;
    $('lagiFoto').hidden = data.length < PER_HAL;
    status(sf, galeri.children.length ? '' : 'Belum ada foto di album Family.');
  }

  function kartuFoto(f) {
    var cap = h('input', { type: 'text', maxlength: '140', placeholder: 'Keterangan', 'aria-label': 'Keterangan foto' });
    cap.value = f.caption || '';
    var li = h('li', { class: 'adm-foto-item' },
      h('img', { src: f.image_url, alt: f.caption || 'Foto album Family', loading: 'lazy' }),
      cap,
      h('div', { class: 'adm-aksi' },
        h('button', { type: 'button', class: 'tombol tipis adm-kecil', onclick: async function (e) {
          var b = e.currentTarget;
          b.disabled = true;
          var r = await db.from('memori').update({ caption: cap.value.trim() || null }).eq('id', f.id).select();
          b.disabled = false;
          if (r.error || !r.data || !r.data.length) {
            status($('statusFoto'), r.error ? pesanGalat(r.error) : 'Keterangan tidak tersimpan. Cek SQL admin.', true);
          } else {
            status($('statusFoto'), 'Keterangan tersimpan.');
          }
        } }, 'Simpan'),
        h('button', { type: 'button', class: 'tombol tipis adm-kecil adm-bahaya', onclick: async function () {
          if (!confirm('Hapus foto ini dari album Family? Ini tidak bisa dibatalkan.')) return;
          var r = await db.from('memori').delete().eq('id', f.id).select();
          if (r.error || !r.data || !r.data.length) {
            status($('statusFoto'), r.error ? pesanGalat(r.error) : 'Foto tidak terhapus. Cek SQL admin.', true);
            return;
          }
          hapusBerkas(C.bucketFoto, f.image_url).catch(function () {});
          li.remove();
          status($('statusFoto'), 'Foto dihapus.');
        } }, 'Hapus')
      )
    );
    return li;
  }

  $('muatFoto').addEventListener('click', function () { muatFoto(false); });

  $('formFoto').addEventListener('submit', async function (e) {
    e.preventDefault();
    var su = $('statusUnggah');
    var berkas = Array.prototype.slice.call($('fotoBerkas').files);
    if (!berkas.length) { status(su, 'Pilih foto dulu.', true); return; }
    for (var i = 0; i < berkas.length; i++) {
      var salah = cekFile(berkas[i], MAKS_FOTO);
      if (salah) { status(su, salah, true); return; }
    }

    var tombol = $('tombolUnggah');
    var bar = $('barFoto');
    var caption = $('fotoCaption').value.trim() || null;
    tombol.disabled = true;
    bar.classList.add('aktif');
    var berhasil = 0;
    try {
      for (var k = 0; k < berkas.length; k++) {
        status(su, 'Mengunggah ' + (k + 1) + ' dari ' + berkas.length + '...');
        bar.firstElementChild.style.width = Math.round((k / berkas.length) * 100) + '%';
        var url = await unggah(C.bucketFoto, berkas[k]);
        var r = await db.from('memori').insert({ image_url: url, caption: caption }).select();
        if (r.error || !r.data || !r.data.length) {
          hapusBerkas(C.bucketFoto, url).catch(function () {});
          throw r.error || new Error('Foto tidak tersimpan. Cek SQL admin.');
        }
        berhasil++;
      }
      bar.firstElementChild.style.width = '100%';
      status(su, berhasil + ' foto berhasil diupload.');
      $('fotoBerkas').value = '';
      $('fotoCaption').value = '';
    } catch (err) {
      status(su, (berhasil ? berhasil + ' foto terupload, lalu gagal: ' : '') + pesanGalat(err), true);
    } finally {
      tombol.disabled = false;
      setTimeout(function () { bar.classList.remove('aktif'); bar.firstElementChild.style.width = '0'; }, 1200);
      if (berhasil) muatFoto(true);
    }
  });
  // =====================================================
  //  FOTO RANDOM (album 2-4, tiap album = project Supabase sendiri)
  // =====================================================
  var klienRandom = {};
  var halamanR = 0;
  var tampilR = [];      // foto yang sedang tampil: { id, image_url, ... }
  var kartuR = {};       // id -> { li, cb }
  var terpilihR = {};    // id -> item

  function cfgRandom(n) {
    var a = (C.albums || {})[n];
    if (!a || !a.url || !a.key || /^ISI_/.test(a.url) || /^ISI_/.test(a.key)) return null;
    return a;
  }

  function dbRandom(n) {
    var a = cfgRandom(n);
    if (!a) return null;
    if (!klienRandom[n]) klienRandom[n] = supabase.createClient(a.url, a.key);
    return klienRandom[n];
  }

  async function masukRandom(n, email, sandi) {
    var d = dbRandom(n);
    if (!d) return false;
    var r = await d.auth.signInWithPassword({ email: email, password: sandi });
    return !r.error;
  }

  function namaRandom(n) { return ((C.albums || {})[n] || {}).nama || ('Album ' + n); }

  function siapkanRandom() {
    var wadah = $('pilihRandom');
    wadah.replaceChildren();
    ALBUM_RANDOM.forEach(function (n) {
      wadah.append(h('button', { type: 'button', 'data-n': String(n), 'aria-selected': 'false', onclick: function () { pilihAlbumRandom(n); } }, namaRandom(n)));
    });
    pilihAlbumRandom(ALBUM_RANDOM[0]);
  }

  function perbaruiAlat() {
    var k = Object.keys(terpilihR).length;
    var tombol = $('hapusTerpilih');
    tombol.disabled = !k;
    tombol.textContent = k ? 'Hapus terpilih (' + k + ')' : 'Hapus terpilih';
    var semua = tampilR.length > 0 && k === tampilR.length;
    $('pilihSemuaRandom').textContent = semua ? 'Batal pilih semua' : 'Pilih semua yang tampil';
  }

  async function pilihAlbumRandom(n) {
    albumAktif = n;
    halamanR = 0; tampilR = []; kartuR = {}; terpilihR = {};
    $('galeriRandom').replaceChildren();
    $('lagiRandom').hidden = true;
    $('loginRandom').hidden = true;
    $('areaRandom').hidden = true;
    status($('statusUnggahRandom'), '');
    document.querySelectorAll('#pilihRandom button').forEach(function (b) {
      b.setAttribute('aria-selected', b.dataset.n === String(n) ? 'true' : 'false');
    });
    perbaruiAlat();
    var sr = $('statusRandom');
    var d = dbRandom(n);
    if (!d) {
      status(sr, namaRandom(n) + ' belum dihubungkan ke project Supabase. Isi url dan key album ' + n + ' di js/admin-config.js.', true);
      return;
    }
    status(sr, 'Memeriksa sesi...');
    var s = (await d.auth.getSession()).data.session;
    if (albumAktif !== n) return;
    if (!s) { status(sr, ''); $('loginRandom').hidden = false; return; }
    status(sr, '');
    $('areaRandom').hidden = false;
    muatRandom(true);
  }

  $('loginRandom').addEventListener('submit', async function (e) {
    e.preventDefault();
    var n = albumAktif;
    var tombol = $('tombolMasukRandom');
    tombol.disabled = true;
    status($('statusRandom'), 'Memeriksa...');
    var ok = await masukRandom(n, $('emailAdmin').textContent, $('sandiRandom').value);
    tombol.disabled = false;
    if (!ok) {
      status($('statusRandom'), 'Gagal masuk. Pastikan akun admin dengan email yang sama sudah dibuat di Supabase album ini, dan passwordnya benar.', true);
      return;
    }
    $('sandiRandom').value = '';
    pilihAlbumRandom(n);
  });

  async function muatRandom(awal) {
    var n = albumAktif;
    var a = cfgRandom(n), d = dbRandom(n);
    var sr = $('statusRandom');
    if (awal) halamanR = 0;
    status(sr, 'Memuat...');
    var dari = halamanR * PER_HAL;
    var r = await d.from(a.tabel).select('*')
      .order('created_at', { ascending: false }).range(dari, dari + PER_HAL - 1);
    if (albumAktif !== n) return;
    if (r.error) { status(sr, 'Gagal memuat: ' + pesanGalat(r.error), true); return; }
    var data = r.data || [];
    data.forEach(function (f) {
      tampilR.push(f);
      $('galeriRandom').append(kartuRandom(f));
    });
    halamanR++;
    $('lagiRandom').hidden = data.length < PER_HAL;
    status(sr, tampilR.length ? '' : 'Belum ada foto di ' + namaRandom(n) + '.');
    perbaruiAlat();
  }

  function kartuRandom(f) {
    var cb = h('input', { type: 'checkbox', class: 'adm-pilih-cb', 'aria-label': 'Pilih foto' });
    var li = h('li', { class: 'adm-foto-item' },
      cb,
      h('img', { src: f.image_url, alt: f.caption || 'Foto album Random', loading: 'lazy' }),
      h('p', { class: 'adm-cap' }, f.caption || ''),
      h('p', { class: 'adm-tgl' }, f.created_at ? new Date(f.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''),
      h('div', { class: 'adm-aksi' },
        h('button', { type: 'button', class: 'tombol tipis adm-kecil adm-bahaya', onclick: function () {
          if (!confirm('Hapus foto ini dari ' + namaRandom(albumAktif) + '? Ini tidak bisa dibatalkan.')) return;
          hapusRandom([f]);
        } }, 'Hapus')
      )
    );
    cb.addEventListener('change', function () {
      if (cb.checked) terpilihR[f.id] = f; else delete terpilihR[f.id];
      li.classList.toggle('dipilih', cb.checked);
      perbaruiAlat();
    });
    kartuR[f.id] = { li: li, cb: cb };
    return li;
  }

  async function hapusRandom(items) {
    var n = albumAktif;
    var a = cfgRandom(n), d = dbRandom(n);
    var sr = $('statusRandom');
    status(sr, 'Menghapus ' + items.length + ' foto...');
    try {
      var ids = items.map(function (i) { return i.id; });
      var r = await d.from(a.tabel).delete().in('id', ids).select();
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) {
        throw new Error('Tidak ada foto yang terhapus. Pastikan supabase_admin_random.sql sudah dijalankan dan akun admin ada di project album ini.');
      }
      var terhapus = {};
      r.data.forEach(function (x) { terhapus[x.id] = true; });

      var path = items.filter(function (i) { return terhapus[i.id]; })
        .map(function (i) { return pathDariUrl(a.bucket, i.image_url); })
        .filter(Boolean);
      if (path.length) await d.storage.from(a.bucket).remove(path);

      Object.keys(terhapus).forEach(function (id) {
        if (kartuR[id]) kartuR[id].li.remove();
        delete kartuR[id];
        delete terpilihR[id];
      });
      tampilR = tampilR.filter(function (f) { return !terhapus[f.id]; });
      perbaruiAlat();
      var gagal = items.length - r.data.length;
      status(sr, r.data.length + ' foto dihapus.' + (gagal ? ' ' + gagal + ' foto gagal dihapus.' : ''), !!gagal);
    } catch (err) {
      status(sr, pesanGalat(err), true);
    }
  }

  $('muatRandom').addEventListener('click', function () { muatRandom(false); });

  $('pilihSemuaRandom').addEventListener('click', function () {
    var semua = tampilR.length > 0 && Object.keys(terpilihR).length === tampilR.length;
    tampilR.forEach(function (f) {
      var k = kartuR[f.id];
      if (!k) return;
      k.cb.checked = !semua;
      k.li.classList.toggle('dipilih', !semua);
      if (semua) delete terpilihR[f.id]; else terpilihR[f.id] = f;
    });
    perbaruiAlat();
  });

  $('hapusTerpilih').addEventListener('click', function () {
    var items = Object.keys(terpilihR).map(function (id) { return terpilihR[id]; });
    if (!items.length) return;
    if (!confirm('Hapus ' + items.length + ' foto dari ' + namaRandom(albumAktif) + '? Ini tidak bisa dibatalkan.')) return;
    hapusRandom(items);
  });
  // ---------- upload foto ke album Random (khusus admin) ----------
  function segarkanRandom() {
    halamanR = 0; tampilR = []; kartuR = {}; terpilihR = {};
    $('galeriRandom').replaceChildren();
    perbaruiAlat();
    muatRandom(true);
  }

  $('formRandom').addEventListener('submit', async function (e) {
    e.preventDefault();
    var n = albumAktif;
    var a = cfgRandom(n), d = dbRandom(n);
    var su = $('statusUnggahRandom');
    if (!a || !d) { status(su, 'Album ini belum dihubungkan ke Supabase.', true); return; }
    var berkas = Array.prototype.slice.call($('randomBerkas').files);
    if (!berkas.length) { status(su, 'Pilih foto dulu.', true); return; }
    for (var i = 0; i < berkas.length; i++) {
      var salah = cekFile(berkas[i], MAKS_FOTO);
      if (salah) { status(su, salah, true); return; }
    }

    var tombol = $('tombolUnggahRandom');
    var bar = $('barRandom');
    var caption = $('randomCaption').value.trim() || null;
    tombol.disabled = true;
    bar.classList.add('aktif');
    var berhasil = 0;
    try {
      for (var k = 0; k < berkas.length; k++) {
        status(su, 'Mengunggah ' + (k + 1) + ' dari ' + berkas.length + ' ke ' + namaRandom(n) + '...');
        bar.firstElementChild.style.width = Math.round((k / berkas.length) * 100) + '%';
        var url = await unggah(a.bucket, berkas[k], d);
        var r = await d.from(a.tabel).insert({ image_url: url, caption: caption }).select();
        if (r.error || !r.data || !r.data.length) {
          var pth = pathDariUrl(a.bucket, url);
          if (pth) d.storage.from(a.bucket).remove([pth]).catch(function () {});
          throw r.error || new Error('Foto tidak tersimpan. Jalankan ulang supabase_admin_random.sql di project album ini.');
        }
        berhasil++;
      }
      bar.firstElementChild.style.width = '100%';
      status(su, berhasil + ' foto berhasil diupload ke ' + namaRandom(n) + '.');
      $('randomBerkas').value = '';
      $('randomCaption').value = '';
    } catch (err) {
      status(su, (berhasil ? berhasil + ' foto terupload, lalu gagal: ' : '') + pesanGalat(err), true);
    } finally {
      tombol.disabled = false;
      setTimeout(function () { bar.classList.remove('aktif'); bar.firstElementChild.style.width = '0'; }, 1200);
      if (berhasil && albumAktif === n) segarkanRandom();
    }
  });
})();
