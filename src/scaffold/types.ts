export type TemplateId =
  | 'nextjs-app'
  | 'express-api'
  | 'fastapi-service'
  | 'ts-library'
  | 'cli-tool';

export interface ScaffoldOptions {
  template: TemplateId;
  name: string;
  dir: string;
}

export interface ScaffoldResult {
  created: string[];
  template: TemplateId;
  projectDir: string;
}

export interface TemplateFile {
  path: string;
  content: string;
}
