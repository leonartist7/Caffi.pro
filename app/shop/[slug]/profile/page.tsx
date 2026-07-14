import { redirect } from 'next/navigation'
export default function Page({ params }: { params: { slug: string } }) {
  redirect(`/shop/${params.slug}`)
}
