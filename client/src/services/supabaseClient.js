import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // 가입 확인 메일을 다른 기기에서 열어도 로그인되도록 implicit 방식 사용
    flowType: 'implicit'
  }
});
