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
        .select('status, role, email, company_id')
        .eq('id', session.user.id)
        .single()

      // 초대 자동 매칭: 아직 기업 미배정 + pending invite 있는 경우
      if (profile && !profile.company_id) {
        const { data: invite } = await supabase
          .from('company_invites')
          .select('company_id, role')
          .eq('email', profile.email)
          .eq('status', 'pending')
          .limit(1)
          .single()

        if (invite) {
          await supabase
            .from('user_profiles')
            .update({
              company_id: invite.company_id,
              role: invite.role,
              status: 'approved',
              updated_at: new Date().toISOString(),
            })
            .eq('id', session.user.id)

          await supabase
            .from('company_invites')
            .update({ status: 'accepted' })
            .eq('email', profile.email)
            .eq('company_id', invite.company_id)

          // 배정된 role로 리다이렉트
          if (invite.role === 'company_admin') {
            return NextResponse.redirect(`${origin}/manage`)
          }
          return NextResponse.redirect(`${origin}/work`)
        }
      }

      if (!profile || profile.status !== 'approved') {
        return NextResponse.redirect(`${origin}/login`)
      }

      // role별 리다이렉트
      if (profile.role === 'company_admin') {
        return NextResponse.redirect(`${origin}/manage`)
      }
      if (profile.role === 'employee') {
        return NextResponse.redirect(`${origin}/work`)
      }
      if (profile.role === 'admin' || profile.role === 'super_admin') {
        return NextResponse.redirect(`${origin}/admin`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/talents`)
}
