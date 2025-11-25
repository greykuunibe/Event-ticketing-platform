'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useNotification } from '@/hooks/useNotification'
import { ForkKnifeIcon, WineIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import TableSkeleton from '@/components/admin/skeletons/TableSkeleton'
import Image from 'next/image'

interface MenuItem {
  id: string
  name: string
  imageUrl?: string | null
  createdAt: string
}

export default function MenuPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { success, error: showError, warning } = useNotification()
  const [dishes, setDishes] = useState<MenuItem[]>([])
  const [drinks, setDrinks] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dishes' | 'drinks'>('dishes')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchMenuItems()
    }
  }, [status, session])

  const fetchMenuItems = async () => {
    try {
      setLoading(true)
      const [dishesRes, drinksRes] = await Promise.all([
        fetch('/api/admin/dishes'),
        fetch('/api/admin/drinks'),
      ])

      if (!dishesRes.ok || !drinksRes.ok) {
        if (dishesRes.status === 401 || drinksRes.status === 401) {
          router.push('/auth/signin?callbackUrl=/admin/menu')
          return
        }
        throw new Error('Failed to fetch menu items')
      }

      const dishesData = await dishesRes.json()
      const drinksData = await drinksRes.json()
      setDishes(dishesData)
      setDrinks(drinksData)
    } catch (error) {
      console.error('Error fetching menu items:', error)
      showError('Failed to load menu items')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', activeTab)

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.message || errorData.error || 'Failed to upload image'
        
        // Show more helpful error message
        if (errorData.setupRequired) {
          showError(`${errorMessage} See SUPABASE_STORAGE_SETUP.md for instructions.`)
        } else {
          showError(errorMessage)
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setFormImageUrl(data.url)
      return data.url
    } catch (error: any) {
      console.error('Error uploading image:', error)
      if (!error.message || error.message === 'Failed to upload image') {
        showError('Failed to upload image. Please check that the Supabase Storage bucket is set up correctly.')
      }
      throw error
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return

    try {
      setSubmitting(true)
      const endpoint = activeTab === 'dishes' ? '/api/admin/dishes' : '/api/admin/drinks'

      if (editingItem) {
        // Update
        const response = await fetch(`${endpoint}/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: formName.trim(),
            imageUrl: formImageUrl || null,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update')
        }
      } else {
        // Create
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: formName.trim(),
            imageUrl: formImageUrl || null,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create')
        }
      }

      setFormName('')
      setFormImageUrl('')
      setEditingItem(null)
      setShowCreateForm(false)
      fetchMenuItems()
      success(editingItem ? 'Menu item updated successfully!' : 'Menu item created successfully!')
    } catch (error: any) {
      console.error('Error saving menu item:', error)
      showError(error.message || 'Failed to save menu item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setFormName(item.name)
    setFormImageUrl(item.imageUrl || '')
    setShowCreateForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return

    try {
      const endpoint = activeTab === 'dishes' ? '/api/admin/dishes' : '/api/admin/drinks'
      const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')
      fetchMenuItems()
      success('Menu item deleted successfully!')
    } catch (error) {
      console.error('Error deleting menu item:', error)
      showError('Failed to delete menu item')
    }
  }

  const handleCancel = () => {
    setFormName('')
    setFormImageUrl('')
    setEditingItem(null)
    setShowCreateForm(false)
  }

  const currentItems = activeTab === 'dishes' ? dishes : drinks

  if (loading) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={8} columns={3} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls Row */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-end py-6">
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform"
          >
            <PlusIcon size={16} weight="fill" />
            <span className="active:scale-[0.95] transition-transform">Add {activeTab === 'dishes' ? 'Dish' : 'Drink'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('dishes')
            handleCancel()
          }}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-all active:scale-[0.95] ${
            activeTab === 'dishes'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ForkKnifeIcon size={20} />
          <span className="active:scale-[0.95] transition-transform">Dishes ({dishes.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('drinks')
            handleCancel()
          }}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-all active:scale-[0.95] ${
            activeTab === 'drinks'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <WineIcon size={20} />
          <span className="active:scale-[0.95] transition-transform">Drinks ({drinks.length})</span>
        </button>
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-zinc-800/50 flex items-center justify-center z-50 p-4" onClick={handleCancel}>
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingItem ? 'Edit' : 'Add New'} {activeTab === 'dishes' ? 'Dish' : 'Drink'}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-all active:scale-[0.95]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {activeTab === 'dishes' ? 'Dish' : 'Drink'} Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
                  placeholder={`Enter ${activeTab === 'dishes' ? 'dish' : 'drink'} name`}
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Image
                </label>
                <div className="space-y-2">
                  {formImageUrl && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                      <Image
                        src={formImageUrl}
                        alt="Preview"
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try {
                          await handleImageUpload(file)
                        } catch (error) {
                          // Error already handled in handleImageUpload
                        }
                      }
                    }}
                    disabled={uploadingImage}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 transition-colors disabled:opacity-50"
                  />
                  {uploadingImage && (
                    <p className="text-sm text-gray-500">Uploading image...</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform disabled:opacity-50"
                >
                  <span className="active:scale-[0.95] transition-transform">{submitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center justify-center gap-2 bg-zinc-100 text-center px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform"
                >
                  <span className="active:scale-[0.95] transition-transform">Cancel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm">No {activeTab} found</p>
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="text-orange-600 hover:text-orange-800 text-sm font-medium transition-all active:scale-[0.95]"
                      >
                        <span className="active:scale-[0.95] transition-transform">Add your first {activeTab === 'dishes' ? 'dish' : 'drink'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.imageUrl ? (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-400">No image</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-3 py-1 text-sm text-zinc-800 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition-all active:scale-[0.95]"
                        >
                          <span className="active:scale-[0.95] transition-transform">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800 transition-all active:scale-[0.95]"
                          title="Delete"
                        >
                          <TrashIcon size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

