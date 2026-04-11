import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'

/**
 * Menu browsing panel: search, category filter, grid of item cards with an
 * "Add" button. Pure presentational — parent owns cart state.
 */
const MenuBrowser = ({ menuItems, onAddItem, title = 'Menu Items' }) => {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = useMemo(
    () => ['All', ...new Set(menuItems.map((i) => i.category))],
    [menuItems]
  )

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory
      if (!matchesCategory) return false
      if (!query) return true
      return (
        item.name.toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      )
    })
  }, [menuItems, selectedCategory, searchQuery])

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search menu items..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-abhimata-orange focus:border-abhimata-orange"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-abhimata-orange text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Menu grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900">{item.name}</h3>
              <span className="text-abhimata-orange font-bold whitespace-nowrap ml-2">
                Rp {item.price.toLocaleString()}
              </span>
            </div>

            <p className="text-gray-600 text-sm mb-2">{item.description}</p>
            <p className="text-xs text-gray-500 mb-3">{item.category}</p>

            <div className="flex items-center justify-between">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < item.rating ? 'text-yellow-400' : 'text-gray-300'
                    }
                  >
                    ★
                  </span>
                ))}
              </div>

              <button
                onClick={() => onAddItem(item)}
                className="bg-abhimata-orange text-white px-3 py-1 rounded text-sm hover:bg-abhimata-orange-dark flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <p className="text-center text-gray-500 py-8">No menu items match your search</p>
      )}
    </div>
  )
}

export default MenuBrowser
