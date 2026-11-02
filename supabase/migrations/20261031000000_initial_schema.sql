-- Hall Pass V1 schema.
-- Security model: clients get column-level grants only; every row is behind RLS; anything
-- touching two people (likes, matches, blocks, profile visibility) goes through
-- SECURITY DEFINER functions that re-check eligibility on the server.

create extension if not exists pgcrypto;

create type gender as enum ('woman', 'man', 'nonbinary');
create type orientation as enum ('straight','gay','lesbian','bisexual','queer','pansexual','asexual','prefer_not_to_say');
create type moderation_status as enum ('pending', 'approved', 'rejected');
create type like_target as enum ('photo', 'prompt', 'profile');
create type interaction_action as enum ('like', 'pass');
create type match_status as enum ('active', 'unmatched', 'blocked');
create type report_reason as enum ('fake_profile','inappropriate_content','harassment','scam_or_spam','underage','safety_concern','other');
create type report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');

-- Tables -------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 30),
  date_of_birth date not null check (date_of_birth <= (current_date - interval '18 years')),
  gender gender not null,
  orientation orientation not null,
  bio text check (char_length(bio) <= 300),
  broad_location text not null check (char_length(btrim(broad_location)) between 2 and 40),
  -- Coarse coordinates only (the app rounds to ~5 km before sending). Never returned to other users.
  coarse_lat numeric(5, 2) check (coarse_lat between -90 and 90),
  coarse_lng numeric(5, 2) check (coarse_lng between -180 and 180),
  show_distance boolean not null default true,
  is_active boolean not null default true,
  moderation_status moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  storage_path text not null,
  display_order smallint not null check (display_order between 0 and 5),
  -- Post-moderation for the test build: photos show immediately and reports can reject them.
  -- Change the default to 'pending' to require approval before others see a photo.
  moderation_status moderation_status not null default 'approved',
  created_at timestamptz not null default now(),
  unique (user_id, display_order) deferrable initially deferred
);

create table profile_prompts (
  id text primary key,
  prompt_text text not null unique,
  is_active boolean not null default true
);

create table profile_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  prompt_id text not null references profile_prompts (id),
  answer_text text not null check (char_length(btrim(answer_text)) between 2 and 160),
  display_order smallint not null check (display_order between 0 and 2),
  unique (user_id, prompt_id) deferrable initially deferred,
  unique (user_id, display_order) deferrable initially deferred
);

create table preferences (
  user_id uuid primary key references profiles (id) on delete cascade,
  interested_in gender[] not null check (cardinality(interested_in) > 0),
  min_age smallint not null check (min_age >= 18),
  max_age smallint not null check (max_age <= 99 and max_age >= min_age),
  max_distance_km smallint check (max_distance_km between 1 and 300),
  updated_at timestamptz not null default now()
);

create table interactions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references profiles (id) on delete cascade,
  target_user_id uuid not null references profiles (id) on delete cascade,
  target_item_type like_target not null default 'profile',
  target_item_id uuid,
  action interaction_action not null,
  comment_text text check (char_length(comment_text) <= 140),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  check (actor_user_id <> target_user_id),
  check (action = 'like' or comment_text is null),
  unique (actor_user_id, target_user_id)
);
create index interactions_inbox on interactions (target_user_id, created_at desc) where action = 'like' and not resolved;

