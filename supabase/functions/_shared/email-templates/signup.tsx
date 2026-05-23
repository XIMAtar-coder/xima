/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
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
    <Preview>Conferma la tua email e inizia la XIMA Challenge</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img
            src="https://ximatar.com/images/xima-full-dark.svg"
            alt="XIMA"
            width="120"
            height="32"
            style={logo}
          />
        </Section>

        <Section style={hero}>
          <Heading style={h1}>Benvenuto in XIMA</Heading>
          <Text style={lede}>
            XIMA è la piattaforma di <strong>Decision Intelligence</strong> che
            trasforma il modo in cui le persone scoprono il proprio potenziale
            e le aziende scelgono i talenti giusti.
          </Text>
        </Section>

        <Section style={card}>
          <Text style={text}>
            Conferma il tuo indirizzo email (<strong>{recipient}</strong>) per
            attivare il tuo account e iniziare la <strong>XIMA Challenge</strong>,
            il percorso che misura le tue 5 dimensioni: Conoscenza,
            Comunicazione, Computazione, Creatività e Drive.
          </Text>

          <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
            <Button style={button} href={confirmationUrl}>
              Verifica la mia email
            </Button>
          </Section>

          <Text style={textMuted}>
            Il link è valido per 24 ore. Se il pulsante non funziona, copia
            questo indirizzo nel browser:
          </Text>
          <Text style={urlText}>{confirmationUrl}</Text>
        </Section>

        <Section style={pillars}>
          <Text style={pillarsTitle}>Cosa scoprirai con XIMA</Text>
          <Text style={pillarItem}>● Il tuo XIMAtar, l'archetipo che racconta come pensi e agisci</Text>
          <Text style={pillarItem}>● Le tue 5 dimensioni misurate con scenari reali, non test astratti</Text>
          <Text style={pillarItem}>● Opportunità e mentor selezionati sul tuo profilo</Text>
        </Section>

        <Hr style={hr} />

        <Text style={divider}>— English —</Text>
        <Text style={textMuted}>
          Welcome to {siteName}. Confirm your email ({recipient}) using the
          button above to activate your account and start the XIMA Challenge.
          The link is valid for 24 hours.
        </Text>

        <Text style={divider}>— Español —</Text>
        <Text style={textMuted}>
          Bienvenido a {siteName}. Confirma tu correo ({recipient}) usando el
          botón de arriba para activar tu cuenta. El enlace es válido durante
          24 horas.
        </Text>

        <Text style={footer}>
          Se non hai creato un account su{' '}
          <Link href={siteUrl} style={link}>{siteName}</Link>, puoi ignorare
          questa email. / If you didn't sign up, you can safely ignore this email.
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
const container = { padding: '32px 28px', maxWidth: '600px', margin: '0 auto' }
const header = { marginBottom: '8px' }
const logo = { display: 'block' }
const hero = { margin: '20px 0 24px' }
const h1 = {
  fontSize: '28px',
  fontWeight: 700 as const,
  color: '#071E3A',
  letterSpacing: '-0.02em',
  lineHeight: 1.15,
  margin: '0 0 12px',
}
const lede = {
  fontSize: '16px',
  color: '#3a4a5c',
  lineHeight: 1.55,
  margin: 0,
}
const card = {
  background: 'linear-gradient(180deg, #f7faff 0%, #ffffff 100%)',
  border: '1px solid #e6ecf5',
  borderRadius: '16px',
  padding: '24px',
  margin: '8px 0 24px',
}
const text = {
  fontSize: '15px',
  color: '#3a4a5c',
  lineHeight: 1.6,
  margin: '0 0 8px',
}
const textMuted = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: 1.6,
  margin: '0 0 8px',
}
const urlText = {
  fontSize: '12px',
  color: '#0B6BFF',
  wordBreak: 'break-all' as const,
  margin: '0',
}
const link = { color: '#0B6BFF', textDecoration: 'underline' }
const button = {
  backgroundColor: '#0B6BFF',
  backgroundImage: 'linear-gradient(135deg, #0B6BFF 0%, #2E8BFF 100%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '12px',
  padding: '14px 32px',
  textDecoration: 'none',
  boxShadow: '0 6px 18px rgba(11,107,255,0.25)',
}
const pillars = { margin: '8px 0 16px' }
const pillarsTitle = {
  fontSize: '13px',
  fontWeight: 700 as const,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: '#071E3A',
  margin: '0 0 8px',
}
const pillarItem = {
  fontSize: '14px',
  color: '#3a4a5c',
  lineHeight: 1.5,
  margin: '4px 0',
}
const hr = { border: 'none', borderTop: '1px solid #e6ecf5', margin: '24px 0' }
const divider = {
  fontSize: '11px',
  color: '#94a3b8',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  margin: '20px 0 6px',
  textAlign: 'center' as const,
}
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0', lineHeight: 1.5 }
