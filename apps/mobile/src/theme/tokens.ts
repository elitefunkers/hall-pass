import { Platform } from 'react-native';

// Contrast is measured against `canvas` (#FAF8F5): ink 18:1, inkMuted 6.6:1,
// inkSubtle 4.8:1, accent 9.9:1. White on accent is 10.8:1.
export const colors = {
  canvas: '#FAF8F5',
  surface: '#FFFFFF',
  sunken: '#F0ECE7',
  line: '#E7E2DC',
  lineStrong: '#CFC8C0',

  ink: '#161314',
  inkMuted: '#5F5856',
  inkSubtle: '#736C69',
  inkInverse: '#FFFFFF',

  accent: '#5E2A57',
  accentPressed: '#4A2045',
  accentTint: '#F1E6EF',
  onAccent: '#FFFFFF',

  wine: '#2E1530',
  wineInk: '#F8EEF5',
  wineMuted: '#D8C4D4',

  success: '#2E6A4C',
  successTint: '#DCEBDF',
  danger: '#A3261D',
  dangerTint: '#F6DCD8',

  scrim: 'rgba(22, 19, 20, 0.45)',
  photoScrim: 'rgba(10, 8, 9, 0.38)',
} as const;

export const fonts = {
  display: 'Newsreader_600SemiBold',
  displayMedium: 'Newsreader_500Medium',
  displayRegular: 'Newsreader_400Regular',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemibold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 52, lineHeight: 56, letterSpacing: -1.2 },
  display: { fontFamily: fonts.displayMedium, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  title: { fontFamily: fonts.displayMedium, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  answer: { fontFamily: fonts.displayMedium, fontSize: 26, lineHeight: 33, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.bodySemibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodySemibold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
} as const;

export type TypeVariant = keyof typeof type;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 12, md: 16, lg: 20, pill: 999 } as const;

export const layout = {
  maxContentWidth: 560,
  gutter: 20,
  minTouch: 48,
} as const;

export const shadow = Platform.select({
  web: { boxShadow: '0 4px 16px rgba(22, 19, 20, 0.12)' },
  default: {
    shadowColor: '#161314',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});

export const motion = {
  quick: 160,
  standard: 240,
  moment: 420,
} as const;
