export {
  scanProject,
  scanSpecificFiles,
  type Finding,
  type ScanReport,
  type Severity,
  type FindingCategory,
  type CategoryScore,
  type FileScore,
} from './scanner.js';

export {
  loadConfig,
  isRuleDisabled,
  getRuleSeverity,
  isCategoryEnabled,
  isFileIgnored,
  type ForgeConfig,
} from './config.js';

export {
  runAudit,
  type AuditReport,
  type CheckStatus,
} from './checker.js';

export {
  assessProject,
  type AssessmentReport,
} from './assessor.js';

export {
  saveBaseline,
  compareBaseline,
  loadBaseline,
  type BaselineData,
  type BaselineEntry,
  type BaselineComparison,
} from './baseline.js';

export {
  generatePlan,
  type ArchPlan,
} from './planner.js';

export {
  runDoctor,
  type HealthReport,
  type HealthCheck,
} from './doctor.js';

export {
  runGate,
  type GateResult,
} from './gate.js';

export {
  scaffold,
  TEMPLATE_LIST,
  type TemplateId,
  type ScaffoldResult,
} from './scaffold.js';

export {
  analyzeMigration,
  type MigrationPlan,
} from './migrate-analyzer.js';

export {
  generateCiPipeline,
  type CiOptions,
  type CiResult,
} from './ci-command.js';

export {
  analyzeDiff,
  type DiffOptions,
  type DiffResult,
  type DiffFinding,
} from './diff-analyzer.js';

export {
  detectStack,
} from './detector.js';

export type {
  DetectedStack,
  Tier,
  AITool,
} from './types.js';

export {
  writeReport,
  type ReportFormat,
} from './reporter.js';

export {
  runTestAutogen,
  toActionFindings,
  summarizeTestAutogen,
  type TestAutogenResult,
  type TestAutogenRequirement,
  type TestAutogenOptions,
} from './test-autogen.js';
