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
    <Head>
      <meta charSet="UTF-8" />
    </Head>
    <Preview>{"\u062f\u0639\u0648\u0629 \u0644\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645"} {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Logo */}
        <Section style={logoSection}>
          <Img src="https://res.cloudinary.com/dvwgmj04i/image/upload/f_auto,q_auto,w_160/wx9gdjf0tgmpjxbenmd4.png" alt="WUJHA" width="80" style={logoImg} />
        </Section>

        <Hr style={divider} />

        <Section style={bodySection}>
          <Heading style={h1}>
            {organizerName ? `\u0645\u0631\u062d\u0628\u0627\u064b ${organizerName}\u060c` : '\u0645\u0631\u062d\u0628\u0627\u064b\u060c'}
          </Heading>
          <Text style={bodyText}>
            {"\u062a\u0645\u062a \u062f\u0639\u0648\u062a\u0643 \u0644\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645"} <strong>{SITE_NAME}</strong> {"\u0643\u0645\u0646\u0638\u0651\u0645 \u0641\u0639\u0627\u0644\u064a\u0627\u062a."}
          </Text>
          <Text style={bodyText}>
            {"\u0644\u0625\u0639\u062f\u0627\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u0643 \u0648\u0627\u0644\u0628\u062f\u0621 \u0628\u0625\u062f\u0627\u0631\u0629 \u0641\u0639\u0627\u0644\u064a\u0627\u062a\u0643\u060c \u0627\u0636\u063a\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0623\u062f\u0646\u0627\u0647:"}
          </Text>
        </Section>

        {resetLink && (
          <Section style={ctaSection}>
            <Button href={resetLink} style={ctaButton}>
              {"\u0625\u0639\u062f\u0627\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631"}
            </Button>
          </Section>
        )}

        <Section style={bodySection}>
          <Text style={noteText}>
            {"\u0625\u0630\u0627 \u0644\u0645 \u062a\u0643\u0646 \u062a\u062a\u0648\u0642\u0639 \u0647\u0630\u0647 \u0627\u0644\u062f\u0639\u0648\u0629\u060c \u064a\u0645\u0643\u0646\u0643 \u062a\u062c\u0627\u0647\u0644 \u0647\u0630\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629."}
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
  subject: (SITE_NAME === 'WUJHA' ? '\u062f\u0639\u0648\u0629 \u0644\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 WUJHA' : '\u062f\u0639\u0648\u0629 \u0644\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645'),
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
