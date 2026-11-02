-- DEMO DATA ONLY. Synthetic people so Discover, Likes and chat can be tried on a fresh project.
-- These accounts have no password and cannot sign in.
-- Remove before real users join:  select remove_demo_data();

create table if not exists demo_accounts (
  user_id uuid primary key references profiles (id) on delete cascade,
  likes_back boolean not null default false,
  like_comment text,
  replies text[] not null default '{}'
);
alter table demo_accounts enable row level security;
revoke all on demo_accounts from anon, authenticated;

do $$
declare
  d record;
  uid uuid;
  i int;
begin
  for d in
    select * from (values
      ('amara',  'Amara',  date '1996-04-12', 'woman'::gender,     'straight'::orientation,  array['man']::gender[],                       'Riverside',          4, true,  'Okay, your answer made me laugh out loud.',          array['Hi! I was hoping you’d say something', 'What are you up to this weekend?'],
        array[['p01','Black coffee, the crossword in pen, and absolutely no alarms.'],['p05','Find the smallest bookshop in the city and each buy the other a book under ten pounds.'],['p16','Running. I used to hate it, now I sign up for 10ks.']]),
      ('jonah',  'Jonah',  date '1993-09-03', 'man',               'bisexual',               array['woman','man','nonbinary']::gender[],  'Old Town',           3, false, null, array['Hey hey. Good to match!'],
        array[['p07','Fermenting things. My kitchen currently has three jars of something.'],['p11','The time I accidentally joined a choir.'],['p12','Dal, rice, a fried egg on top.']]),
      ('lena',   'Lena',   date '1998-01-22', 'woman',             'bisexual',               array['woman','man','nonbinary']::gender[],  'Harbour District',   4, true,  'Your photo looks like a film still.',                 array['Hello! Thanks for the like.', 'What’s the best bench you know? This is important.'],
        array[['p03','Why every city should have more benches. I have opinions.'],['p10','Read the plaque on every statue you walk past.'],['p13','Rent a rowing boat and pretend I know what I’m doing.']]),
      ('theo',   'Theo',   date '1991-06-30', 'man',               'straight',               array['woman']::gender[],                     'Northfield',         3, false, null, array['Hi there!'],
        array[['p06','Someone to drive the van on moving day.'],['p08','“Don’t buy a project motorbike.” It’s in pieces in my garage.'],['p14','Sunday roast for whoever turns up.']]),
      ('river',  'River',  date '1997-11-08', 'nonbinary',         'queer',                  array['woman','man','nonbinary']::gender[],  'Canal Quarter',      3, true,  'I need to know your font opinion, it’s only fair.',   array['Hi! Font opinions first, then everything else.'],
        array[['p09','Ceramics. My bowls are no longer technically plates.'],['p02','The 24-hour bakery that nobody believes exists.'],['p04','Have a strong opinion about a font.']]),
      ('sofia',  'Sofia',  date '1994-02-17', 'woman',             'lesbian',                array['woman','nonbinary']::gender[],        'Westgate',           4, false, null, array['Hi! Nice to meet you here.'],
        array[['p15','When the bus driver waits for me even though I’m clearly late.'],['p05','The late opening at the science museum, arguing about dinosaurs.'],['p07','Learning every word to one very long folk song.']]),
      ('marcus', 'Marcus', date '1990-08-14', 'man',               'gay',                    array['man']::gender[],                       'Riverside',          3, true,  'A picnic absolutely counts as dinner.',               array['Hey! Great to match.'],
        array[['p13','Walk until I find a café I’ve never tried.'],['p03','Architecture of train stations. Yes, really.'],['p10','Think a picnic counts as dinner.']]),
      ('priya',  'Priya',  date '1995-05-05', 'woman',             'straight',               array['man']::gender[],                       'Eastbank',           4, false, null, array['Hi! How’s your week going?'],
        array[['p12','My grandmother’s rajma. I still can’t match it.'],['p11','Climbing — badly, but enthusiastically.'],['p08','“Sleep on it.” I never sleep on it.']]),
      ('ezra',   'Ezra',   date '1999-03-19', 'man',               'pansexual',              array['woman','man','nonbinary']::gender[],  'University Quarter', 3, true,  'Sending you a song if this works out. Fair warning.',  array['Hi! The song offer stands.'],
        array[['p01','Making pancakes badly and eating them anyway.'],['p16','Pineapple on pizza. I was wrong. I apologise.'],['p04','Send me a song you think I’ve never heard.']]),
      ('noor',   'Noor',   date '1992-12-01', 'woman',             'bisexual',               array['man','woman','nonbinary']::gender[],  'Hillcrest',          3, false, null, array['Hello! I’m glad you said hi.'],
        array[['p14','A New Year’s Day swim, however cold it is.'],['p06','An honest opinion on a haircut.'],['p02','The view from the top of the car park. Trust me.']]),
      ('sam',    'Sam',    date '1996-07-27', 'nonbinary',         'pansexual',              array['woman','man','nonbinary']::gender[],  'Old Town',           3, false, null, array['Hi! Up for a game sometime?'],
        array[['p07','Board games with absurdly long rulebooks.'],['p15','A properly sharpened pencil.'],['p05','Mini golf. I will be unbearably competitive.']]),
      ('daniel', 'Daniel', date '1989-10-10', 'man',               'straight',               array['woman']::gender[],                     'Harbour District',   4, true,  'Fellow cloud enthusiast? Tell me your favourite type.', array['Hi! Nice to match with you.'],
        array[['p09','Patience. Ask me again after I’ve finished this jigsaw.'],['p13','Fix a bike, then ride it somewhere with a view.'],['p03','Weather. Clouds especially.']])
    ) as t(slug, first_name, dob, g, o, interested, area, photo_count, likes_back, like_comment, replies, answers)
  loop
    uid := md5('hallpass-demo-' || d.slug)::uuid;
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', d.slug || '@demo.hallpass.invalid', '',
            now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"demo":true}', '', '', '', '')
    on conflict (id) do nothing;

    insert into profiles (id, first_name, date_of_birth, gender, orientation, broad_location, moderation_status)
    values (uid, d.first_name, d.dob, d.g, d.o, d.area, 'approved') on conflict (id) do nothing;
    insert into preferences (user_id, interested_in, min_age, max_age) values (uid, d.interested, 18, 60) on conflict (user_id) do nothing;
    insert into demo_accounts (user_id, likes_back, like_comment, replies) values (uid, d.likes_back, d.like_comment, d.replies)
      on conflict (user_id) do nothing;

    if not exists (select 1 from profile_photos where user_id = uid) then
      for i in 0 .. d.photo_count - 1 loop
        insert into profile_photos (user_id, storage_path, display_order)
        values (uid, 'https://picsum.photos/seed/hallpass-s-' || d.slug || '-' || i || '/720/900', i);
      end loop;
      for i in 1 .. 3 loop
        insert into profile_answers (user_id, prompt_id, answer_text, display_order)
        values (uid, d.answers[i][1], d.answers[i][2], i - 1);
      end loop;
    end if;
  end loop;
