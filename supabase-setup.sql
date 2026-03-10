-- 画圆大作战 - 全网排名表（在 Supabase SQL Editor 中执行）

-- 创建排名表
create table if not exists public.rankings (
  id uuid primary key default gen_random_uuid(),
  player_name text not null default '匿名',
  score int not null check (score >= 0 and score <= 100),
  created_at timestamptz not null default now()
);

-- 创建索引便于按分数排序查询
create index if not exists idx_rankings_score_desc on public.rankings (score desc);

-- 启用 RLS
alter table public.rankings enable row level security;

-- 策略：所有人可读（查看排名）
create policy "允许所有人读取排名"
  on public.rankings for select
  using (true);

-- 策略：所有人可插入（提交分数，匿名即可）
create policy "允许所有人提交分数"
  on public.rankings for insert
  with check (true);

comment on table public.rankings is '画圆大作战全网排名';

-- 重置排名：存管理员密码，仅用于清空排名 RPC 校验
create table if not exists public.app_config (
  key text primary key,
  value text not null
);
insert into public.app_config (key, value) values ('reset_secret', 'circle2025')
  on conflict (key) do nothing;

-- 仅允许通过 RPC 校验密码后清空，不开放表给 anon
alter table public.app_config enable row level security;
create policy "禁止直接访问" on public.app_config for all using (false);

-- RPC：校验密码后清空排名（SECURITY DEFINER 以读取 app_config）
create or replace function public.reset_rankings(secret text)
returns jsonb language plpgsql security definer
as $$
declare
  stored text;
begin
  select value into stored from public.app_config where key = 'reset_secret';
  if stored is null or stored <> secret then
    return jsonb_build_object('ok', false, 'error', '密码错误');
  end if;
  truncate public.rankings;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.reset_rankings(text) to anon;
comment on function public.reset_rankings(text) is '管理员密码正确时清空 rankings 表';
