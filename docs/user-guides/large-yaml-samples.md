# Large YAML Samples

Gridelle includes a generated large YAML workbook for manual profiling and stress testing.

## Generate the Default Sample

```bash
vorbere run generate-large-sample
```

This writes `docs/examples/sample-large.yaml` by default.

## Customize Sample Size

The generator reads these environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SHEET_COUNT` | `5` | Number of sheets to generate. |
| `ROW_COUNT` | `200` | Rows per sheet. |
| `COLUMN_COUNT` | `15` | Columns per row. |

Example:

```bash
SHEET_COUNT=2 ROW_COUNT=1000 COLUMN_COUNT=20 vorbere run generate-large-sample
```

## Custom Output Path

Pass an output path to the npm script when a separate sample file is needed:

```bash
npm run generate-large-sample -- /tmp/gridelle-large.yaml
```

The generated workbook is intended for local performance checks and should not be treated as product documentation.
