export interface User {
  id: number
  registration_number: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: 'admin' | 'voter' | 'candidate'
  faculty: string
  course: string
  year_of_study: number
  profile_photo: string | null
  is_verified: boolean
  date_joined: string
}

export interface Position {
  id: number
  title: string
  description: string
  max_votes: number
  order: number
}

export interface Candidate {
  id: number
  user: User
  position: number
  manifesto: string
  photo: string | null
  status: 'pending' | 'approved' | 'rejected'
  applied_at: string
  vote_count: number | null
}

export interface Election {
  id: number
  title: string
  description: string
  academic_year: string
  status: 'draft' | 'open' | 'closed' | 'results'
  start_time: string
  end_time: string
  is_active: boolean
  positions: Position[]
  total_voters: number
  created_at: string
}

export interface AuthTokens {
  access: string
  refresh: string
  user: User
}