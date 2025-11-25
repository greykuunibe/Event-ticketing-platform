'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import MenuCard from './MenuCard'

interface TicketItem {
  dish: string
  drink: string
}

interface MenuItem {
  id: string
  name: string
  imageUrl?: string | null
}

interface TicketItemsFormProps {
  ticketType: string
  numberOfTickets: number
  onItemsChange: (items: TicketItem[]) => void
  eventId?: string
}

export default function TicketItemsForm({
  ticketType,
  numberOfTickets,
  onItemsChange,
  eventId,
}: TicketItemsFormProps) {
  const [dishes, setDishes] = useState<MenuItem[]>([])
  const [drinks, setDrinks] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<TicketItem[]>(
    Array(numberOfTickets).fill(null).map(() => ({ dish: '', drink: '' }))
  )
  // Track selected items for each ticket (single selection per category)
  const [selections, setSelections] = useState<Record<number, { dishId: string | null, drinkId: string | null }>>(
    Object.fromEntries(
      Array(numberOfTickets).fill(0).map((_, i) => [i, { dishId: null, drinkId: null }])
    )
  )

  useEffect(() => {
    fetchMenuItems()
  }, [eventId])

  const fetchMenuItems = async () => {
    try {
      setLoading(true)
      const url = eventId ? `/api/menu?eventId=${eventId}` : '/api/menu'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch menu items')
      const data = await response.json()
      setDishes(data.dishes || [])
      setDrinks(data.drinks || [])
    } catch (error) {
      console.error('Error fetching menu items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelection = (ticketIndex: number, type: 'dish' | 'drink', itemId: string) => {
    const newSelections = { ...selections }
    
    // Toggle selection: if already selected, deselect; otherwise, select
    const currentSelection = newSelections[ticketIndex][type === 'dish' ? 'dishId' : 'drinkId']
    const newSelection = currentSelection === itemId ? null : itemId
    
    newSelections[ticketIndex] = {
      ...newSelections[ticketIndex],
      [type === 'dish' ? 'dishId' : 'drinkId']: newSelection,
    }

    // Update items array with selected names
    const newItems = [...items]
    if (type === 'dish') {
      newItems[ticketIndex] = {
        ...newItems[ticketIndex],
        dish: newSelection ? dishes.find(d => d.id === newSelection)?.name || '' : '',
      }
    } else {
      newItems[ticketIndex] = {
        ...newItems[ticketIndex],
        drink: newSelection ? drinks.find(d => d.id === newSelection)?.name || '' : '',
      }
    }

    setSelections(newSelections)
    setItems(newItems)
    onItemsChange(newItems)
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading menu items...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {items.map((item, ticketIndex) => (
        <motion.div
          key={ticketIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: ticketIndex * 0.1 }}
          className="space-y-6"
        >
          <h4 className="font-bold text-gray-800 text-left text-lg">
            Ticket {ticketIndex + 1}
          </h4>

          {/* Dishes Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 text-left">
              Select Dish *
            </label>
            <div className="grid mb-12 grid-cols-1 gap-4">
              {dishes.map((dish) => {
                const isSelected = selections[ticketIndex]?.dishId === dish.id
                return (
                  <MenuCard
                    key={dish.id}
                    id={dish.id}
                    name={dish.name}
                    imageUrl={dish.imageUrl}
                    isSelected={isSelected}
                    onClick={() => handleSelection(ticketIndex, 'dish', dish.id)}
                    type="dish"
                  />
                )
              })}
            </div>
          </div>

          {/* Drinks Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 text-left">
              Select Drink *
            </label>
            <div className="grid grid-cols-1 gap-4">
              {drinks.map((drink) => {
                const isSelected = selections[ticketIndex]?.drinkId === drink.id
                return (
                  <MenuCard
                    key={drink.id}
                    id={drink.id}
                    name={drink.name}
                    imageUrl={drink.imageUrl}
                    isSelected={isSelected}
                    onClick={() => handleSelection(ticketIndex, 'drink', drink.id)}
                    type="drink"
                  />
                )
              })}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
