import { z } from 'zod';
import type { Game, Submission } from '../shared/game';
export const submissionSchema = z.object({ language: z.literal('python'), source: z.string().min(1).max(65536), problemVersion: z.literal(1) }).strict();
export const socketSchema = z.object({ protocolVersion: z.literal(1), type: z.enum(['client.hello', 'client.ping', 'match.resync']) }).strict();
export type PublicSubmission = Pick<Submission, 'id' | 'kind' | 'receiptMs' | 'verdict' | 'output' | 'runtimeMs'>;
export type Snapshot = Omit<Game, 'submissions' | 'players' | 'problemId'> & {
  players: { id: string; username: string; rating: number; ready: boolean; online: boolean }[];
  submissions: PublicSubmission[]; serverTime: number; problem?: PublicProblem;
};
export type PublicProblem = { id: string; version: number; title: string; difficulty: string; topic: string; statement: string; inputFormat: string; outputFormat: string; constraints: string[]; examples: { input: string; output: string; explanation?: string }[]; starterCode: string };
