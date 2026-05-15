import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    if (session?.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('status')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.status !== 'approved') {
        return NextResponse.redirect(`${origin}/login`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/talents`)
}