create table matches (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references profiles (id) on delete cascade,
  user_b_id uuid not null references profiles (id) on delete cascade,
  status match_status not null default 'active',
  created_at timestamptz not null default now(),
  check (user_a_id < user_b_id),
  unique (user_a_id, user_b_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  sender_user_id uuid not null references profiles (id) on delete cascade,
  client_id text not null check (char_length(client_id) <= 64),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  moderation_status moderation_status not null default 'approved',
  created_at timestamptz not null default now(),
  unique (sender_user_id, client_id)
);
create index messages_by_match on messages (match_id, created_at);

create table blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references profiles (id) on delete cascade,
  blocked_user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (blocker_user_id <> blocked_user_id),
  unique (blocker_user_id, blocked_user_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references profiles (id) on delete set null,
  reported_user_id uuid not null references profiles (id) on delete cascade,
  message_id uuid references messages (id) on delete set null,
  reason report_reason not null,
  details text check (char_length(details) <= 500),
  status report_status not null default 'open',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Every write the MCP server makes on a user's behalf is recorded here.
create table mcp_audit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  tool text not null,
  outcome text not null check (outcome in ('ok', 'denied', 'error')),
  detail jsonb,
  created_at timestamptz not null default now()
);

-- Reference data -----------------------------------------------------------

insert into profile_prompts (id, prompt_text) values
  ('p01', 'A perfect slow morning includes'),
  ('p02', 'The most underrated thing about where I live'),
  ('p03', 'Something I could talk about for an hour'),
  ('p04', 'You’ll win me over if you'),
  ('p05', 'If I’m planning our first date, we’re going to'),
  ('p06', 'My friends call me when they need'),
  ('p07', 'Currently obsessed with'),
  ('p08', 'The best advice I’ve ignored'),
  ('p09', 'Something I’m quietly getting better at'),
  ('p10', 'It’s a good sign if you also'),
  ('p11', 'Ask me about'),
  ('p12', 'My comfort meal, no substitutions'),
  ('p13', 'Give me a free afternoon and I’ll'),
  ('p14', 'A tradition I want to keep going'),
  ('p15', 'The smallest thing that makes my week'),
  ('p16', 'I changed my mind about');

-- Helpers ------------------------------------------------------------------

create function distance_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric) returns int
language sql immutable as $$
  select case when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null else
    round(6371 * 2 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    )))::int end;
$$;

create function is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_user_id = a and blocked_user_id = b) or (blocker_user_id = b and blocked_user_id = a)
  );
$$;

create function is_mutually_eligible(viewer uuid, target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from profiles me join preferences mp on mp.user_id = me.id,
         profiles them join preferences tp on tp.user_id = them.id
    where me.id = viewer and them.id = target and me.id <> them.id
      and them.is_active and them.moderation_status <> 'rejected'
      and them.gender = any (mp.interested_in) and me.gender = any (tp.interested_in)
      and date_part('year', age(them.date_of_birth)) between mp.min_age and mp.max_age
      and date_part('year', age(me.date_of_birth)) between tp.min_age and tp.max_age
      and (mp.max_distance_km is null
           or distance_km(me.coarse_lat, me.coarse_lng, them.coarse_lat, them.coarse_lng) is null
           or distance_km(me.coarse_lat, me.coarse_lng, them.coarse_lat, them.coarse_lng) <= mp.max_distance_km)
  );
$$;

