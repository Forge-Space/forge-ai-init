export type MigrationStrategy =
  | 'strangler-fig'
  | 'branch-by-abstraction'
  | 'parallel-run'
  | 'lift-and-shift';

export interface MigrationPhase {
  name: string;
  threshold: number;
  focus: string[];
  tasks: string[];
}

export interface MigrationFile {
  path: string;
  content: string;
}
