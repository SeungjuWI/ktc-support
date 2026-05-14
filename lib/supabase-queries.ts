import { supabase } from './supabase'
import { Talent } from './types'

export async function fetchTalents(): Promise<Talent[]> {
  const { data, error } = await supabase
    .from('talents')
    .select('*')
    .order('ovr_score', { ascending: false })

  if (error) {
    console.error('fetchTalents error:', error.message)
    return []
  }

  return data as Talent[]
}

export async function fetchTalentById(id: string): Promise<Talent | null> {
  const { data, error } = await supabase
    .from('talents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('fetchTalentById error:', error.message)
    return null
  }

  return data as Talent
}

export async function submitInterviewRequest(req: {
  talent_id: string
  company_name: string
  contact_name: string
  contact_email: string
  message?: string
}) {
  const { data, error } = await supabase
    .from('interview_requests')
    .insert(req)
    .select()
    .single()

  if (error) {
    console.error('submitInterviewRequest error:', error.message)
    return { data: null, error }
  }

  return { data, error: null }
}
