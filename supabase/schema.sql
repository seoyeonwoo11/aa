-- 하루수능 데이터베이스 설정
-- Supabase 대시보드 → SQL Editor에 통째로 붙여 넣고 Run 하세요. 여러 번 실행해도 안전합니다.

-- 사용자별 데이터: 설정(settings), 공부 기록(study), 계획(plans)을 종류마다 한 줄씩 JSON으로 저장
create table if not exists public.user_data (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('settings', 'study', 'plans')),
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

-- 행 단위 보안(RLS): 로그인한 사용자는 자기 데이터만 읽고 쓸 수 있다
alter table public.user_data enable row level security;

drop policy if exists "user_data: 본인 읽기" on public.user_data;
drop policy if exists "user_data: 본인 추가" on public.user_data;
drop policy if exists "user_data: 본인 수정" on public.user_data;
drop policy if exists "user_data: 본인 삭제" on public.user_data;

create policy "user_data: 본인 읽기" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_data: 본인 추가" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_data: 본인 수정" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_data: 본인 삭제" on public.user_data
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 로그인하지 않은 사용자(anon)는 접근 불가, 로그인한 사용자만 API로 접근
revoke all on public.user_data from anon;
grant select, insert, update, delete on public.user_data to authenticated;
