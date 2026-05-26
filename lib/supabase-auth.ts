import { supabase } from './supabase'

export type UserProfile = {
  id: string
  email: string
  name: string
  avatar_url: string
  role: 'super_admin' | 'admin' | 'user' | 'company_admin' | 'employee'
  status: 'pending' | 'approved' | 'rejected'
  company_name: string | null
  contact_name: string | null
  company_id: string | null
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export async function signOut() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('vtm:profile')
  }
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getUserProfile(userId: string, skipCache = false): Promise<UserProfile | null> {
  // 캐시 확인
  if (!skipCache && typeof window !== 'undefined') {
    const cached = sessionStorage.getItem('vtm:profile')
    if (cached) {
      const parsed = JSON.parse(cached) as UserProfile
      if (parsed.id === userId) return parsed
    }
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null

  const profile = data as UserProfile

  // 캐시 저장
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('vtm:profile', JSON.stringify(profile))
  }

  return profile
}