/** Who may see whose profile: yourself, your matches, people who liked you, and eligible suggestions. */
create function can_view_profile(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select target = auth.uid() or (
    auth.uid() is not null and not is_blocked_between(auth.uid(), target) and (
      exists (select 1 from matches m where m.user_a_id = least(auth.uid(), target) and m.user_b_id = greatest(auth.uid(), target))
      or exists (select 1 from interactions i where i.actor_user_id = target and i.target_user_id = auth.uid() and i.action = 'like')
      or is_mutually_eligible(auth.uid(), target)
    )
  );
$$;

create function is_match_participant(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches where id = m and auth.uid() in (user_a_id, user_b_id));
$$;

-- Privileges ---------------------------------------------------------------

alter table profiles enable row level security;
alter table profile_photos enable row level security;
alter table profile_prompts enable row level security;
alter table profile_answers enable row level security;
alter table preferences enable row level security;
alter table interactions enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;
alter table mcp_audit_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;

grant select on profiles to authenticated;
grant update (first_name, gender, orientation, bio, broad_location, coarse_lat, coarse_lng, show_distance, is_active, updated_at) on profiles to authenticated;
grant select, delete on profile_photos to authenticated;
grant insert (user_id, storage_path, display_order) on profile_photos to authenticated;
grant select on profile_prompts to authenticated;
grant select on profile_answers to authenticated;
grant select, update on preferences to authenticated;
grant select on interactions to authenticated;
grant select on matches to authenticated;
grant select on messages to authenticated;
grant insert (match_id, sender_user_id, client_id, body) on messages to authenticated;
grant select on blocks to authenticated;
grant insert (reporter_user_id, reported_user_id, message_id, reason, details) on reports to authenticated;
grant select on reports to authenticated;
grant select on mcp_audit_log to authenticated;
grant insert (tool, outcome, detail) on mcp_audit_log to authenticated;

-- Own rows only. Other people's profiles are read through get_public_profiles(), which omits
-- date of birth and coordinates.
create policy "own profile" on profiles for select using (id = auth.uid());
create policy "own profile update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "own photos" on profile_photos for select using (user_id = auth.uid());
create policy "viewable photos" on profile_photos for select using (moderation_status = 'approved' and can_view_profile(user_id));
create policy "add own photos" on profile_photos for insert with check (user_id = auth.uid());
create policy "remove own photos" on profile_photos for delete using (user_id = auth.uid());

create policy "prompts" on profile_prompts for select using (is_active);

create policy "viewable answers" on profile_answers for select using (can_view_profile(user_id));

create policy "own preferences" on preferences for select using (user_id = auth.uid());
create policy "own preferences update" on preferences for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own and received interactions" on interactions for select using (
  actor_user_id = auth.uid()
  or (target_user_id = auth.uid() and action = 'like' and not is_blocked_between(auth.uid(), actor_user_id))
);

create policy "own matches" on matches for select using (auth.uid() in (user_a_id, user_b_id));

create policy "read own conversations" on messages for select using (is_match_participant(match_id));
create policy "send to active matches" on messages for insert with check (
  sender_user_id = auth.uid()
  and exists (
    select 1 from matches m
    where m.id = match_id and m.status = 'active' and auth.uid() in (m.user_a_id, m.user_b_id)
      and not is_blocked_between(m.user_a_id, m.user_b_id)
  )
);

create policy "own blocks" on blocks for select using (blocker_user_id = auth.uid());
create policy "file reports" on reports for insert with check (reporter_user_id = auth.uid());
create policy "own reports" on reports for select using (reporter_user_id = auth.uid());
create policy "own audit log" on mcp_audit_log for select using (user_id = auth.uid());
create policy "write own audit log" on mcp_audit_log for insert with check (user_id = auth.uid());

-- Public profile data ----------------------------------------------------------

create function get_public_profiles(ids uuid[])
returns table (id uuid, first_name text, age int, gender gender, bio text, broad_location text, distance_km int)
language sql stable security definer set search_path = public as $$
  select p.id, p.first_name, date_part('year', age(p.date_of_birth))::int, p.gender, p.bio, p.broad_location,
         case when p.show_distance then distance_km(me.coarse_lat, me.coarse_lng, p.coarse_lat, p.coarse_lng) end
  from profiles p
  left join profiles me on me.id = auth.uid()
  where p.id = any (ids) and p.id <> auth.uid() and can_view_profile(p.id);
$$;

create function suggested_profiles(page_size int default 10, after_id uuid default null)
returns table (id uuid, first_name text, age int, gender gender, bio text, broad_location text, distance_km int)
language sql stable security definer set search_path = public as $$
  select p.id, p.first_name, date_part('year', age(p.date_of_birth))::int, p.gender, p.bio, p.broad_location,
         case when p.show_distance then distance_km(me.coarse_lat, me.coarse_lng, p.coarse_lat, p.coarse_lng) end
  from profiles p
  join profiles me on me.id = auth.uid()
  where p.id <> me.id
    and is_mutually_eligible(me.id, p.id)
    and not is_blocked_between(me.id, p.id)
    and not exists (select 1 from interactions i where i.actor_user_id = me.id and i.target_user_id = p.id)
    and not exists (select 1 from matches m where m.user_a_id = least(me.id, p.id) and m.user_b_id = greatest(me.id, p.id))
    and (after_id is null or p.id > after_id)
  order by p.id
  limit least(greatest(page_size, 1), 25);
