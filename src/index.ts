/**
 * @nhonguista/sdk
 *
 * Cliente SDK oficial tipado para integração com a plataforma comercial Nhonguista.
 *
 * @license AGPL-3.0-or-later
 */

export interface NhonguistaConfig {
  baseUrl: string
  apiKey?: string
  token?: string
  timeout?: number
}

export interface User {
  id: string
  name: string
  username?: string
  email: string
  phone: string
  avatar?: string | null
  is_verified?: boolean
  roles?: Array<{ id: string; name: string; slug: string }>
  provider_profile?: ProviderProfile | null
  companies_owned?: Company[]
  active_subscription?: Subscription | null
}

export interface Role {
  id: string
  name: string
  slug: string
}

export interface ProviderProfile {
  id: string
  user_id: string
  bio?: string | null
  primary_phone?: string | null
  whatsapp_phone?: string | null
  address?: string | null
  experience_years?: number
  is_available?: boolean
  is_verified?: boolean
  rating_cache?: number
  reviews_count?: number
  // Aliases de conveniência
  rating_average?: number
  rating_count?: number
  location_id?: string | null
  availability_hours?: string | null
  subscription_tier?: string | null
  user?: User
  location?: Location | null
}

export interface Company {
  id: string
  owner_id: string
  legal_name: string
  trade_name?: string | null
  name?: string // Alias para legal_name
  slug: string
  nuit?: string | null
  email?: string | null
  phone?: string | null
  whatsapp_phone?: string | null
  bio?: string | null
  description?: string | null // Alias para bio
  address?: string | null
  location_id?: string | null
  is_verified?: boolean
  is_active?: boolean
  owner?: User
  members?: CompanyMember[]
  services?: Service[]
}

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: 'owner' | 'admin' | 'specialist'
  is_active: boolean
  joined_at: string
  user?: User
}

export interface Category {
  id: string
  parent_id?: string | null
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  image_url?: string | null
  order?: number
  is_active?: boolean
}

export interface Location {
  id: string
  name: string
  slug: string
  city: string
  province: string
  latitude?: number | null
  longitude?: number | null
  is_active?: boolean
}

export interface ServiceMedia {
  id: string
  service_id: string
  url: string
  mime_type?: string | null
  size_bytes?: number | null
  is_cover: boolean
  order: number
}

export interface ServicePortfolio {
  id: string
  service_id: string
  title: string
  description?: string | null
  image_url: string
  order: number
}

export interface Service {
  id: string
  user_id: string
  company_id?: string | null
  category_id: string
  location_id?: string | null
  title: string
  slug: string
  description?: string | null
  price_min?: number | string | null
  price_max?: number | string | null
  price?: number | string | null // Alias
  price_unit?: string | null // Alias
  price_type: 'fixo' | 'hora' | 'negociavel'
  is_active: boolean
  is_featured?: boolean
  rating_cache?: number | string
  reviews_count?: number
  views_count?: number
  leads_count?: number
  user?: User
  company?: Company | null
  category?: Category
  location?: Location | null
  media?: ServiceMedia[]
  portfolios?: ServicePortfolio[]
  reviews?: Review[]
}

export interface Review {
  id: string
  service_id: string
  provider_id: string
  client_id?: string
  client_name?: string
  rating: number
  comment?: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  client?: User
}

export interface Lead {
  id: string
  service_id: string
  provider_profile_id?: string
  client_name?: string
  client_phone?: string
  notes?: string
  created_at: string
  service?: Service
}

export interface Verification {
  id: string
  provider_profile_id: string
  document_type: string
  document_number: string
  document_url?: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  notes?: string
  created_at: string
  reviewed_at?: string
}

export interface Plan {
  id: string
  name: string
  slug: string
  description?: string | null
  price_monthly: number | string
  price_yearly: number | string
  price?: number | string // Alias para compatibilidade
  max_services: number
  max_members: number
  has_badge: boolean
  has_priority_support: boolean
  is_active: boolean
}

export interface Subscription {
  id: string
  user_id: string
  company_id?: string | null
  plan_id: string
  billing_cycle: 'monthly' | 'yearly' | 'lifetime'
  status: 'active' | 'expired' | 'cancelled' | 'pending'
  starts_at?: string | null
  expires_at?: string | null
  plan?: Plan
}

