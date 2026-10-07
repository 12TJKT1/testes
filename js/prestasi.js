// Menampilkan daftar prestasi dari database di halaman prestasi.html.
// Kalau database tidak bisa dihubungi, isi HTML bawaan di halaman tetap dipakai.
(function () {
  var wadah = document.getElementById('daftarPrestasi');
  if (!wadah) return;

  /* ---------- tombol "Unduh foto" di tiap foto prestasi ---------- */
  function namaFile(src, judul) {
    var ext = ((src.split('?')[0].split('.').pop()) || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ext.length > 4) ext = 'jpg';
    var dasar = (judul || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
    return (dasar || 'foto-prestasi') + '.' + (ext || 'jpg');
  }

  function pasangUnduh(root) {
    root.querySelectorAll('.foto-prestasi').forEach(function (kotak) {
      if (kotak.querySelector('.unduh-prestasi')) return;
      var img = kotak.querySelector('img');
      if (!img || (img.complete && !img.naturalWidth)) return;   // foto belum ada: tidak perlu tombol

      var url = new URL(img.getAttribute('src'), location.href);
      var nama = namaFile(url.pathname, img.alt);
      var a = document.createElement('a');
      a.className = 'unduh-prestasi';
      a.textContent = 'Unduh foto';
      a.setAttribute('aria-label', 'Unduh foto ' + (img.alt || 'prestasi'));
      if (url.origin !== location.origin) {
        // foto di Supabase: ?download= membuat server mengirim file sebagai unduhan (jalan di HP & laptop)
        url.searchParams.set('download', nama);
      }
      a.href = url.href;
      a.download = nama;
      kotak.append(a);
      img.addEventListener('error', function () { a.remove(); });   // kalau fotonya ternyata gagal dimuat
    });
  }
  pasangUnduh(document);

  if (!window.supabase || !window.ADMIN_CFG) return;

  function inisial(nama) {
    var k = (nama || '').split(/\s+/).filter(Boolean);
    return k.length ? (k[0][0] + (k[1] ? k[1][0] : '')).toUpperCase() : '?';
  }

  function el(tag, kelas, teks) {
    var e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks != null) e.textContent = teks;
    return e;
  }

  function gambar(src, alt) {
    var img = document.createElement('img');
    img.src = src; img.alt = alt; img.loading = 'lazy';
    img.addEventListener('error', function () { img.remove(); });
    return img;
  }

  function bangun(p) {
    var sec = el('section', 'prestasi');
    sec.append(el('h2', '', p.judul));
    if (p.keterangan) sec.append(el('p', 'ket', p.keterangan));

    if (p.foto_url) {
      var fp = el('div', 'foto-prestasi');
      fp.append(el('span', '', 'Foto prestasi'), gambar(p.foto_url, p.judul));
      sec.append(fp);
    }

    var peserta = Array.isArray(p.peserta) ? p.peserta : [];
    if (peserta.length) {
      sec.append(el('h3', '', p.label_peserta || 'Yang berhasil'));
      var ul = el('ul', 'pemenang');
      peserta.forEach(function (s) {
        var li = document.createElement('li');
        var isi = document.createElement(s.no ? 'a' : 'div');
        if (s.no) {
          var nn = ('0' + s.no).slice(-2);
          isi.href = 'siswa/siswa-' + nn + '.html';
        }
        var foto = el('div', 'foto kecil');
        foto.append(el('span', '', inisial(s.nama)));
        if (s.no) foto.append(gambar('foto/siswa/' + ('0' + s.no).slice(-2) + '.jpg', 'Foto ' + s.nama));
        isi.append(foto, el('span', '', s.nama));
        li.append(isi);
        ul.append(li);
      });
      sec.append(ul);
    }
    return sec;
  }

  var db = supabase.createClient(window.ADMIN_CFG.url, window.ADMIN_CFG.key);
  db.from('prestasi').select('*')
    .order('urutan', { ascending: true }).order('id', { ascending: true })
    .then(function (r) {
      if (r.error || !r.data) return; // biarkan isi bawaan
      if (!r.data.length) {
        // Tabel masih kosong: tampilkan isi bawaan sampai admin mengimpor/menambah prestasi
        return;
      }
      wadah.replaceChildren.apply(wadah, r.data.map(bangun));
      pasangUnduh(wadah);
    });
})();
