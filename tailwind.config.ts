
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				glass: {
					surface: 'rgba(255,255,255,0.06)',
					hover: 'rgba(255,255,255,0.09)',
					border: 'rgba(255,255,255,0.10)',
					'border-hover': 'rgba(255,255,255,0.16)',
					divider: 'rgba(255,255,255,0.06)',
				},
				indigo: {
					DEFAULT: '#6366f1',
					light: '#818cf8',
					dark: '#4f46e5',
					glow: 'rgba(99,102,241,0.35)',
				}
			},
			fontFamily: {
				'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
				'body': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
				'heading': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
			},
			borderRadius: {
				'glass-xl': '28px',
				'glass-lg': '24px',
				'glass-md': '14px',
				'glass-sm': '12px',
				'glass-pill': '999px',
				'glass-img': '20px',
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			spacing: {
				'section-y': '80px',
				'section-x': '48px',
				'card-p': '28px',
				'section-gap': '64px',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(8px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-scale-in': {
					'0%': { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
					'100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
				},
				'fade-scale-out': {
					'0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
					'100%': { opacity: '0', transform: 'scale(0.96) translateY(8px)' }
				},
				'slide-up': {
					'0%': { opacity: '0', transform: 'translateY(30px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'modal-enter': {
					'0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
					'100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
				},
				'pulse-gentle': {
					'0%, 100%': { opacity: '1', transform: 'scale(1)' },
					'50%': { opacity: '0.85', transform: 'scale(1.02)' }
				},
				'typing-dots': {
					'0%, 60%, 100%': { transform: 'translateY(0)' },
					'30%': { transform: 'translateY(-8px)' }
				},
				'loading-bar': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(400%)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out',
				'fade-scale-in': 'fade-scale-in 280ms cubic-bezier(0.4, 0, 0.2, 1)',
				'fade-scale-out': 'fade-scale-out 200ms cubic-bezier(0.4, 0, 0.2, 1)',
				'pulse-gentle': 'pulse-gentle 3s infinite',
				'typing-dots': 'typing-dots 1.4s infinite ease-in-out',
				'slide-up': 'slide-up 0.4s ease-out',
				'loading-bar': 'loading-bar 0.8s ease-in-out infinite',
				'modal-enter': 'modal-enter 280ms ease-out',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
