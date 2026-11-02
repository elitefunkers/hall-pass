export const limits = {
  likeComment: 140,
  promptAnswer: 160,
  message: 1000,
  bio: 300,
  reportDetails: 500,
  minPrompts: 3,
  maxPrompts: 3,
  minPhotos: 2,
  maxPhotos: 6,
  minAge: 18,
  maxAge: 99,
} as const;

export const dataSource = (process.env.EXPO_PUBLIC_DATA_SOURCE ?? 'mock') as 'mock' | 'supabase';

/** Phone codes need an SMS provider in Supabase; offer phone sign-in only once one is set up. */
export const authMethods = {
  phone: dataSource === 'mock' || process.env.EXPO_PUBLIC_ENABLE_PHONE_AUTH === 'true',
};

/** Must match Supabase Auth → Email OTP length / expiry (project defaults: 8 digits, 1 hour). */
export const otp =
  dataSource === 'mock'
    ? { length: 6, expiry: '10 minutes', demo: true }
    : {
        length: Number(process.env.EXPO_PUBLIC_OTP_LENGTH ?? 8),
        expiry: process.env.EXPO_PUBLIC_OTP_EXPIRY ?? '1 hour',
        demo: false,
      };

export const supabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};
