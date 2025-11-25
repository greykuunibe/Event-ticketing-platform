'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { TagIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import TableSkeleton from '@/components/admin/skeletons/TableSkeleton'

interface TicketType {
  id: string
  name: string
  price: number
  peoplePerTicket: number
  color?: string | null
  createdAt: string
}

export default function TicketTypesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingType, setEditingType] = useState<TicketType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    peoplePerTicket: '1',
    color: '#4c6afe', // Default blue color
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchTicketTypes()
    }
  }, [status, session])

  const fetchTicketTypes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/ticket-types')

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin?callbackUrl=/admin/ticket-types')
          return
        }
        throw new Error('Failed to fetch ticket types')
      }

      const data = await response.json()
      setTicketTypes(data)
    } catch (error) {
      console.error('Error fetching ticket types:', error)
      alert('Failed to load ticket types')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.price) return

    try {
      setSubmitting(true)
      const endpoint = '/api/admin/ticket-types'

      if (editingType) {
        // Update
        const response = await fetch(`${endpoint}/${editingType.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            price: parseFloat(formData.price),
            peoplePerTicket: parseInt(formData.peoplePerTicket) || 1,
            color: formData.color,
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
            name: formData.name.trim(),
            price: parseFloat(formData.price),
            peoplePerTicket: parseInt(formData.peoplePerTicket) || 1,
            color: formData.color,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create')
        }
      }

      setFormData({ name: '', price: '', peoplePerTicket: '1', color: '#4c6afe' })
      setEditingType(null)
      setShowCreateForm(false)
      fetchTicketTypes()
    } catch (error: any) {
      console.error('Error saving ticket type:', error)
      alert(error.message || 'Failed to save ticket type')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (type: TicketType) => {
    setEditingType(type)
    setFormData({
      name: type.name,
      price: type.price.toString(),
      peoplePerTicket: type.peoplePerTicket.toString(),
      color: type.color || '#4c6afe',
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket type? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/admin/ticket-types/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')
      fetchTicketTypes()
    } catch (error) {
      console.error('Error deleting ticket type:', error)
      alert('Failed to delete ticket type')
    }
  }

  const handleCancel = () => {
    setFormData({ name: '', price: '', peoplePerTicket: '1', color: '#4c6afe' })
    setEditingType(null)
    setShowCreateForm(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={8} columns={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ticket Types</h1>
          <p className="text-gray-600">Manage ticket types and pricing</p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80"
          >
            <PlusIcon size={20} />
            Add Ticket Type
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-zinc-800/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={handleCancel}>
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 max-w-md w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingType ? 'Edit' : 'Add New'} Ticket Type
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
                  placeholder="e.g., Regular Single, VIP Couple"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Price (GHS) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">People Per Ticket *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.peoplePerTicket}
                    onChange={(e) => setFormData({ ...formData, peoplePerTicket: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="pt-2">
                <label className="block text-sm font-medium mb-3">Base Color *</label>
                <div className="grid grid-cols-3 gap-3 mb-2">
                  {[
                    { value: '#4c6afe', label: 'Blue', name: 'Blue (#4c6afe)' },
                    { value: '#86de02', label: 'Green', name: 'Green (#86de02)' },
                    { value: '#f97316', label: 'Orange', name: 'Orange (#f97316)' },
                  ].map((colorOption) => (
                    <button
                      key={colorOption.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: colorOption.value })}
                      className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all ${
                        formData.color === colorOption.value
                          ? 'border-zinc-800 bg-zinc-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-lg border-2 border-gray-200"
                        style={{ backgroundColor: colorOption.value }}
                      />
                      <span className="text-xs font-medium text-gray-700">{colorOption.label}</span>
                      <span className="text-[10px] font-mono text-gray-500">{colorOption.value}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">Select one of the available colors for the ticket gradient</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingType ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center justify-center gap-2 bg-zinc-100 text-center px-4 py-2 rounded-xl active:opacity-80"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Types List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  People Per Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Color
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
              {ticketTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <TagIcon size={48} className="text-gray-400" />
                      <p className="text-sm">No ticket types found</p>
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                      >
                        Add your first ticket type
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                ticketTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{type.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(type.price)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{type.peoplePerTicket}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg border border-gray-200"
                          style={{ backgroundColor: type.color || '#f97316' }}
                        />
                        <span className="text-xs font-mono text-gray-600">{type.color || '#f97316'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(type.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(type)}
                          className="px-3 py-1 text-sm text-zinc-800 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(type.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
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

