import { redirect } from 'next/navigation'
export default function OrderPage({ params }: { params: { slug: string; orderId: string } }) {
  redirect(`/shop/${params.slug}/order-confirmation/${params.orderId}`)
}
