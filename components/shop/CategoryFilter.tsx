'use client'

import { Coffee, Croissant, Cookie, IceCream, Milk, Wine } from 'lucide-react'

export interface Category {
  category_id: string
  tenant_id: string
  name: string
  description: string | null
  image_url: string | null
  icon_name: string | null
  display_order: number
  is_active: boolean
}

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string
  onSelectCategory: (categoryId: string) => void
  itemCounts?: Record<string, number>
}

const categoryIcons: Record<string, React.ReactNode> = {
  coffee: <Coffee size={20} />,
  croissant: <Croissant size={20} />,
  cookie: <Cookie size={20} />,
  'ice-cream': <IceCream size={20} />,
  milk: <Milk size={20} />,
  wine: <Wine size={20} />,
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  itemCounts,
}: CategoryFilterProps) {
  const allCount = itemCounts ? Object.values(itemCounts).reduce((sum, count) => sum + count, 0) : 0

  const getIcon = (iconName: string | null) => {
    if (!iconName) return <Coffee size={20} />
    return categoryIcons[iconName] || <Coffee size={20} />
  }

  return (
    <div className="w-full">
      {/* Mobile: Horizontal Scroll */}
      <div className="md:hidden overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pb-2">
          {/* All Categories */}
          <button
            onClick={() => onSelectCategory('all')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-coffee-700 text-white shadow-lg'
                : 'bg-white/80 dark:bg-dark-800/80 text-coffee-700 dark:text-coffee-200 hover:bg-coffee-100 dark:hover:bg-dark-700'
            }`}
          >
            <Coffee size={18} />
            <span>All</span>
            {itemCounts && <span className="text-xs opacity-75">({allCount})</span>}
          </button>

          {/* Category Buttons */}
          {categories.map(category => (
            <button
              key={category.category_id}
              onClick={() => onSelectCategory(category.category_id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                selectedCategory === category.category_id
                  ? 'bg-coffee-700 text-white shadow-lg'
                  : 'bg-white/80 dark:bg-dark-800/80 text-coffee-700 dark:text-coffee-200 hover:bg-coffee-100 dark:hover:bg-dark-700'
              }`}
            >
              {getIcon(category.icon_name)}
              <span>{category.name}</span>
              {itemCounts && itemCounts[category.category_id] && (
                <span className="text-xs opacity-75">({itemCounts[category.category_id]})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: Grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* All Categories */}
        <button
          onClick={() => onSelectCategory('all')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-coffee-700 text-white shadow-lg scale-105'
              : 'bg-white/80 dark:bg-dark-800/80 text-coffee-700 dark:text-coffee-200 hover:bg-coffee-100 dark:hover:bg-dark-700 hover:scale-105'
          }`}
        >
          <Coffee size={24} />
          <span>All</span>
          {itemCounts && <span className="text-xs opacity-75 font-normal">({allCount} items)</span>}
        </button>

        {/* Category Cards */}
        {categories.map(category => (
          <button
            key={category.category_id}
            onClick={() => onSelectCategory(category.category_id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl font-medium transition-all ${
              selectedCategory === category.category_id
                ? 'bg-coffee-700 text-white shadow-lg scale-105'
                : 'bg-white/80 dark:bg-dark-800/80 text-coffee-700 dark:text-coffee-200 hover:bg-coffee-100 dark:hover:bg-dark-700 hover:scale-105'
            }`}
          >
            {getIcon(category.icon_name)}
            <span className="text-center">{category.name}</span>
            {itemCounts && itemCounts[category.category_id] && (
              <span className="text-xs opacity-75 font-normal">
                ({itemCounts[category.category_id]} items)
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
