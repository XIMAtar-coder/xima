/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'XIMA'
const SITE_URL = 'https://ximatar.com'

interface WelcomeProps {
  name?: string
  locale?: 'it' | 'en' | 'es'
}

const COPY = {
  it: {
    subject: 'Benvenuto in XIMA',
    preview: 'Inizia a scoprire il tuo XIMAtar',
    hi: (n: string) => `Ciao ${n},`,
    intro:
      'Benvenuto in XIMA — la piattaforma di Decision Intelligence che ti aiuta a scoprire il tuo potenziale comportamentale attraverso il tuo XIMAtar.',
    next: 'Ecco i prossimi passi:',
    b1: 'Affronta la XIMA Challenge per generare il tuo XIMAtar sui 5 pilastri',
    b2: 'Esplora i tuoi punti di forza e le aree di crescita',
    b3: 'Connetti con mentor specializzati sulle tue aree di sviluppo',
    cta: 'Inizia ora',
    footer:
      'Questa email è stata inviata da XIMA. Se non hai creato un account, puoi ignorare questo messaggio.',
  },
  en: {
    subject: 'Welcome to XIMA',
    preview: 'Start discovering your XIMAtar',
    hi: (n: string) => `Hi ${n},`,
    intro:
      'Welcome to XIMA — the Decision Intelligence platform that helps you discover your behavioral potential through your XIMAtar.',
    next: "Here's what to do next:",
    b1: 'Take the XIMA Challenge to generate your XIMAtar across the 5 pillars',
    b2: 'Explore your strengths and growth areas',
    b3: 'Connect with mentors specialized in your development needs',
    cta: 'Get started',
    footer:
      "This email was sent by XIMA. If you didn't create an account, you can safely ignore this message.",
  },
  es: {
    subject: 'Bienvenido a XIMA',
    preview: 'Empieza a descubrir tu XIMAtar',
    hi: (n: string) => `Hola ${n},`,
    intro:
      'Bienvenido a XIMA — la plataforma de Decision Intelligence que te ayuda a descubrir tu potencial conductual a través de tu XIMAtar.',
    next: 'Estos son los siguientes pasos:',
    b1: 'Afronta el XIMA Challenge para generar tu XIMAtar sobre los 5 pilares',
    b2: 'Explora tus fortalezas y áreas de crecimiento',
    b3: 'Conecta con mentores especializados en tus áreas de desarrollo',
    cta: 'Empezar',
    footer:
      'Este correo fue enviado por XIMA. Si no creaste una cuenta, puedes ignorar este mensaje.',
  },
}

const WelcomeEmail = ({ name, locale = 'it' }: WelcomeProps) => {
  const t = COPY[locale] || COPY.it
  const displayName = name || (locale === 'en' ? 'there' : locale === 'es' ? 'hola' : 'a te')
  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brand}>
            <Text style={brandText}>{SITE_NAME}</Text>
          </Section>
          <Heading style={h1}>
            {locale === 'it'
              ? `Benvenuto in XIMA, ${displayName}`
              : locale === 'es'
              ? `Bienvenido a XIMA, ${displayName}`
              : `Welcome to XIMA, ${displayName}`}
          </Heading>
          <Text style={text}>{t.intro}</Text>
          <Text style={text}>{t.next}</Text>
          <ul style={list}>
            <li style={li}>{t.b1}</li>
            <li style={li}>{t.b2}</li>
            <li style={li}>{t.b3}</li>
          </ul>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button style={button} href={SITE_URL}>
              {t.cta}
            </Button>
          </Section>
          <Text style={footer}>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: (data: Record<string, any>) => {
    const loc = (data?.locale as 'it' | 'en' | 'es') || 'it'
    return COPY[loc]?.subject || COPY.it.subject
  },
  displayName: 'Welcome email',
  previewData: { name: 'Giulia', locale: 'it' },
} satisfies TemplateEntry

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
const list = { paddingLeft: '20px', margin: '0 0 16px' }
const li = { fontSize: '15px', color: '#3a4a5c', lineHeight: 1.6, marginBottom: '6px' }
const button = {
  backgroundColor: '#0B6BFF',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '40px 0 0',
  lineHeight: 1.5,
}
