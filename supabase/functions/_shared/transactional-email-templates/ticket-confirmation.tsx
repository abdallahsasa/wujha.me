import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Img, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "WUJHA"

interface TicketConfirmationProps {
  guestName?: string
  eventTitle?: string
  eventDate?: string
  eventTime?: string
  venueName?: string
  ticketCount?: number
  confirmationUrl?: string
  coverImage?: string
}

const TicketConfirmationEmail = ({
  guestName,
  eventTitle,
  eventDate,
  eventTime,
  venueName,
  ticketCount,
  confirmationUrl,
  coverImage,
}: TicketConfirmationProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>تأكيد تسجيلك في {eventTitle || 'الحدث'}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Logo */}
        <Section style={logoSection}>
          <Img src="https://res.cloudinary.com/dvwgmj04i/image/upload/f_auto,q_auto,w_160/wx9gdjf0tgmpjxbenmd4.png" alt="WUJHA" width="80" style={logoImg} />
        </Section>

        {/* Cover Image */}
        {coverImage && (
          <Section style={coverSection}>
            <Img src={coverImage} alt={eventTitle || ''} width="100%" style={coverImg} />
          </Section>
        )}

        {/* Event Info Card */}
        <Section style={eventCard}>
          <Heading style={eventTitleStyle}>{eventTitle || 'الحدث'}</Heading>
          <Text style={eventMeta}>
            {eventDate && <span>{eventDate}</span>}
            {eventDate && eventTime && <span> • </span>}
            {eventTime && <span>{eventTime}</span>}
          </Text>
          {venueName && <Text style={venueText}>{venueName}</Text>}
        </Section>

        <Hr style={divider} />

        {/* Greeting */}
        <Section style={bodySection}>
          <Text style={greeting}>
            {guestName ? `مرحباً ${guestName}،` : 'مرحباً،'}
          </Text>
          <Text style={bodyText}>
            شكراً لتسجيلك! تذاكرك جاهزة.
          </Text>
          {ticketCount && ticketCount > 0 && (
            <Text style={ticketCountText}>
              عدد التذاكر: {ticketCount}
            </Text>
          )}
        </Section>

        {/* CTA Button */}
        {confirmationUrl && (
          <Section style={ctaSection}>
            <Button href={confirmationUrl} style={ctaButton}>
              عرض التذاكر
            </Button>
          </Section>
        )}

        <Hr style={divider} />

        {/* Footer */}
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
  component: TicketConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.eventTitle
      ? `تأكيد تسجيلك — ${data.eventTitle}`
      : 'تأكيد تسجيلك في الحدث',
  displayName: 'Ticket confirmation',
  previewData: {
    guestName: 'أحمد',
    eventTitle: 'حفل موسيقي',
    eventDate: 'الأربعاء ١٣ أبريل ٢٠٢٦',
    eventTime: '٤:٠٦ م',
    venueName: 'مسرح المدينة',
    ticketCount: 2,
    confirmationUrl: 'https://wujha.me/invite/123/confirmation/456',
    coverImage: '',
  },
} satisfies TemplateEntry

// Styles
const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" }
const container = { maxWidth: '580px', margin: '0 auto', padding: '0' }
const logoSection = { textAlign: 'center' as const, padding: '30px 0 20px' }
const logoImg = { display: 'block', margin: '0 auto' }
const coverSection = { padding: '0' }
const coverImg = { borderRadius: '12px', maxHeight: '280px', objectFit: 'cover' as const, width: '100%' }
const eventCard = { textAlign: 'center' as const, padding: '24px 20px 16px' }
const eventTitleStyle = { fontSize: '22px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 10px', lineHeight: '1.4' }
const eventMeta = { fontSize: '14px', color: '#6b7280', margin: '0 0 6px' }
const venueText = { fontSize: '14px', color: '#6b7280', margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '0 24px' }
const bodySection = { padding: '24px 30px' }
const greeting = { fontSize: '16px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 12px' }
const bodyText = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 8px' }
const ticketCountText = { fontSize: '15px', color: '#d97706', fontWeight: 'bold', margin: '8px 0 0' }
const ctaSection = { textAlign: 'center' as const, padding: '8px 30px 28px' }
const ctaButton = {
  backgroundColor: '#d97706',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '14px 40px',
  borderRadius: '10px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footerSection = { textAlign: 'center' as const, padding: '20px 0 30px' }
const footerText = { fontSize: '12px', color: '#9ca3af', margin: '0' }
const footerBrand = { color: '#d97706' }
