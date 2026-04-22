'use client'
// src/lib/hooks/useUser.ts
// React hook for accessing current user profile with caching

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { User, UserRole } from '@/lib/types'

export interface UseUserReturn {
  user: User | null
  role: UserRole | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  isSuperAdmin: boolean
  isHR: boolean
  isParticipant: boolean
  refetch: () => void
  signOut: () => Promise<void>
}

const USER_QUERY_KEY = ['user', 'profile']

export function useUser(): UseUserReturn {
  const queryClient = useQueryClient()
  const supabase = createClient()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: async (): Promise<User | null> => {
      // First check if we have an authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !authUser) {
        return null
      }

      // Fetch the user profile from users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        console.error('Error fetching user profile:', profileError)
        return null
      }

      return profile as User
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    retry: 1,
    refetchOnWindowFocus: true,
  })

  const signOut = async () => {
    await supabase.auth.signOut()
    queryClient.setQueryData(USER_QUERY_KEY, null)
    queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY })
  }

  const user = data ?? null
  const role = user?.role ?? null

  return {
    user,
    role,
    isLoading,
    isError,
    error: error as Error | null,
    isSuperAdmin: role === 'super_admin',
    isHR: role === 'hr',
    isParticipant: role === 'participant',
    refetch: () => refetch(),
    signOut,
  }
}

// Helper to invalidate user cache from outside React components
export function invalidateUserCache(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY })
}
