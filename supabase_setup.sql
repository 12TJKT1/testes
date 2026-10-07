-- Jalankan SEKALI di SETIAP project Supabase (project album 1, album 2, album 3).
-- Supabase: SQL Editor > New query > tempel > Run.
-- Tiap project hanya menyimpan fotonya sendiri, jadi tidak perlu kolom album.

-- 1. Tabel (dilewati kalau sudah ada, foto lama tidak hilang)
create table if not exists public.memori (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  image_url text not null,
  caption text
);

-- 2. Izin tabel: semua orang boleh melihat dan menambah (tidak boleh ubah/hapus)
alter table public.memori enable row level security;
drop policy if exists "baca memori" on public.memori;
drop policy if exists "tambah memori" on public.memori;
create policy "baca memori"   on public.memori for select to anon, authenticated using (true);
create policy "tambah memori" on public.memori for insert to anon with check (true);

-- 3. Bucket foto (Public). Ganti 'memori-fot' kalau kamu memakai nama lain,
--    dan samakan dengan "bucket" di js/foto.js
insert into storage.buckets (id, name, public)
values ('memori-fot', 'memori-fot', true)
on conflict (id) do update set public = true;

-- 4. Izin storage
drop policy if exists "baca foto" on storage.objects;
drop policy if exists "upload foto" on storage.objects;
create policy "baca foto" on storage.objects for select to anon, authenticated
  using (bucket_id = 'memori-fot');
create policy "upload foto" on storage.objects for insert to anon
  with check (bucket_id = 'memori-fot');