export function createClient(config: NhonguistaConfig) {
  let activeToken = config.token || config.apiKey

  function setToken(token: string | null) {
    activeToken = token || undefined
  }

  function setAuthToken(token: string | null) {
    setToken(token)
  }

  async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const baseUrl = config.baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const fullUrl = normalizedEndpoint.startsWith('/api') 
      ? `${baseUrl}${normalizedEndpoint}` 
      : `${baseUrl}/api${normalizedEndpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
      ...(options?.headers as Record<string, string>),
    }

    const timeoutMs = config.timeout && config.timeout > 0 ? config.timeout : 30000

    const response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(errData.message || `API error: ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  return {
    setToken,
    setAuthToken,
    auth: {
      register: (data: any) => request<{ user: User; token: string }>('/register', { method: 'POST', body: JSON.stringify(data) }),
      login: (phoneOrData: any, password?: string) => {
        const body = typeof phoneOrData === 'string' 
          ? { phone: phoneOrData, password } 
          : phoneOrData;
        return request<{ user: User; token: string }>('/login', { method: 'POST', body: JSON.stringify(body) });
      },
      me: () => request<{ user: User }>('/me'),
      logout: () => request<{ message: string }>('/logout', { method: 'POST' }),
    },
    services: {
      list: (params?: Record<string, any>) => {
        const query = params ? `?${new URLSearchParams(params)}` : ''
        return request<any>(`/services${query}`)
      },
      mine: () => request<Service[]>('/services/mine').catch(() => request<any>('/services').then(res => res.data || res)),
      get: (id: string) => request<Service>(`/services/${id}`),
      create: (data: any) => request<{ message: string; service: Service }>('/services', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: any) => request<{ message: string; service: Service }>(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      toggleActive: (id: string) => request<{ message: string; is_active: boolean }>(`/services/${id}/toggle-active`, { method: 'PATCH' }),
      delete: (id: string) => request<{ message: string }>(`/services/${id}`, { method: 'DELETE' }),
      addMedia: (id: string, data: any) => request<{ message: string; media: ServiceMedia }>(`/services/${id}/media`, { method: 'POST', body: JSON.stringify(data) }),
      addPortfolio: (id: string, data: any) => request<{ message: string; portfolio: ServicePortfolio }>(`/services/${id}/portfolios`, { method: 'POST', body: JSON.stringify(data) }),
    },
    categories: {
      list: () => request<Category[]>('/categories'),
      get: (slug: string) => request<Category>(`/categories/${slug}`),
    },
    locations: {
      list: () => request<Location[]>('/locations').catch(() => [
        { id: '1', name: 'Maputo Cidade', city: 'Maputo', province: 'Maputo Cidade', slug: 'maputo' },
        { id: '2', name: 'Matola', city: 'Matola', province: 'Maputo Província', slug: 'matola' },
        { id: '3', name: 'Beira', city: 'Beira', province: 'Sofala', slug: 'beira' },
        { id: '4', name: 'Nampula', city: 'Nampula', province: 'Nampula', slug: 'nampula' },
      ]),
    },
    companies: {
      list: () => request<Company[]>('/companies').then(res => Array.isArray(res) ? res : (res as any).data || []),
      get: (id: string) => request<Company>(`/companies/${id}`),
      create: (data: any) => request<any>('/companies', { method: 'POST', body: JSON.stringify(data) }).then(res => res.company || res),
      update: (id: string, data: any) => request<any>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      addMember: (id: string, data: any) => request<{ message: string; member: CompanyMember }>(`/companies/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),
      removeMember: (id: string, memberId: string) => request<{ message: string }>(`/companies/${id}/members/${memberId}`, { method: 'DELETE' }),
    },
    providerProfile: {
      get: (id?: string) => request<ProviderProfile>(id ? `/providers/${id}` : '/provider/profile'),
      update: (data: any) => request<{ message: string; profile: ProviderProfile }>('/provider/profile', { method: 'PUT', body: JSON.stringify(data) }),
    },
    leads: {
      mine: () => request<Lead[]>('/leads/mine').catch(() => []),
      create: (data: any) =>
        request<{ message: string; lead_id: string; whatsapp_url: string | null }>('/leads', { method: 'POST', body: JSON.stringify(data) }),
    },
    reviews: {
      list: (providerId?: string) => request<Review[]>(providerId ? `/providers/${providerId}/reviews` : '/reviews').catch(() => []),
      create: (data: any) =>
        request<{ message: string; review: Review }>('/reviews', { method: 'POST', body: JSON.stringify(data) }),
      moderate: (id: string, status: 'approved' | 'rejected') =>
        request<{ message: string; review: Review }>(`/admin/reviews/${id}/moderate`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    },
    verifications: {
      mine: () => request<Verification[]>('/verifications/mine').catch(() => []),
      submit: (data: any) => request<{ message: string; verification_id: string; status: string }>('/verifications', { method: 'POST', body: JSON.stringify(data) }),
      moderate: (id: string, status: 'approved' | 'rejected', notes?: string) =>
        request<{ message: string; verification_id: string; status: string }>(`/admin/verifications/${id}/review`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
      review: (id: string, status: 'approved' | 'rejected', notes?: string) =>
        request<{ message: string; verification_id: string; status: string }>(`/admin/verifications/${id}/review`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
    },
    plans: {
      list: () => request<Plan[]>('/plans').then(plans => plans.map(p => ({ ...p, price: p.price_monthly }))),
      mySubscriptions: () => request<Subscription[]>('/subscriptions/mine').catch(() => []),
      currentSubscription: (companyId?: string) => {
        const query = companyId ? `?company_id=${companyId}` : ''
        return request<Subscription | null>(`/subscriptions/current${query}`)
      },
      activateManual: (data: any) =>
        request<{ message: string; subscription: Subscription }>('/admin/subscriptions/activate', { method: 'POST', body: JSON.stringify(data) }),
      activateSubscription: (data: any) =>
        request<{ message: string; subscription: Subscription }>('/admin/subscriptions/activate', { method: 'POST', body: JSON.stringify(data) }),
    },
    stats: {
      get: () => request<any>('/stats'),
    },
  }
}