$$;

-- Profile writes ---------------------------------------------------------------

create function create_my_profile(profile jsonb, prefs jsonb, answers jsonb, photo_paths text[])
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  i int;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if coalesce(array_length(photo_paths, 1), 0) < 2 or array_length(photo_paths, 1) > 6 then raise exception 'add 2 to 6 photos'; end if;
  if jsonb_array_length(answers) <> 3 then raise exception 'answer 3 prompts'; end if;
  for i in 1 .. array_length(photo_paths, 1) loop
    if split_part(photo_paths[i], '/', 1) <> me::text then raise exception 'invalid photo path'; end if;
  end loop;

  insert into profiles (id, first_name, date_of_birth, gender, orientation, broad_location, bio, coarse_lat, coarse_lng)
  values (me, btrim(profile->>'first_name'), (profile->>'date_of_birth')::date, (profile->>'gender')::gender,
          (profile->>'orientation')::orientation, btrim(profile->>'broad_location'), nullif(btrim(profile->>'bio'), ''),
          round((profile->>'coarse_lat')::numeric, 2), round((profile->>'coarse_lng')::numeric, 2));

  insert into preferences (user_id, interested_in, min_age, max_age, max_distance_km)
  values (me, array(select jsonb_array_elements_text(prefs->'interested_in'))::gender[],
          (prefs->>'min_age')::smallint, (prefs->>'max_age')::smallint, (prefs->>'max_distance_km')::smallint);

  insert into profile_answers (user_id, prompt_id, answer_text, display_order)
  select me, a->>'prompt_id', btrim(a->>'answer'), (ord - 1)::smallint
  from jsonb_array_elements(answers) with ordinality as t(a, ord);

  insert into profile_photos (user_id, storage_path, display_order)
  select me, path, (ord - 1)::smallint from unnest(photo_paths) with ordinality as t(path, ord);
end;
$$;

