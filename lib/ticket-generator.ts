import { toPng } from 'html-to-image'

export const downloadTicketAsPNG = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error('Ticket element not found')
  }

  try {
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    })

    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('Error generating PNG:', error)
    throw error
  }
}

