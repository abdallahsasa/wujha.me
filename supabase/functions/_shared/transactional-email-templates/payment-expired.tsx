import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Img, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "WUJHA"

interface PaymentExpiredProps {
  guestName?: string
  eventTitle?: string
  eventDate?: string
  venueName?: string
  ticketCount?: number
}

const PaymentExpiredEmail = ({
  guestName,
  eventTitle,
  eventDate,
  venueName,
  ticketCount,
}: PaymentExpiredProps) => (
  <Html lang="ar" dir="rtl">
    <Head>
      <meta charSet="UTF-8" />
    </Head>
    <Preview>{"\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u0627\u0644\u062f\u0641\u0639"} \u2014 {eventTitle || "\u0627\u0644\u062d\u062f\u062b"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src="https://res.cloudinary.com/dvwgmj04i/image/upload/f_auto,q_auto,w_160/wx9gdjf0tgmpjxbenmd4.png" alt="WUJHA" width="80" style={logoImg} />
        </Section>

        <Section style={iconSection}>
          <Text style={iconText}>⏰</Text>
        </Section>

        <Section style={bodySection}>
          <Heading style={h1}>
            {guestName ? `\u0645\u0631\u062d\u0628\u0627\u064b ${guestName}\u060c` : '\u0645\u0631\u062d\u0628\u0627\u064b\u060c'}
          </Heading>
          <Text style={bodyText}>
            {"\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u0627\u0644\u062f\u0641\u0639 (\u0662\u0664 \u0633\u0627\u0639\u0629) \u0644\u062d\u062c\u0632\u0643 \u0641\u064a"} <strong>{eventTitle || "\u0627\u0644\u062d\u062f\u062b"}</strong> {"\u0648\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062a\u0630\u0627\u0643\u0631 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b."}
          </Text>
          {eventDate && <Text style={metaText}>📅 {eventDate}</Text>}
          {venueName && <Text style={metaText}>📍 {venueName}</Text>}
          {ticketCount && <Text style={metaText}>🎟️ {"\u0639\u062f\u062f \u0627\u0644\u062a\u0630\u0627\u0643\u0631: "} {ticketCount}</Text>}

          <Text style={bodyText}>
            {"\u064a\u0645\u0643\u0646\u0643 \u0625\u0631\u0627\u062f\u0629 \u0627\u0644\u062d\u062c\u0632 \u0645\u0646 \u062c\u062f\u064a\u062f \u0625\u0630\u0627 \u0643\u0627\u0646\u062a \u0627\u0644\u062a\u0630\u0627\u0643\u0631 \u0644\u0627 \u062a\u0632\u0627\u0644 \u0645\u062a\u0627\u062d\u0629."}
          </Text>
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
  component: PaymentExpiredEmail,
  subject: (data: Record<string, any>) =>
    data?.eventTitle
      ? `\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u0627\u0644\u062f\u0641\u0639 \u2014 ${data.eventTitle}`
      : '\u0627\u0646\u062a\u0647\u062a \u0645\u0647\u0644\u0629 \u0627\u0644\u062f\u0641\u0639',
  displayName: 'Payment expired',
  previewData: {
    guestName: 'أحمد',
    eventTitle: 'حفل موسيقي',
    eventDate: 'الأربعاء ١٣ أبريل ٢٠٢٦',
    venueName: 'مسرح المدينة',
    ticketCount: 2,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" }
const container = { maxWidth: '580px', margin: '0 auto', padding: '0' }
const logoSection = { textAlign: 'center' as const, padding: '30px 0 10px' }
const logoImg = { display: 'block', margin: '0 auto' }
const iconSection = { textAlign: 'center' as const, padding: '10px 0' }
const iconText = { fontSize: '48px', color: '#d97706', margin: '0', lineHeight: '1' }
const bodySection = { padding: '16px 30px 24px' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 16px' }
const bodyText = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px' }
const metaText = { fontSize: '14px', color: '#6b7280', margin: '0 0 6px' }
const divider = { borderColor: '#e5e7eb', margin: '0 24px' }
const footerSection = { textAlign: 'center' as const, padding: '20px 0 30px' }
const footerText = { fontSize: '12px', color: '#9ca3af', margin: '0' }
const footerBrand = { color: '#d97706' }
