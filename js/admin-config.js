// Pengaturan Supabase untuk halaman admin & halaman prestasi.
// Anon key memang boleh publik; keamanan dijaga oleh aturan (RLS) di SQL.
window.ADMIN_CFG = {
  // Project ALBUM 1 (Family + prestasi) - tempat login admin utama
  url: 'https://zebcqneisaldzmfoqeoq.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplYmNxbmVpc2FsZHptZm9xZW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NjAzMDgsImV4cCI6MjEwNjUzNjMwOH0.SvjK-yYiXrHVz65m9nbFJsLnejky6k5XOIjnTq5QrAE',
  bucketFoto: 'memori-fot',        // bucket foto album Family
  bucketPrestasi: 'prestasi-foto', // bucket foto prestasi

  // Album Random: samakan dengan ALBUM_SUPABASE di js/foto.js.
  // Album yang masih berisi ISI_... dianggap belum dihubungkan.
  albums: {
    2: {
      nama: 'Random 1',
      url: 'https://obffgmulzqtxziopcbiq.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iZmZnbXVsenF0eHppb3BjYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjg4NTAsImV4cCI6MjEwNjYwNDg1MH0.GEMzcXAiDj6biPaX6CnXYIPVt96aGEpJc13czEja8sc',
      bucket: 'memori-fot', tabel: 'memori'
    },
    3: { nama: 'Random 2', url: 'https://akbgtueilsawqlvmwnvp.supabase.co', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYmd0dWVpbHNhd3Fsdm13bnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzODUzMDksImV4cCI6MjEwNjk2MTMwOX0.f7Tu_rBOE6MRPonf5TX6EijyN8FmBNsBjoWQJPOGvAY', bucket: 'memori-fot', tabel: 'memori' },
    4: { nama: 'Random 3', url: 'https://ryaeqvoarflmesspkmwd.supabase.co', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5YWVxdm9hcmZsbWVzc3BrbXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzODcwNTYsImV4cCI6MjEwNjk2MzA1Nn0.iuIjFnx5nFvVkrhhbvIlP6l4CWx_OcdvuVOE43ZoScw', bucket: 'memori-fot', tabel: 'memori' }
  }
};
