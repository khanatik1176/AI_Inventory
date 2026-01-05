import type { Config } from 'tailwindcss';
import tailwindanimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // screens: {
      //   'lg-xl': { min: '1280px', max: '1600px' },
      // },
      colors: {
        primary: '#4A70A9',
        secondary: '#8FABD4',
        tertiary: '#1D546C',
        deepPrimaryBorder: '#8B4115',
        lightBlack: '#454545',
        congressBlue: '#133B67',
        destructive: '#DC2626',
        placeholder: '#5D5D5D',
        textPrimary: '#0C1B31',
        textSecondary: '#a2acb9',
        textLight: '#D1D1D1',
        subHeading: '#858C95',
        errorColor: '#C8322B',
        errorBgColor: '#FEF2F2',
        successColor: '#268E34',
        textMuted: '#71717A',
        textBlack: '#09090B',
        pageBg: '#F8F9FB',
        disabledBg: '#F4F4F5',
        infoBg: '#E8F1FE',
        errorBg: '#FFEFEE',
        successBg: '#F3FFF6',
        bgSecondary: '#F8F9FB',
        bgPrimary: '#CFE2FD',
        bgWarning: '#FFE4C0',
        bgSuccess: '#B1EEB9',
        primaryHover: '#255394',
        secondaryHover: '#E4E4E7',
        outlineHover: '#D4D4D8',
        destructiveHover: '#B91C1C',
        primaryFocus: '#193863',
        secondaryFocus: '#F4F4F5',
        destructiveFocus: '#DC2626',
        borderColor: '#E4E4E7 !important',
        menuTextColor: '#596574',
        emptyTableIconColor: '#9599A1',
        blackishBg: '#18181B',
        lightWhiteColor: '#FAFAFA',
        lightBtnColor: '#F4F4F5',
        deepBlackColor: '#020617',
        lightBlueBg: '#0EA5E9',
        lightAquaBg: '#F1F5F9',
        inputFooterColor: '#64748B',
        lightborderColor: '#E2E8F0',
        lightRedBg: '#FEE2E2',
        miniSubheadingColor: '#334155',
        sidebarSecondaryColor: '#334155B2',
        sidebarHoverBg: '#DBE5F0',
        navbartextColor: '#334155',
        lightShadeWhiteColor: '#B8B8BA',
        cardBG: '#E7E7E7',
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      fontSize: {
        twelve: ['0.75rem', '1rem'], // 12px
        xs: ['0.813rem', '1.125rem'], // 13px
        sm: ['0.875rem', '1.25rem'], // 14px
        base: ['0.938rem', '1.375rem'], // 15px
        xl: ['1rem', '1.5rem'], // 16px
        xxl: ['1.125rem', '1.75rem'], // 18px
        headingXXS: ['1.25rem', '1.75rem'], // 20px
        headingXS: ['1.375rem', '1.875rem'], // 22px
        headingS: ['1.75rem', '2.375rem'], // 28px
        headingBase: ['2rem', '2.5rem'], // 32px
        headingL: ['2.25rem', '2.75rem'], // 36px
        headingXL: ['2.5rem', '3rem'], // 40px
      },
      backgroundImage: {
        hashing:
          'radial-gradient(circle, rgba(54,116,181,1) 19%, rgba(18,75,134,1) 89%);',
        gradientBg:
          'linear-gradient(180deg, rgba(71, 157, 233, 0.25) 0%, rgba(18, 75, 134, 0.25) 100%)',
        'custom-blend': 'linear-gradient(180deg, #7F7F7F80, #3D3D3D)',
        'primary-gradient': 'linear-gradient(135deg, #CE7411 0%, #8B4115 100%)',
        'notepad': "url('/Images/Bg-image.svg')",
      },
      boxShadow: {
        input: `0px 2px 3px -1px rgba(0,0,0,0.1), 0px 1px 0px 0px rgba(25,28,33,0.02), 0px 0px 0px 1px rgba(25,28,33,0.08)`,
      },
      keyframes: {
        'dot-bounce': {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.9' },
          '30%': { transform: 'translateY(-6px)', opacity: '1' },
        },
      },
      animation: {
        'dot-bounce': 'dot-bounce 1s infinite',
      },
    },
  },
  plugins: [tailwindanimate],
} satisfies Config;
