import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Img, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "WUJHA"

interface PaymentRejectedProps {
  guestName?: string
  eventTitle?: string
  eventDate?: string
  venueName?: string
  ticketCount?: number
  supportWhatsApp?: string
}

const PaymentRejectedEmail = ({
  guestName,
  eventTitle,
  eventDate,
  venueName,
  ticketCount,
  supportWhatsApp,
}: PaymentRejectedProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>لم يتم تأكيد الدفع — {eventTitle || 'الحدث'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src="https://res.cloudinary.com/dvwgmj04i/image/upload/f_auto,q_auto,w_160/wx9gdjf0tgmpjxbenmd4.png" alt="WUJHA" width="80" style={logoImg} />
        </Section>

        <Section style={iconSection}>
          <Text style={iconText}>✕</Text>
        </Section>

        <Section style={bodySection}>
          <Heading style={h1}>
            {guestName ? `عذراً ${guestName}،` : 'عذراً،'}
          </Heading>
          <Text style={bodyText}>
            لم يتم تأكيد الدفع لحجزك في <strong>{eventTitle || 'الحدث'}</strong>.
          </Text>
          {eventDate && <Text style={metaText}>📅 {eventDate}</Text>}
          {venueName && <Text style={metaText}>📍 {venueName}</Text>}
          {ticketCount && <Text style={metaText}>🎟️ عدد التذاكر: {ticketCount}</Text>}

          <Text style={bodyText}>
            إذا كنت قد أجريت عملية الدفع بالفعل، يرجى التواصل مع فريق الدعم وإرسال إيصال الدفع.
          </Text>

          {supportWhatsApp && (
            <Text style={bodyText}>
              تواصل معنا عبر واتساب: <a href={`https://wa.me/${supportWhatsApp}`} style={linkStyle}>{supportWhatsApp}</a>
            </Text>
          )}
        </Section>

        <Hr style={divider} />

        <Section style={footerSection}>
          <Text style={footerText}>
            Powered by <span style={footerBrand}>{SITE_NAME}</span>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentRejectedEmail,
  subject: (data: Record<string, any>) =>
    data?.eventTitle
      ? `لم يتم تأكيد الدفع — ${data.eventTitle}`
      : 'لم يتم تأكيد الدفع',
  displayName: 'Payment rejected',
  previewData: {
    guestName: 'أحمد',
    eventTitle: 'حفل موسيقي',
    eventDate: 'الأربعاء ١٣ أبريل ٢٠٢٦',
    venueName: 'مسرح المدينة',
    ticketCount: 2,
    supportWhatsApp: '963999999999',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" }
const container = { maxWidth: '580px', margin: '0 auto', padding: '0' }
const logoSection = { textAlign: 'center' as const, padding: '30px 0 10px' }
const logoImg = { display: 'block', margin: '0 auto' }
const iconSection = { textAlign: 'center' as const, padding: '10px 0' }
const iconText = { fontSize: '48px', color: '#ef4444', margin: '0', lineHeight: '1' }
const bodySection = { padding: '16px 30px 24px' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 16px' }
const bodyText = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px' }
const metaText = { fontSize: '14px', color: '#6b7280', margin: '0 0 6px' }
const linkStyle = { color: '#d97706', textDecoration: 'underline' }
const divider = { borderColor: '#e5e7eb', margin: '0 24px' }
const footerSection = { textAlign: 'center' as const, padding: '20px 0 30px' }
const footerText = { fontSize: '12px', color: '#9ca3af', margin: '0' }
const footerBrand = { color: '#d97706' }
