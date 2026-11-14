# Souq Saver

A budget-aware household grocery agent on the Careem MCP (Careem Builders '26, Dubai, 14 Nov 2026).

| Where | What |
|---|---|
| [sap v2/](sap%20v2/) | **The project, version 2: AI household engine on AWS Bedrock, three demo households (frontend + backend)** |
| [sap v2/SAP_V2.md](sap%20v2/SAP_V2.md) | What v2 changed, the model choice, the three households |
| [sap v2/context.md](sap%20v2/context.md) | SAP V2 from A to Z: architecture, every frontend and backend component |
| [sap v2/FLOWCHART.md](sap%20v2/FLOWCHART.md) | SAP V2 flowchart in chronological order |
| [sap v1/](sap%20v1/) | Version 1: rule-based engine (kept for reference) |
| [sap v1/PROJECT_EXPLAINED.md](sap%20v1/PROJECT_EXPLAINED.md) | Everything explained from A to Z |
| [sap v1/README.md](sap%20v1/README.md) | Short version: run, architecture, API, limits |
| [sap v1/demo/DEMO.md](sap%20v1/demo/DEMO.md) | Three-minute demo script with the real numbers |
| [context/](context/README.md) | Planning pack written before the build |
| `FABLE_*.md` | The build prompts the project follows |

```bash
cd "sap v2"
npm install
cp .env.example .env   # add AWS credentials and BEDROCK_MODEL_ID (see sap v2/SAP_V2.md)
npm run dev            # then open http://localhost:5173
```
