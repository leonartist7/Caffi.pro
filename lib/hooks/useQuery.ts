/**
 * Standardized React Query Hooks
 *
 * Backend-agnostic query hooks with consistent patterns.
 * Works with any data source - just plug in your data fetcher.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query'
import { AppError, handleError } from '@/lib/errors'

// ==================== Query Keys ====================

/**
 * Centralized query key factory
 * Ensures consistent cache key structure
 */
export const queryKeys = {
  // Tenants
  tenants: {
    all: ['tenants'] as const,
    lists: () => [...queryKeys.tenants.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.tenants.lists(), filters] as const,
    details: () => [...queryKeys.tenants.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tenants.details(), id] as const,
  },

  // Locations
  locations: {
    all: ['locations'] as const,
    lists: () => [...queryKeys.locations.all, 'list'] as const,
    list: (tenantId?: string) => [...queryKeys.locations.lists(), tenantId] as const,
    details: () => [...queryKeys.locations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.locations.details(), id] as const,
  },

  // Menu
  categories: {
    all: ['categories'] as const,
    lists: () => [...queryKeys.categories.all, 'list'] as const,
    list: (tenantId?: string) => [...queryKeys.categories.lists(), tenantId] as const,
    details: () => [...queryKeys.categories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.categories.details(), id] as const,
  },

  menuItems: {
    all: ['menuItems'] as const,
    lists: () => [...queryKeys.menuItems.all, 'list'] as const,
    list: (filters?: { tenantId?: string; categoryId?: string }) =>
      [...queryKeys.menuItems.lists(), filters] as const,
    details: () => [...queryKeys.menuItems.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.menuItems.details(), id] as const,
  },

  // Orders
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters?: { tenantId?: string; status?: string; locationId?: string }) =>
      [...queryKeys.orders.lists(), filters] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    me: () => [...queryKeys.users.all, 'me'] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Loyalty
  loyalty: {
    all: ['loyalty'] as const,
    points: (userId: string) => [...queryKeys.loyalty.all, 'points', userId] as const,
    transactions: (userId: string) => [...queryKeys.loyalty.all, 'transactions', userId] as const,
    tiers: (tenantId: string) => [...queryKeys.loyalty.all, 'tiers', tenantId] as const,
    rewards: (tenantId: string) => [...queryKeys.loyalty.all, 'rewards', tenantId] as const,
  },

  // Coupons
  coupons: {
    all: ['coupons'] as const,
    lists: () => [...queryKeys.coupons.all, 'list'] as const,
    list: (tenantId?: string) => [...queryKeys.coupons.lists(), tenantId] as const,
    details: () => [...queryKeys.coupons.all, 'detail'] as const,
    detail: (code: string) => [...queryKeys.coupons.details(), code] as const,
  },
} as const

// ==================== Custom Hooks ====================

export interface QueryConfig<TData, TError = AppError>
  extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  onError?: (error: TError) => void
}

export interface MutationConfig<TData, TVariables, TError = AppError>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {}

/**
 * Enhanced useQuery with error handling
 */
export function useEnhancedQuery<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  config?: QueryConfig<TData>
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await queryFn()
      } catch (error) {
        const handled = handleError(error)
        throw new AppError(handled.message, handled.code, handled.statusCode)
      }
    },
    ...config,
  })
}

/**
 * Enhanced useMutation with error handling and cache invalidation
 */
export function useEnhancedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  config?: MutationConfig<TData, TVariables> & {
    invalidateQueries?: readonly unknown[][]
    onSuccessInvalidate?: boolean
  }
) {
  const queryClient = useQueryClient()

  const { invalidateQueries, onSuccessInvalidate = true, ...mutationOptions } = config || {}

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      try {
        return await mutationFn(variables)
      } catch (error) {
        const handled = handleError(error)
        throw new AppError(handled.message, handled.code, handled.statusCode)
      }
    },
    onSuccess: (...args) => {
      // Invalidate specified queries after successful mutation
      if (onSuccessInvalidate && invalidateQueries) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }

      // Call user's onSuccess if provided
      if (mutationOptions.onSuccess) {
        mutationOptions.onSuccess(...args)
      }
    },
    ...mutationOptions,
  })
}

// ==================== Common Patterns ====================

/**
 * Hook for paginated queries
 */
export function usePaginatedQuery<TData>(
  queryKey: readonly unknown[],
  queryFn: (page: number, pageSize: number) => Promise<TData>,
  options?: QueryConfig<TData> & {
    page?: number
    pageSize?: number
  }
) {
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 20

  return useEnhancedQuery([...queryKey, page, pageSize], () => queryFn(page, pageSize), {
    placeholderData: previousData => previousData,
    ...options,
  })
}

/**
 * Hook for infinite scroll queries
 */
export function useInfiniteScrollQuery<TData extends { nextCursor?: string }>(
  queryKey: readonly unknown[],
  queryFn: (cursor?: string) => Promise<TData>,
  options?: QueryConfig<TData>
) {
  return useQuery({
    queryKey,
    queryFn: () => queryFn(undefined),
    ...options,
  })
}

/**
 * Hook for polling queries
 */
export function usePollingQuery<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: QueryConfig<TData> & {
    pollingInterval?: number // milliseconds
    enabled?: boolean
  }
) {
  return useEnhancedQuery(queryKey, queryFn, {
    refetchInterval: options?.pollingInterval ?? 5000,
    refetchIntervalInBackground: true,
    ...options,
  })
}

// ==================== Cache Utilities ====================

/**
 * Hook to manually update query cache
 */
export function useQueryCache() {
  const queryClient = useQueryClient()

  return {
    // Get cached data
    getData: <TData>(queryKey: readonly unknown[]) => {
      return queryClient.getQueryData<TData>(queryKey)
    },

    // Set cached data
    setData: <TData>(queryKey: readonly unknown[], data: TData) => {
      queryClient.setQueryData(queryKey, data)
    },

    // Invalidate and refetch
    invalidate: (queryKey: readonly unknown[]) => {
      queryClient.invalidateQueries({ queryKey })
    },

    // Remove from cache
    remove: (queryKey: readonly unknown[]) => {
      queryClient.removeQueries({ queryKey })
    },

    // Optimistic update
    optimisticUpdate: <TData>(
      queryKey: readonly unknown[],
      updater: (old: TData | undefined) => TData
    ) => {
      const previousData = queryClient.getQueryData<TData>(queryKey)
      queryClient.setQueryData(queryKey, updater)
      return previousData
    },
  }
}

// ==================== Prefetch Utilities ====================

/**
 * Hook for prefetching queries
 */
export function usePrefetch() {
  const queryClient = useQueryClient()

  return {
    prefetch: <TData>(queryKey: readonly unknown[], queryFn: () => Promise<TData>) => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
      })
    },

    prefetchOnHover: <TData>(queryKey: readonly unknown[], queryFn: () => Promise<TData>) => {
      return {
        onMouseEnter: () => {
          queryClient.prefetchQuery({
            queryKey,
            queryFn,
          })
        },
      }
    },
  }
}
