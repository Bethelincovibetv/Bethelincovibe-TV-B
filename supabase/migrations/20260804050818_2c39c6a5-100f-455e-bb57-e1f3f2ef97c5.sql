insert into public.site_settings(key, value) values ('directory_listing_style','business')
on conflict (key) do update set value = excluded.value;