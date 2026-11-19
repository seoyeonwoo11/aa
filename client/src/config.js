// Supabase 연결 정보
// publishable(anon) 키는 브라우저에 공개되도록 만들어진 키라 코드에 넣어도 된다.
// 데이터는 데이터베이스의 행 단위 보안(RLS, supabase/schema.sql)으로 사용자마다 막혀 있다.
// ⚠️ service_role / secret 키는 절대 여기에 넣지 말 것.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sevriwawtgcbacifiqdg.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_rdnzb61Iwnzrs1CEiMKD0Q_FqmSs7Zz';
