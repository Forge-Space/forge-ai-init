import { baseFiles } from './base.js';
import type { TemplateFile } from './types.js';

export function fastapiTemplate(name: string): TemplateFile[] {
  return [
    ...baseFiles(name),
    {
      path: 'pyproject.toml',
      content: `[project]\nname = "${name}"\nversion = "0.1.0"\nrequires-python = ">=3.11"\ndependencies = ["fastapi>=0.115.0", "uvicorn>=0.34.0"]\n\n[project.optional-dependencies]\ndev = ["pytest>=8.0", "ruff>=0.8.0", "mypy>=1.13"]\n\n[tool.ruff]\ntarget-version = "py311"\nline-length = 100\n\n[tool.mypy]\nstrict = true\n`,
    },
    {
      path: 'src/main.py',
      content: `from fastapi import FastAPI\n\napp = FastAPI(title="${name}")\n\n\n@app.get("/health")\ndef health() -> dict[str, str]:\n    return {"status": "ok"}\n`,
    },
    {
      path: 'tests/test_main.py',
      content: `from fastapi.testclient import TestClient\nfrom src.main import app\n\nclient = TestClient(app)\n\n\ndef test_health():\n    response = client.get("/health")\n    assert response.status_code == 200\n    assert response.json() == {"status": "ok"}\n`,
    },
  ];
}
