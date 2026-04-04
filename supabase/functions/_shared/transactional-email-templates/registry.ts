/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as ticketConfirmation } from './ticket-confirmation.tsx'
import { template as organizerInvitation } from './organizer-invitation.tsx'
import { template as paymentRejected } from './payment-rejected.tsx'
import { template as paymentExpired } from './payment-expired.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'ticket-confirmation': ticketConfirmation,
  'organizer-invitation': organizerInvitation,
  'payment-rejected': paymentRejected,
  'payment-expired': paymentExpired,
}
