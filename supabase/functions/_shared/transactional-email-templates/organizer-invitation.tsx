/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Img, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "WUJHA"

interface OrganizerInvitationProps {
  organizerName?: string
  resetLink?: string
}

const OrganizerInvitationEmail = ({
  organizerName,
  resetLink,
}: OrganizerInvitationProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>دعوة للانضمام إلى لوحة تحكم {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Logo */}
        <Section style={logoSection}>
          <Img src="https://res.cloudinary.com/dvwgmj04i/image/upload/f_auto,q_auto,w_160/wx9gdjf0tgmpjxbenmd4.png" alt="WUJHA" width="80" style={logoImg} />
        </Section>

        <Hr style={divider} />

        <Section style={bodySection}>
          <Heading style={h1}>
            {organizerName ? `مرحباً ${organizerName}،` : 'مرحباً،'}
          </Heading>
          <Text style={bodyText}>
            تمت دعوتك للانضمام إلى لوحة تحكم <strong>{SITE_NAME}</strong> كمنظّم فعاليات.
          </Text>
          <Text style={bodyText}>
            لإعداد كلمة المرور الخاصة بك والبدء بإدارة فعالياتك، اضغط على الزر أدناه:
          </Text>
        </Section>

        {resetLink && (
          <Section style={ctaSection}>
            <Button href={resetLink} style={ctaButton}>
              إعداد كلمة المرور
            </Button>
          </Section>
        )}

        <Section style={bodySection}>
          <Text style={noteText}>
            إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذه الرسالة.
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
  component: OrganizerInvitationEmail,
  subject: 'دعوة للانضمام إلى لوحة تحكم WUJHA',
  displayName: 'Organizer invitation',
  previewData: {
    organizerName: 'أحمد',
    resetLink: 'https://wujha.me/admin/reset-password',
  },
} satisfies TemplateEntry

// Styles
const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" }
const container = { maxWidth: '580px', margin: '0 auto', padding: '0' }
const logoSection = { textAlign: 'center' as const, padding: '30px 0 20px' }
const logoImg = { display: 'block', margin: '0 auto' }
const divider = { borderColor: '#e5e7eb', margin: '0 24px' }
const bodySection = { padding: '24px 30px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 16px', lineHeight: '1.4' }
const bodyText = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px' }
const noteText = { fontSize: '13px', color: '#9ca3af', lineHeight: '1.5', margin: '0' }
const ctaSection = { textAlign: 'center' as const, padding: '8px 30px 28px' }
const ctaButton = {
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '14px 40px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footerSection = { textAlign: 'center' as const, padding: '20px 0 30px' }
const footerText = { fontSize: '12px', color: '#9ca3af', margin: '0' }
const footerBrand = { color: '#1a1a1a', fontWeight: 'bold' as const }
