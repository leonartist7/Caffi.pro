import { NextRequest, NextResponse } from 'next/server'
import { requireVenueRole } from '@/lib/authz'
import { listMembersPage, type MemberSort } from '@/lib/owner-stats'

const STATUSES = new Set(['new', 'regular', 'fading', 'lost'])
const SORTS = new Set<MemberSort>(['recency_desc', 'recency_asc', 'name_asc'])

export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venue_id')
  const gate = await requireVenueRole(venueId, ['owner', 'manager'])
  if (!gate.ok) return gate.response

  const status = request.nextUrl.searchParams.get('status') ?? undefined
  const search = request.nextUrl.searchParams.get('search') ?? undefined
  const sortParam = request.nextUrl.searchParams.get('sort') ?? undefined
  const pageParam = Number(request.nextUrl.searchParams.get('page') ?? '1')
  const pageSizeParam = Number(request.nextUrl.searchParams.get('page_size') ?? '24')

  try {
    const result = await listMembersPage(gate.ctx.venueId, {
      status: status && STATUSES.has(status) ? (status as never) : undefined,
      search,
      sort: sortParam && SORTS.has(sortParam as MemberSort) ? (sortParam as MemberSort) : undefined,
      page: Number.isFinite(pageParam) ? pageParam : 1,
      pageSize: Number.isFinite(pageSizeParam) ? pageSizeParam : 24,
    })
    return NextResponse.json({
      members: result.rows,
      total: result.total,
      statusCounts: result.statusCounts,
      page: result.page,
      pageSize: result.pageSize,
      hasMore: result.hasMore,
    })
  } catch (error) {
    console.error('[members] list failed:', error)
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
  }
}
