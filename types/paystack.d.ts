declare module '@paystack/paystack-sdk' {
    interface InitializePaymentOptions {
      email: string
      amount: number
      reference: string
      metadata?: Record<string, any>
      callback_url?: string
    }
  
    interface PaymentResponse {
      status: boolean
      message: string
      data: {
        authorization_url: string
        access_code: string
        reference: string
        status?: string
      }
    }
  
    interface Transaction {
      initialize(options: InitializePaymentOptions): Promise<PaymentResponse>
      verify(reference: string): Promise<PaymentResponse>
    }
  
    class Paystack {
      constructor(secretKey: string)
      transaction: Transaction
    }
  
    export default Paystack
  }