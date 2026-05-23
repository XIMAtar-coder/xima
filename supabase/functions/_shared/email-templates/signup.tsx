/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Conferma la tua email per {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brand}>
          <Text style={brandText}>XIMA</Text>
        </Section>

        <Heading style={h1}>Conferma la tua email</Heading>
        <Text style={text}>
          Grazie per esserti registrato su{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Per attivare il tuo account e iniziare la XIMA Challenge,
          conferma il tuo indirizzo email ({recipient}) cliccando il
          pulsante qui sotto.
        </Text>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Verifica la mia email
          </Button>
        </Section>

        <Text style={textMuted}>
          Il link rimane valido per 24 ore. Se non riesci a cliccare il
          pulsante, copia e incolla questo indirizzo nel browser:
        </Text>
        <Text style={urlText}>{confirmationUrl}</Text>

        <Text style={divider}>— English —</Text>
        <Text style={textMuted}>
          Thanks for signing up for {siteName}. Confirm your email
          ({recipient}) using the button above. The link is valid for 24 hours.
        </Text>

        <Text style={divider}>— Español —</Text>
        <Text style={textMuted}>
          Gracias por registrarte en {siteName}. Confirma tu correo
          ({recipient}) usando el botón de arriba. El enlace es válido
          durante 24 horas.
        </Text>

        <Text style={footer}>
          Se non hai creato un account, puoi ignorare questa email. /
          If you didn't sign up, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Arial, sans-serif',
}
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const brand = { marginBottom: '24px' }
const brandText = {
  fontSize: '14px',
  fontWeight: 700 as const,
  letterSpacing: '0.18em',
  color: '#0B6BFF',
  margin: 0,
}
const h1 = {
  fontSize: '26px',
  fontWeight: 700 as const,
  color: '#071E3A',
  letterSpacing: '-0.01em',
  lineHeight: 1.2,
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#3a4a5c',
  lineHeight: 1.6,
  margin: '0 0 16px',
}
const textMuted = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: 1.6,
  margin: '0 0 10px',
}
const urlText = {
  fontSize: '12px',
  color: '#0B6BFF',
  wordBreak: 'break-all' as const,
  margin: '0 0 20px',
}
const link = { color: '#0B6BFF', textDecoration: 'underline' }
const button = {
  backgroundColor: '#0B6BFF',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const divider = {
  fontSize: '11px',
  color: '#94a3b8',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  margin: '24px 0 8px',
  textAlign: 'center' as const,
}
const footer = { fontSize: '12px', color: '#94a3b8', margin: '32px 0 0', lineHeight: 1.5 }
