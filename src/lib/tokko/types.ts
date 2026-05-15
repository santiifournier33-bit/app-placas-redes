export interface TokkoUser {
  id: number
  email: string
  first_name: string
  last_name: string
  cellphone: string | null
  phone: string | null
  picture: string | null
  is_active: boolean
  real_estate_agency: number
}

export interface TokkoUserListResponse {
  count: number
  next: string | null
  previous: string | null
  objects: TokkoUser[]
}
