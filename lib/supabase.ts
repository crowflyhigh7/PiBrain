import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl && typeof window === 'undefined') {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL 환경 변수가 설정되지 않았습니다.');
}

// 브라우저 및 일반 읽기용 클라이언트
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

// 서버 사이드 전용 클라이언트 (Service Role Key로 RLS 우회 및 관리자 작업 가능)
export function getServiceSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL 또는 Service Role Key가 설정되지 않았습니다. .env.local을 확인해주세요.');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
