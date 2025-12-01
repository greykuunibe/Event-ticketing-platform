import Paystack from '@paystack/paystack-sdk'

const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY || '')

export default paystack

export const initializePayment = async (
  email: string,
  amount: number,
  reference: string,
  metadata?: Record<string, any>
) => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://event-ticketing-platform.netlify.app'
    const callbackUrl = `${baseUrl}/tickets/success?reference=${encodeURIComponent(reference)}`
    
    console.log('[PAYSTACK LIB] Initializing payment:', {
      email,
      amount,
      amountInKobo: amount * 0.1,
      reference,
      callbackUrl
    })

    const response = await paystack.transaction.initialize({
      email,
      amount: amount * 0.1, // Convert to kobo/pesewas
      reference,
      metadata,
      callback_url: callbackUrl,
    })

    console.log('[PAYSTACK LIB] Payment initialization response:', {
      status: response.status,
      hasData: !!response.data,
      hasAuthorizationUrl: !!response.data?.authorization_url,
      reference: response.data?.reference
    })

    return response
  } catch (error) {
    console.error('[PAYSTACK LIB] ERROR: Payment initialization failed:', error)
    throw error
  }
}

export const verifyPayment = async (reference: string) => {
  try {
    console.log('[PAYSTACK LIB] Verifying payment with reference:', reference)
    const response = await paystack.transaction.verify(reference)
    
    console.log('[PAYSTACK LIB] Payment verification response:', {
      status: response.status,
      dataStatus: response.data?.status,
      reference: response.data?.reference,
      // amount: response.data?.amount,
      // currency: response.data?.currency
    })

    return response
  } catch (error) {
    console.error('[PAYSTACK LIB] ERROR: Payment verification failed:', error)
    throw error
  }
}

