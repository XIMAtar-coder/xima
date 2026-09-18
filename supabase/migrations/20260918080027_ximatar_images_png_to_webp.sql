-- public/ximatars/*.png were converted to .webp on 2026-09-05 (audit X-19) but
-- stored paths and two functions still pointed at .png, so every XIMAtar image
-- read from the database 404'd.
update public.ximatars
   set image_url = regexp_replace(image_url, '(/ximatars/[^/]+)\.png$', '\1.webp')
 where image_url ~ '/ximatars/[^/]+\.png$';

update public.profiles
   set ximatar_image = regexp_replace(ximatar_image, '(/ximatars/[^/]+)\.png$', '\1.webp')
 where ximatar_image ~ '/ximatars/[^/]+\.png$';

do $$
declare f record;
begin
  for f in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f' and p.prosrc like '%ximatars/%png%'
  loop
    execute regexp_replace(pg_get_functiondef(f.oid), '(/ximatars/[^''"[:space:]]*?)\.png', '\1.webp', 'g');
  end loop;
end
$$;
