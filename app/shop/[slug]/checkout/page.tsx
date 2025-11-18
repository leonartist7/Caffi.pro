'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getTenantBySlug } from '@/lib/get-tenant'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  ShoppingBag,
  MapPin,
  Coffee,
  AlertCircle,
  Loader2,
  Tag,
  Truck,
  Home as HomeIcon,
  UtensilsCrossed,
} from 'lucide-react'
import LocationSelector, { type Location } from '@/components/shop/LocationSelector'
import { createOrder, validateCoupon, calculateDiscount } from '@/lib/create-order'

type OrderType = 'pickup' | 'dine_in' | 'delivery'

export default function CheckoutPage() {
  const router = useRouter()
  const params = useParams()
  const tenantSlug = params.slug as string

  const { items, itemCount, subtotal, tax, total, clearCart } = useCart()
  const { user, loading: authLoading } = useAuth()
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<OrderType>('pickup')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [currency, setCurrency] = useState('EUR')

  const supabase = createClient()

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user && tenantSlug) {
      router.push(`/shop/${tenantSlug}/login`)
    }
  }, [user, authLoading, tenantSlug])

  // Redirect if cart is empty
  useEffect(() => {
    if (itemCount === 0 && tenantSlug) {
      router.push(`/shop/${tenantSlug}/menu`)
    }
  }, [itemCount, tenantSlug])

  // Fetch tenant and locations
  useEffect(() => {
    if (tenantSlug) {
      fetchTenantAndLocations()
    }
  }, [tenantSlug])

  async function fetchTenantAndLocations() {
    if (!tenantSlug) return

    try {
      setLoading(true)

      // Get tenant info
      const tenant = await getTenantBySlug(tenantSlug)
      if (tenant) {
        setTenantId(tenant.tenant_id)
        setCurrency(tenant.currency || 'EUR')

        // Fetch locations
        const { data: locs, error } = await supabase
          .from('locations')
          .select('*')
          .eq('tenant_id', tenant.tenant_id)
          .eq('is_active', true)
          .order('name')

        if (!error && locs) {
          setLocations(locs)
          // Auto-select first location if only one
          if (locs.length === 1) {
            setSelectedLocation(locs[0].location_id)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    if (currency === 'EUR') return `€${price.toFixed(2)}`
    if (currency === 'USD') return `$${price.toFixed(2)}`
    return `${price.toFixed(2)} ${currency}`
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !tenantId) return

    setCouponError(null)
    setLoading(true)

    const { coupon, error } = await validateCoupon(couponCode.trim(), tenantId)

    if (error || !coupon) {
      setCouponError(error || 'Invalid coupon')
      setAppliedCoupon(null)
      setDiscount(0)
      setLoading(false)
      return
    }

    // Calculate discount
    const discountAmount = calculateDiscount(subtotal, coupon)
    setDiscount(discountAmount)
    setAppliedCoupon(coupon)
    setLoading(false)
  }

  const handlePlaceOrder = async () => {
    if (!user || !tenantId || !selectedLocation) {
      setError('Please select a pickup location')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const finalTotal = subtotal + tax - discount

      const { order, error: orderError } = await createOrder({
        tenant_id: tenantId,
        user_id: user.id,
        location_id: selectedLocation,
        order_type: orderType,
        items,
        subtotal,
        tax,
        total: finalTotal,
        special_instructions: specialInstructions || undefined,
        coupon_code: appliedCoupon?.code,
        discount,
      })

      if (orderError || !order) {
        setError(orderError?.message || 'Failed to create order')
        setSubmitting(false)
        return
      }

      // Clear cart
      clearCart()

      // Redirect to confirmation page
      router.push(`/shop/${tenantSlug}/order-confirmation/${order.order_id}`)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-coffee-600 animate-spin mb-4" />
        <p className="text-coffee-600 dark:text-coffee-300">Loading checkout...</p>
      </div>
    )
  }

  if (!user || itemCount === 0) {
    return null
  }

  const finalTotal = subtotal + tax - discount

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-coffee-900 dark:text-white mb-2">Checkout</h1>
        <p className="text-coffee-600 dark:text-coffee-300">Complete your order</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Type */}
          <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6">
            <h2 className="text-xl font-bold text-coffee-900 dark:text-white mb-4">Order Type</h2>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setOrderType('pickup')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  orderType === 'pickup'
                    ? 'border-coffee-700 bg-coffee-50 dark:border-coffee-500 dark:bg-coffee-900/30'
                    : 'border-coffee-200 dark:border-dark-700 hover:border-coffee-400'
                }`}
              >
                <ShoppingBag size={24} className="text-coffee-700 dark:text-coffee-300" />
                <span className="text-sm font-medium text-coffee-900 dark:text-white">Pickup</span>
              </button>
              <button
                onClick={() => setOrderType('dine_in')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  orderType === 'dine_in'
                    ? 'border-coffee-700 bg-coffee-50 dark:border-coffee-500 dark:bg-coffee-900/30'
                    : 'border-coffee-200 dark:border-dark-700 hover:border-coffee-400'
                }`}
              >
                <UtensilsCrossed size={24} className="text-coffee-700 dark:text-coffee-300" />
                <span className="text-sm font-medium text-coffee-900 dark:text-white">Dine In</span>
              </button>
              <button
                onClick={() => setOrderType('delivery')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  orderType === 'delivery'
                    ? 'border-coffee-700 bg-coffee-50 dark:border-coffee-500 dark:bg-coffee-900/30'
                    : 'border-coffee-200 dark:border-dark-700 hover:border-coffee-400'
                }`}
              >
                <Truck size={24} className="text-coffee-700 dark:text-coffee-300" />
                <span className="text-sm font-medium text-coffee-900 dark:text-white">
                  Delivery
                </span>
              </button>
            </div>
          </div>

          {/* Location Selection */}
          <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="text-coffee-700 dark:text-coffee-300" size={24} />
              <h2 className="text-xl font-bold text-coffee-900 dark:text-white">
                {orderType === 'pickup' ? 'Pickup Location' : 'Location'}
              </h2>
            </div>
            <LocationSelector
              locations={locations}
              selectedLocation={selectedLocation}
              onSelectLocation={setSelectedLocation}
            />
          </div>

          {/* Special Instructions */}
          <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6">
            <h2 className="text-xl font-bold text-coffee-900 dark:text-white mb-4">
              Special Instructions
            </h2>
            <textarea
              value={specialInstructions}
              onChange={e => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests? (optional)"
              className="w-full p-3 border-2 border-coffee-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-coffee-900 dark:text-white placeholder-coffee-400 dark:placeholder-dark-500 focus:border-coffee-700 dark:focus:border-coffee-500 focus:outline-none"
              rows={3}
            />
          </div>

          {/* Coupon */}
          <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="text-coffee-700 dark:text-coffee-300" size={24} />
              <h2 className="text-xl font-bold text-coffee-900 dark:text-white">Coupon Code</h2>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                disabled={!!appliedCoupon}
                className="flex-1 p-3 border-2 border-coffee-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-coffee-900 dark:text-white placeholder-coffee-400 disabled:opacity-50 focus:border-coffee-700 dark:focus:border-coffee-500 focus:outline-none"
              />
              {!appliedCoupon ? (
                <button
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim()}
                  className="px-6 py-3 bg-coffee-700 hover:bg-coffee-800 disabled:bg-coffee-400 text-white rounded-lg font-bold transition-colors disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAppliedCoupon(null)
                    setDiscount(0)
                    setCouponCode('')
                  }}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            {couponError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">{couponError}</p>
            )}
            {appliedCoupon && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                ✓ Coupon applied: {appliedCoupon.code} (-{formatPrice(discount)})
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700 p-6 sticky top-24">
            <h2 className="text-xl font-bold text-coffee-900 dark:text-white mb-4">
              Order Summary
            </h2>

            {/* Items */}
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map((item, index) => (
                <div key={`${item.item_id}-${index}`} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div className="font-medium text-coffee-900 dark:text-white">
                      {item.quantity}x {item.name}
                    </div>
                    {(item.modifiers.size || item.modifiers.addons.length > 0) && (
                      <div className="text-xs text-coffee-500 dark:text-coffee-400">
                        {item.modifiers.size && `${item.modifiers.size.name} `}
                        {item.modifiers.addons.length > 0 &&
                          `+ ${item.modifiers.addons.map(a => a.name).join(', ')}`}
                      </div>
                    )}
                  </div>
                  <div className="font-medium text-coffee-900 dark:text-white">
                    {formatPrice(item.total_price)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-coffee-200 dark:border-dark-700 pt-4 space-y-2">
              <div className="flex justify-between text-coffee-700 dark:text-coffee-300">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-coffee-700 dark:text-coffee-300">
                <span>Tax (10%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-coffee-900 dark:text-white pt-2 border-t border-coffee-200 dark:border-dark-700">
                <span>Total</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={submitting || !selectedLocation}
              className="w-full mt-6 flex items-center justify-center gap-2 bg-coffee-700 hover:bg-coffee-800 disabled:bg-coffee-400 text-white py-4 rounded-full font-bold text-lg transition-colors shadow-lg disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <Coffee size={24} />
                  Place Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