end $$;

-- A few demo people like each new member, so the Likes inbox has something in it.
create or replace function demo_seed_incoming_likes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from demo_accounts where user_id = new.user_id) then return new; end if;
  insert into interactions (actor_user_id, target_user_id, action, comment_text, created_at)
  select d.user_id, new.user_id, 'like', d.like_comment, now() - (row_number() over () * interval '47 minutes')
  from demo_accounts d
  where d.like_comment is not null and is_mutually_eligible(new.user_id, d.user_id)
  limit 3
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists demo_seed_incoming_likes on preferences;
create trigger demo_seed_incoming_likes after insert on preferences for each row execute function demo_seed_incoming_likes();

-- Some demo people like you back straight away, so a like from Discover can become a match.
create or replace function demo_like_back() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.action = 'like' and exists (select 1 from demo_accounts where user_id = new.target_user_id and likes_back) then
    insert into interactions (actor_user_id, target_user_id, action)
    values (new.target_user_id, new.actor_user_id, 'like')
    on conflict (actor_user_id, target_user_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists demo_like_back on interactions;
create trigger demo_like_back after insert on interactions for each row execute function demo_like_back();

-- Demo people reply to your first messages.
create or replace function demo_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m matches;
  other uuid;
  sent int;
  reply text;
begin
  select * into m from matches where id = new.match_id;
  other := case when m.user_a_id = new.sender_user_id then m.user_b_id else m.user_a_id end;
  if not exists (select 1 from demo_accounts where user_id = other) or m.status <> 'active' then return new; end if;
  select count(*) into sent from messages where match_id = new.match_id and sender_user_id = other;
  select replies[sent + 1] into reply from demo_accounts where user_id = other;
  if reply is not null then
    insert into messages (match_id, sender_user_id, client_id, body, created_at)
    values (new.match_id, other, 'demo-' || gen_random_uuid(), reply, now() + interval '2 seconds');
  end if;
  return new;
end;
$$;
drop trigger if exists demo_reply on messages;
create trigger demo_reply after insert on messages for each row execute function demo_reply();

create or replace function remove_demo_data() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  drop trigger if exists demo_seed_incoming_likes on preferences;
  drop trigger if exists demo_like_back on interactions;
  drop trigger if exists demo_reply on messages;
  delete from auth.users where email like '%@demo.hallpass.invalid';
  drop table if exists demo_accounts;
end;
$$;
revoke execute on function remove_demo_data() from public, anon, authenticated;
revoke execute on function demo_seed_incoming_likes(), demo_like_back(), demo_reply() from public, anon, authenticated;
