import { extname } from "node:path";
import type { DetectedStack } from "../types.js";

const NODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

export function isTestLikeFile(relPath: string): boolean {
  return (
    relPath.includes("/tests/") ||
    relPath.startsWith("tests/") ||
    relPath.includes("__tests__") ||
    relPath.endsWith(".test.ts") ||
    relPath.endsWith(".test.tsx") ||
    relPath.endsWith(".test.js") ||
    relPath.endsWith(".spec.ts") ||
    relPath.endsWith(".spec.js") ||
    relPath.endsWith("_test.py") ||
    relPath.startsWith("test_")
  );
}

export function isProductionSource(
  relPath: string,
  stack: DetectedStack,
): boolean {
  if (isTestLikeFile(relPath)) return false;
  if (relPath.startsWith(".")) return false;
  if (
    relPath.startsWith("docs/") ||
    relPath.startsWith(".github/") ||
    relPath.endsWith(".md")
  ) {
    return false;
  }

  if (stack.language === "python") {
    return extname(relPath) === ".py";
  }

  if (stack.language === "typescript" || stack.language === "javascript") {
    return NODE_EXTS.has(extname(relPath));
  }

  return false;
}

export function toStackKind(
  stack: DetectedStack,
): "node" | "python" | "unsupported" {
  if (stack.language === "python") return "python";
  if (stack.language === "typescript" || stack.language === "javascript") {
    return "node";
  }
  return "unsupported";
}

export function isUiFile(relPath: string): boolean {
  const path = relPath.toLowerCase();
  const ext = extname(path);
  if (ext === ".tsx" || ext === ".jsx" || ext === ".vue" || ext === ".svelte") {
    return true;
  }
  return (
    path.includes("/components/") ||
    path.includes("/screens/") ||
    path.includes("/pages/") ||
    path.includes("/app/") ||
    path.includes("/ui/")
  );
}

export function isApiFile(relPath: string): boolean {
  const path = relPath.toLowerCase();
  return (
    path.includes("/api/") ||
    path.includes("/route") ||
    path.includes("/routes/") ||
    path.includes("/router") ||
    path.includes("/controller") ||
    path.includes("/endpoint") ||
    path.includes("/handler") ||
    path.includes("/server")
  );
}

export function isBoundaryFile(relPath: string, content: string): boolean {
  const path = relPath.toLowerCase();
  if (
    path.includes("/api/") ||
    path.includes("/controller") ||
    path.includes("/service") ||
    path.includes("/repository") ||
    path.includes("/db") ||
    path.includes("/client")
  ) {
    return true;
  }

  return /fetch\(|axios\.|prisma\.|sequelize\.|supabase\.|redis\.|sql|requests\./.test(
    content,
  );
}

export function isCriticalFlow(relPath: string): boolean {
  return /(auth|login|signup|checkout|payment|billing|security|admin)/i.test(
    relPath,
  );
}
