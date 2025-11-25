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
    const response = await paystack.transaction.initialize({
      email,
      amount: amount * 100, // Convert to kobo/pesewas
      reference,
      metadata,
      // Use query parameter format since Paystack dashboard might override path-based URLs
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/tickets/success?reference=${encodeURIComponent(reference)}`,
    })

    return response
  } catch (error) {
    console.error('Paystack initialization error:', error)
    throw error
  }
}

export const verifyPayment = async (reference: string) => {
  try {
    const response = await paystack.transaction.verify(reference)
    return response
  } catch (error) {
    console.error('Paystack verification error:', error)
    throw error
  }
}

