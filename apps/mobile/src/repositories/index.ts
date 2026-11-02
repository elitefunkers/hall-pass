import { dataSource } from '@/config';
import { createMockRepository } from './mock/mockRepository';
import { createSupabaseRepository } from './supabase/supabaseRepository';
import type { DataRepository } from './types';

export const repository: DataRepository = dataSource === 'supabase' ? createSupabaseRepository() : createMockRepository();
export { DataError } from './types';
export type { DataRepository } from './types';
