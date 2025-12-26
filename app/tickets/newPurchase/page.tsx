'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useNotification } from '@/hooks/useNotification'
import PersonalInfoForm from '@/components/booking/PersonalInfoForm'
import TicketTypeSelection from '@/components/booking/TicketTypeSelection'
import TicketItemsForm from '@/components/booking/TicketItemsForm'
import { ArrowLeft, ArrowLeftIcon, CalendarDotsIcon, MapPinLineIcon, Spinner, SpinnerIcon, TicketIcon, PlusIcon, MinusIcon } from '@phosphor-icons/react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

type Step = 'personal' | 'ticket-type' | 'quantity' | 'items' | 'payment'

interface PersonalInfo {
  fullName: string
  phoneNumber: string
  email: string
}

interface TicketItem {
  dish: string
  drink: string
}

interface Event {
  id: string
  name: string
  description: string | null
  eventDate: string | null
  location: string | null
}

function NewTicketContent() {
  const router = useRouter()
  const { error: showError, warning } = useNotification()
  const searchParams = useSearchParams()
  const eventQrCode = searchParams.get('event')

  const [step, setStep] = useState<Step>('personal')
  const [event, setEvent] = useState<Event | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null)
  const [selectedTicketType, setSelectedTicketType] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [quantityInput, setQuantityInput] = useState<string>('1')
  const [ticketPrice, setTicketPrice] = useState<number>(0)
  const [ticketItems, setTicketItems] = useState<TicketItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (eventQrCode) {
      fetchEvent()
    } else {
      setLoadingEvent(false)
    }
  }, [eventQrCode])

  const fetchEvent = async () => {
    try {
      setLoadingEvent(true)
      const response = await fetch(`/api/events/qr/${eventQrCode}`)
      
      if (response.status === 410) {
        // QR code expired
        const errorData = await response.json()
        showError('This QR code has expired. Please contact the event organizer for a new QR code.')
        router.push('/')
        return
      }
      
      if (!response.ok) {
        throw new Error('Event not found')
      }
      const eventData = await response.json()
      setEvent(eventData)
    } catch (error) {
      console.error('Error fetching event:', error)
      showError('Event not found. Please scan a valid QR code.')
      router.push('/')
    } finally {
      setLoadingEvent(false)
    }
  }

  const [ticketTypes, setTicketTypes] = useState<any[]>([])

  useEffect(() => {
    if (event?.id) {
      fetchTicketTypes()
    }
  }, [event?.id])

  const fetchTicketTypes = async () => {
    if (!event?.id) return
    try {
      const response = await fetch(`/api/ticket-types?eventId=${event.id}`)
      if (!response.ok) throw new Error('Failed to fetch ticket types')
      const data = await response.json()
      setTicketTypes(data || [])
    } catch (error) {
      console.error('Error fetching ticket types:', error)
    }
  }

  const getTicketTypeName = (id: string) => {
    return ticketTypes.find((t) => t.id === id)?.name || ''
  }

  const getPeoplePerTicket = () => {
    const ticketType = ticketTypes.find((t) => t.id === selectedTicketType)
    return ticketType?.peoplePerTicket || 1
  }

  const getTotalSelections = () => {
    return quantity * getPeoplePerTicket()
  }

  const handlePersonalInfoNext = (data: PersonalInfo) => {
    setPersonalInfo(data)
    setStep('ticket-type')
  }

  const handleTicketTypeSelect = (type: string, price: number) => {
    setSelectedTicketType(type)
    setTicketPrice(price)
    setQuantity(1) // Reset quantity
    setQuantityInput('1')
  }

  const handleTicketTypeContinue = () => {
    if (selectedTicketType) {
      setStep('quantity')
    }
  }

  const handleBack = () => {
    if (step === 'ticket-type') {
      setStep('personal')
    } else if (step === 'quantity') {
      setStep('ticket-type')
    } else if (step === 'items') {
      setStep('quantity')
    } else if (step === 'personal') {
      router.back()
    }
  }

  const handleQuantitySelect = () => {
    const totalSelections = getTotalSelections()
    setTicketItems(
      Array(totalSelections)
        .fill(null)
        .map(() => ({ dish: '', drink: '' }))
    )
    setStep('items')
  }

  const handleItemsChange = (items: TicketItem[]) => {
    setTicketItems(items)
  }

  const handleProceedToPayment = async () => {
    console.log('[FRONTEND] ===== STARTING TICKET PURCHASE FLOW =====')
    console.log('[FRONTEND] Step 1: Validating form data')
    
    if (!event) {
      console.error('[FRONTEND] ERROR: Event not found')
      showError('Event not found. Please scan a valid QR code.')
      return
    }

    console.log('[FRONTEND] Step 2: Event found:', event.id, event.name)

    // Validate all items have dish and drink
    const isValid = ticketItems.every(
      (item) => item.dish.trim() && item.drink.trim()
    )

    if (!isValid) {
      console.error('[FRONTEND] ERROR: Invalid items - missing dish or drink')
      warning('Please select dish and drink for all selections')
      return
    }

    console.log('[FRONTEND] Step 3: Items validated:', ticketItems.length, 'items')

    // Validate ticket type is selected
    if (!selectedTicketType) {
      console.error('[FRONTEND] ERROR: No ticket type selected')
      showError('Please select a ticket type')
      setIsLoading(false)
      return
    }

    // Get ticket type name - fallback to ID if name lookup fails
    const ticketTypeName = getTicketTypeName(selectedTicketType)
    const ticketTypeToSend = ticketTypeName || selectedTicketType // Use name if available, otherwise send ID

    if (!ticketTypeToSend || ticketTypeToSend.trim() === '') {
      console.error('[FRONTEND] ERROR: Invalid ticket type')
      showError('Invalid ticket type. Please try selecting again.')
      setIsLoading(false)
      return
    }

    console.log('[FRONTEND] Step 4: Ticket type selected:', ticketTypeToSend)
    console.log('[FRONTEND] Step 5: Personal info:', {
      fullName: personalInfo!.fullName,
      phoneNumber: personalInfo!.phoneNumber,
      email: personalInfo!.email,
      quantity
    })

    setIsLoading(true)
    try {
      console.log('[FRONTEND] Step 6: Creating ticket via API...')
      // Create ticket
      const ticketResponse = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          fullName: personalInfo!.fullName,
          phoneNumber: personalInfo!.phoneNumber,
          email: personalInfo!.email,
          ticketType: ticketTypeToSend,
          quantity: quantity,
          items: ticketItems,
        }),
      })

      console.log('[FRONTEND] Step 7: Ticket creation response status:', ticketResponse.status, ticketResponse.ok)

      if (!ticketResponse.ok) {
        const errorData = await ticketResponse.json().catch(() => ({}))
        console.error('[FRONTEND] ERROR: Ticket creation failed:', errorData)
        throw new Error('Failed to create ticket')
      }

      const ticket = await ticketResponse.json()
      console.log('[FRONTEND] Step 8: Ticket created successfully:', {
        ticketId: ticket.id,
        paymentStatus: ticket.paymentStatus,
        totalAmount: ticket.totalAmount,
        paymentReference: ticket.paymentReference
      })

      console.log('[FRONTEND] Step 9: Initializing payment with Paystack...')
      // Initialize payment
      const paymentResponse = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          email: personalInfo!.email || 'customer@example.com',
        }),
      })

      console.log('[FRONTEND] Step 10: Payment initialization response status:', paymentResponse.status, paymentResponse.ok)

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => ({}))
        console.error('[FRONTEND] ERROR: Payment initialization failed:', errorData)
        throw new Error('Failed to initialize payment')
      }

      const paymentData = await paymentResponse.json()
      console.log('[FRONTEND] Step 11: Payment initialized successfully:', {
        reference: paymentData.reference,
        hasAuthorizationUrl: !!paymentData.authorizationUrl
      })

      // Redirect to Paystack - this MUST be the only action
      // Do NOT show ticket before payment is confirmed
      if (paymentData.authorizationUrl) {
        console.log('[FRONTEND] Step 12: Redirecting to Paystack:', paymentData.authorizationUrl)
        // Use window.location.replace to prevent back button from showing ticket
        window.location.replace(paymentData.authorizationUrl)
        return // Exit function - don't execute anything after redirect
      }

      // If no authorization URL, something went wrong
      console.error('[FRONTEND] ERROR: No authorization URL received')
      throw new Error('Payment initialization failed - no authorization URL received')

    } catch (error) {
      console.error('[FRONTEND] ERROR in purchase flow:', error)
      showError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
        <div className="bg-white border border-zinc-200 rounded-lg p-8 max-w-md w-full text-center">
          <SpinnerIcon size={48} className="animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    )
  }

  if (!event && eventQrCode) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
        <div className="bg-white border border-zinc-200 rounded-lg p-8 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">This QR code has expired or the event was not found.</p>
          <p className="text-sm text-gray-600 mb-4">Please contact the event organizer for a new QR code.</p>
          <Link href="/" className="text-sm text-gray-500">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  if (!eventQrCode) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
        <div className="bg-white border border-zinc-200 rounded-lg p-8 max-w-md w-full text-center">
          <p className="text-gray-600 mb-4">Please scan a QR code to purchase tickets</p>
          <Link href="/" className="text-sm  text-gray-500">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  const totalPrice = ticketPrice * quantity

  const getStepTitle = () => {
    switch (step) {
      case 'personal':
        return 'Personal Information'
      case 'ticket-type':
        return 'Select Ticket Type'
      case 'quantity':
        return 'Select Quantity'
      case 'items':
        return 'Select Menu Items'
      default:
        return 'Book Your Tickets'
    }
  }

  const getStepDescription = () => {
    switch (step) {
      case 'personal':
        return 'Enter your details to continue'
      case 'ticket-type':
        return 'Choose the ticket type that suits you'
      case 'quantity':
        return 'How many tickets would you like?'
      case 'items':
        return 'Select dishes and drinks for each ticket'
      default:
        return 'Complete the form below to reserve your tickets'
    }
  }

  const getStepLabel = (stepName: string) => {
    switch (stepName) {
      case 'personal':
        return 'Personal Info'
      case 'ticket-type':
        return 'Ticket Type'
      case 'quantity':
        return 'Quantity'
      case 'items':
        return 'Menu Items'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen flex justify-center items-center bg-stone-100 p-4">
      <div className="max-w-4xl flex flex-col gap-6 items-start justify-start w-full">

        {/* Back Button - Available on all steps */}
        {step !== 'personal' && (

          <div className="max-w-2xl w-full">
            <button
              onClick={handleBack}
              className="inline-flex items-center justify-center gap-2 text-center rounded-xl active:opacity-80 active:scale-[0.95] transition-transform"
            >
              <ArrowLeftIcon size={20} />
              <span className="active:scale-[0.95] transition-transform">Back</span>
            </button>
          </div>
        )}

        {/* Event Info - Outside form */}
        <AnimatePresence mode="wait">
          {step === 'personal' && (
            <motion.div
              key="event-info"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-left max-w-2xl w-full"
            >
              <h1 className="text-2xl text-zinc-500 font-semibold tracking-tighter mb-2">
                Fill the form below to book your tickets for <span className="text-zinc-800">{event?.name}</span>
              </h1>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Steps - Outside form at top */}
        <div className="mb-8 max-w-2xl w-full flex items-center justify-center">
          <div className="flex items-start justify-between  text-center  max-w-2xl w-full">
            {['personal', 'ticket-type', 'quantity', 'items'].map((s, index) => {
              const isActive = step === s
              const isCompleted = ['personal', 'ticket-type', 'quantity', 'items'].indexOf(step) >
                ['personal', 'ticket-type', 'quantity', 'items'].indexOf(s)
              return (
                <div key={s} className="flex items-center  w-fit">
                  <div className="flex flex-col w-fit items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors ${isActive || isCompleted
                        ? 'bg-zinc-800 text-white'
                        : 'bg-gray-200 text-gray-600'
                        }`}
                    >
                      {index + 1}
                    </div>
                    <span className={`text-xs mt-2 ${isActive ? 'text-zinc-800' : 'text-gray-500'
                      }`}>
                      {getStepLabel(s)}
                    </span>
                  </div>
                  {index < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 transition-colors ${isCompleted ? 'bg-zinc-800' : 'bg-gray-200'
                        }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>



        <div className="rounded-lg flex flex-col gap-8 max-w-2xl w-full">
          {/* Ticket Icons */}
          {/* <div className="w-full flex items-center justify-center p-2 bg-zinc-100 gap-4 mb-8 rounded-full">
            <TicketIcon size={40} weight="duotone" rotate={180} className="animate-pulse text-zinc-900" />
            <TicketIcon size={40} weight="fill" className="text-zinc-900" />
            <TicketIcon size={40} weight="duotone" rotate={180} className="text-zinc-900" />
            <TicketIcon size={40} weight="fill" className="text-zinc-900" />
            <TicketIcon size={40} weight="duotone" rotate={180} className="animate-pulse text-zinc-900" />
          </div> */}

          {/* Step Title and Description */}
          <div className="text-left">
            <h2 className="text-xl font-medium">
              {getStepTitle()}
            </h2>
            <p className="text-gray-600 text-sm">{getStepDescription()}</p>
          </div>

          {/* Form Steps */}
          <AnimatePresence mode="wait">
            {step === 'personal' && (
              <motion.div
                key="personal"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <PersonalInfoForm onNext={handlePersonalInfoNext} />
              </motion.div>
            )}

            {step === 'ticket-type' && (
              <motion.div
                key="ticket-type"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <TicketTypeSelection
                  key={event?.id || 'no-event'}
                  selectedType={selectedTicketType}
                  onSelect={handleTicketTypeSelect}
                  eventId={event?.id}
                />
                {selectedTicketType && (
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleTicketTypeContinue}
                      className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform"
                    >
                      <span className="active:scale-[0.95] transition-transform">Continue</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'quantity' && selectedTicketType && (
              <motion.div
                key="quantity"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Quantity
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newQuantity = Math.max(1, quantity - 1)
                        setQuantity(newQuantity)
                        setQuantityInput(newQuantity.toString())
                      }}
                      disabled={quantity <= 1}
                      className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                      aria-label="Decrease quantity"
                    >
                      <MinusIcon size={20} weight="bold" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={quantityInput}
                      onChange={(e) => {
                        const value = e.target.value
                        setQuantityInput(value)
                        // Allow empty string for typing
                        if (value === '') {
                          return
                        }
                        const numValue = parseInt(value)
                        if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
                          setQuantity(numValue)
                        }
                      }}
                      onBlur={(e) => {
                        // If empty or invalid, reset to current quantity
                        const value = e.target.value
                        if (value === '' || isNaN(parseInt(value)) || parseInt(value) < 1) {
                          setQuantityInput(quantity.toString())
                        } else {
                          const numValue = Math.min(10, Math.max(1, parseInt(value)))
                          setQuantity(numValue)
                          setQuantityInput(numValue.toString())
                        }
                      }}
                      onFocus={(e) => {
                        // Select all text on focus for easy editing
                        e.target.select()
                      }}
                      className="flex-1 px-4 py-2 bg-white shadow-sm border border-gray-300 rounded-lg focus:outline-zinc-800 focus:border-gray-200 transition-colors text-center text-lg font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newQuantity = Math.min(10, quantity + 1)
                        setQuantity(newQuantity)
                        setQuantityInput(newQuantity.toString())
                      }}
                      disabled={quantity >= 10}
                      className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                      aria-label="Increase quantity"
                    >
                      <PlusIcon size={20} weight="bold" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 text-left">
                    {getPeoplePerTicket()} person(s) per ticket × {quantity} ticket(s) = {getTotalSelections()} meal/drink selection(s)
                  </p>
                  <p className="text-lg font-semibold text-orange-500 mt-4 text-left">
                    Total: GHS {totalPrice}
                  </p>
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleQuantitySelect}
                    className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform"
                  >
                    <span className="active:scale-[0.95] transition-transform">Continue</span>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'items' && (
              <motion.div
                key="items"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <TicketItemsForm
                  ticketType={selectedTicketType!}
                  numberOfTickets={getTotalSelections()}
                  onItemsChange={handleItemsChange}
                  eventId={event?.id}
                />
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleProceedToPayment}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-white px-4 py-2 rounded-xl active:opacity-80 active:scale-[0.95] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <SpinnerIcon className="animate-spin" size={20} />
                        <span className="active:scale-[0.95] transition-transform">Processing...</span>
                      </>
                    ) : (
                      <span className="active:scale-[0.95] transition-transform">Proceed to Payment - GHS {totalPrice}</span>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  )
}

export default function NewTicketPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-100 flex items-center justify-center px-4">
          <div className="bg-white border border-zinc-200 rounded-lg p-8 max-w-md w-full text-center">
            <SpinnerIcon size={48} className="animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <NewTicketContent />
    </Suspense>
  )
}

