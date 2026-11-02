import { z } from 'zod';
import { limits, otp } from '@/config';
import { ageFromDateOfBirth } from '@/utils/age';

export const genderSchema = z.enum(['woman', 'man', 'nonbinary']);
export const orientationSchema = z.enum([
  'straight',
  'gay',
  'lesbian',
  'bisexual',
  'queer',
  'pansexual',
  'asexual',
  'prefer_not_to_say',
]);

export const firstNameSchema = z
  .string()
  .trim()
  .min(1, 'Add your first name.')
  .max(30, 'Keep it under 30 characters.')
  .regex(/^[\p{L}][\p{L}' -]*$/u, 'Use letters only — no numbers or symbols.');

export const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a full date of birth.')
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), 'That date doesn’t exist.')
  .refine((v) => ageFromDateOfBirth(v) >= limits.minAge, 'You need to be 18 or older to use Hall Pass.')
  .refine((v) => ageFromDateOfBirth(v) <= 110, 'Check the year you entered.');

export const broadLocationSchema = z
  .string()
  .trim()
  .min(2, 'Add a neighbourhood or city.')
  .max(40, 'Keep it to a neighbourhood or city.')
  .refine((v) => !/\d{1,5}\s+\w+\s+(st|street|ave|avenue|rd|road|lane|ln)\b/i.test(v), 'Use a broad area, not a street address.');

export const profileDetailsSchema = z.object({
  firstName: firstNameSchema,
  dateOfBirth: dateOfBirthSchema,
  gender: genderSchema,
  orientation: orientationSchema,
  broadLocation: broadLocationSchema,
});

export const preferencesSchema = z
  .object({
    interestedIn: z.array(genderSchema).min(1, 'Choose at least one.'),
    minAge: z.number().int().min(limits.minAge).max(limits.maxAge),
    maxAge: z.number().int().min(limits.minAge).max(limits.maxAge),
    maxDistanceKm: z.number().int().min(1).max(300).nullable(),
  })
  .refine((p) => p.minAge <= p.maxAge, { message: 'Minimum age can’t be above maximum age.', path: ['maxAge'] });

export const promptAnswerSchema = z
  .string()
  .trim()
  .min(2, 'Write a little more.')
  .max(limits.promptAnswer, `Keep it under ${limits.promptAnswer} characters.`);

export const likeCommentSchema = z.string().trim().max(limits.likeComment).optional();

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, 'Write a message first.')
  .max(limits.message, `Messages can be up to ${limits.message} characters.`);

export const reportSchema = z.object({
  reportedUserId: z.string().min(1),
  messageId: z.string().optional(),
  reason: z.enum(['fake_profile', 'inappropriate_content', 'harassment', 'scam_or_spam', 'underage', 'safety_concern', 'other']),
  details: z.string().trim().max(limits.reportDetails).optional(),
  alsoBlock: z.boolean(),
});

export const emailSchema = z.email('Enter a valid email address.');
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a phone number with country code, like +44 7700 900123.');
export const codeSchema = z.string().regex(new RegExp(`^\\d{${otp.length}}$`), `Enter the ${otp.length}-digit code.`);

/** Returns the first error message for a value, or null when valid. */
export function firstError(schema: z.ZodType, value: unknown): string | null {
  const result = schema.safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? 'Check this field.');
}
