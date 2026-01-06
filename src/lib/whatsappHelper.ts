/**
 * WhatsApp Helper Utility
 * Provides functions to open WhatsApp for coach-client communication
 */

export interface WhatsAppConfig {
  phoneNumber?: string;
  message?: string;
}

/**
 * Opens WhatsApp with optional pre-filled message
 * @param config - WhatsApp configuration (phone number and message)
 */
export function openWhatsApp(config: WhatsAppConfig = {}): void {
  const { phoneNumber, message } = config;
  
  let url = 'https://wa.me/';
  
  if (phoneNumber) {
    // Remove any non-digit characters from phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    url += cleanPhone;
  }
  
  if (message) {
    const encodedMessage = encodeURIComponent(message);
    url += `?text=${encodedMessage}`;
  }
  
  // Open in new tab/window
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Get WhatsApp URL for use in Link components
 * @param config - WhatsApp configuration
 * @returns WhatsApp URL string
 */
export function getWhatsAppUrl(config: WhatsAppConfig = {}): string {
  const { phoneNumber, message } = config;
  
  let url = 'https://wa.me/';
  
  if (phoneNumber) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    url += cleanPhone;
  }
  
  if (message) {
    const encodedMessage = encodeURIComponent(message);
    url += `?text=${encodedMessage}`;
  }
  
  return url;
}