create function save_my_answers(answers jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if jsonb_array_length(answers) <> 3 then raise exception 'keep 3 prompts on your profile'; end if;
  delete from profile_answers where user_id = auth.uid();
  insert into profile_answers (user_id, prompt_id, answer_text, display_order)
  select auth.uid(), a->>'prompt_id', btrim(a->>'answer'), (ord - 1)::smallint
  from jsonb_array_elements(answers) with ordinality as t(a, ord);
end;
$$;

create function reorder_my_photos(photo_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from profile_photos where user_id = auth.uid()) <> array_length(photo_ids, 1)
     or exists (select 1 from unnest(photo_ids) pid where not exists (select 1 from profile_photos where id = pid and user_id = auth.uid())) then
    raise exception 'photo order is out of date';
  end if;
  update profile_photos p set display_order = (t.ord - 1)
  from unnest(photo_ids) with ordinality as t(pid, ord)
  where p.id = t.pid and p.user_id = auth.uid();
end;
$$;

create function update_my_preferences(prefs jsonb) returns void
language sql security definer set search_path = public as $$
  update preferences set
    interested_in = array(select jsonb_array_elements_text(prefs->'interested_in'))::gender[],
    min_age = (prefs->>'min_age')::smallint,
    max_age = (prefs->>'max_age')::smallint,
    max_distance_km = (prefs->>'max_distance_km')::smallint,
    updated_at = now()
  where user_id = auth.uid();
$$;

-- Interactions -----------------------------------------------------------------

create function like_profile_item(target uuid, item_type like_target, item_id uuid, comment text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  their_like interactions;
  new_match uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not can_view_profile(target) or target = me then raise exception 'profile unavailable'; end if;
  if item_type = 'photo' and not exists (select 1 from profile_photos where id = item_id and user_id = target) then
    raise exception 'photo not found';
  elsif item_type = 'prompt' and not exists (select 1 from profile_answers where id = item_id and user_id = target) then
    raise exception 'prompt not found';
  end if;

  insert into interactions (actor_user_id, target_user_id, target_item_type, target_item_id, action, comment_text)
  values (me, target, item_type, case when item_type = 'profile' then null else item_id end, 'like', nullif(btrim(comment), ''));

  select * into their_like from interactions
  where actor_user_id = target and target_user_id = me and action = 'like' and not resolved
  for update;

  if found then
    update interactions set resolved = true where id = their_like.id;
    insert into matches (user_a_id, user_b_id) values (least(me, target), greatest(me, target))
    on conflict (user_a_id, user_b_id) do update set status = 'active'
    returning id into new_match;
  end if;
  return new_match;
end;
$$;

create function respond_to_like(like_id uuid, accept boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  l interactions;
  new_match uuid;
begin
  select * into l from interactions where id = like_id and target_user_id = me and action = 'like' and not resolved for update;
  if not found or is_blocked_between(me, l.actor_user_id) then raise exception 'like not available'; end if;
  update interactions set resolved = true where id = like_id;
  insert into interactions (actor_user_id, target_user_id, action, resolved)
  values (me, l.actor_user_id, case when accept then 'like'::interaction_action else 'pass' end, true)
  on conflict (actor_user_id, target_user_id) do nothing;
  if accept then
    insert into matches (user_a_id, user_b_id) values (least(me, l.actor_user_id), greatest(me, l.actor_user_id))
    on conflict (user_a_id, user_b_id) do update set status = 'active'
    returning id into new_match;
  end if;
  return new_match;
end;
$$;

create function pass_profile(target uuid) returns void
language sql security definer set search_path = public as $$
  insert into interactions (actor_user_id, target_user_id, action, resolved)
  values (auth.uid(), target, 'pass', true)
  on conflict (actor_user_id, target_user_id) do nothing;
$$;

create function undo_pass(target uuid) returns void
language sql security definer set search_path = public as $$
  delete from interactions where actor_user_id = auth.uid() and target_user_id = target and action = 'pass';
$$;

create function block_user(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if target = auth.uid() then raise exception 'cannot block yourself'; end if;
  insert into blocks (blocker_user_id, blocked_user_id) values (auth.uid(), target) on conflict do nothing;
  update matches set status = 'blocked'
  where user_a_id = least(auth.uid(), target) and user_b_id = greatest(auth.uid(), target);
  update interactions set resolved = true where actor_user_id = target and target_user_id = auth.uid();
end;
$$;

create function unmatch(m uuid) returns void
language sql security definer set search_path = public as $$
  update matches set status = 'unmatched' where id = m and auth.uid() in (user_a_id, user_b_id);
$$;

-- Removes the auth user; profiles and everything that references them cascade.
-- The app deletes the user's storage objects through the Storage API first.
create function delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  get_public_profiles(uuid[]), suggested_profiles(int, uuid), create_my_profile(jsonb, jsonb, jsonb, text[]),
  save_my_answers(jsonb), reorder_my_photos(uuid[]), update_my_preferences(jsonb),
  like_profile_item(uuid, like_target, uuid, text), respond_to_like(uuid, boolean), pass_profile(uuid),
  undo_pass(uuid), block_user(uuid), unmatch(uuid), delete_my_account()
to authenticated;
-- RLS policies call these helpers as the requesting user.
grant execute on function is_blocked_between(uuid, uuid), is_mutually_eligible(uuid, uuid), can_view_profile(uuid),
  is_match_participant(uuid), distance_km(numeric, numeric, numeric, numeric) to authenticated;

-- Realtime: new messages are pushed to participants (RLS still applies).
alter publication supabase_realtime add table messages;

-- Photo storage --------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "view permitted photos" on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos' and public.can_view_profile(((storage.foldername(name))[1])::uuid));
