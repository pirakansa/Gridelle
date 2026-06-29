# Built-in Functions Reference

Gridelle ships built-in spreadsheet functions that do not require a WebAssembly module. The current built-ins are `sum` and `multiply`. They can be assigned to cells from the function menu or by editing YAML directly.

## YAML Shape

Cell functions are stored in the `func` property of a cell value.

```yaml
rows:
  - effort:
      value: ""
      func:
        name: sum
        args:
          cells:
            - row: 2
              key: effort
            - sheet: Backlog
              row: 3
              key: effort
```

Gridelle preserves the `func` property during YAML serialization, so functions can be edited through the UI or in the YAML text.

## Applying Functions from the UI

1. Select the target cell.
2. Open the function tab in the menu bar.
3. Choose `sum` or `multiply`.
4. Add input cells with the cell and selection controls.
5. Apply the function to write the `func` definition into YAML.

## Common Argument Rules

### `cells`

`cells` is the simplest and highest-priority input form. It accepts an array of explicit cell references.

| Field | Type | Description |
| --- | --- | --- |
| `row` or `r` | number or string | 1-based row index. Fractional numbers are rounded. |
| `key` | string | Column key matching the UI column header. |
| `sheet` or `sheetName` | string | Optional sheet name. If omitted, the function reads from the sheet that contains the function cell. |

`column`, `col`, and `columnIndex` are also supported as 1-based column indexes. Prefer `key` when possible because column keys remain stable when the layout changes.

When `cells` is present, Gridelle ignores range-style arguments such as `axis`, `rows`, and `columns`.

### Range Arguments

Use range arguments when a function should collect values by row or column.

| Field | Description |
| --- | --- |
| `axis` | `column` by default. Use `row` for row-wise collection. |
| `key` | A single target column key. |
| `keys` | Multiple target column keys. |
| `rows` | A row number, an array of row numbers, or a range such as `{ start: 1, end: 10 }`. Row numbers are 1-based. |
| `columns` | A column number, an array of column numbers, or a range. Use this when column keys are not available. |

### Cross-Sheet References

Set `cells[].sheet` to reference cells on another sheet. Functions are recalculated for the sheet that contains the function cell. When source sheets are edited, the target sheet receives updated values when it is recalculated.

## Functions

### `sum`

`sum` adds numeric values from the selected inputs.

| Property | Behavior |
| --- | --- |
| Return value | The numeric total converted to a string. |
| Empty or nonnumeric inputs | Ignored. |
| No numeric inputs | Returns an empty string. |
| Self reference | The function cell is excluded to prevent recursion. |

Example:

```yaml
value: ""
func:
  name: sum
  args:
    cells:
      - row: 4
        key: effort
      - row: 5
        key: effort
```

### `multiply`

`multiply` multiplies two or more numeric input values. The initial product is `1`, and nonnumeric values are ignored.

| Property | Behavior |
| --- | --- |
| Return value | The product converted to a string. |
| Empty or nonnumeric inputs | Ignored. |
| No numeric inputs | Returns an empty string. |

Example:

```yaml
value: ""
func:
  name: multiply
  args:
    cells:
      - sheet: Backlog
        row: 4
        key: effort
      - sheet: Done
        row: 1
        key: effort
```

## Relationship to WebAssembly Macros

Use built-in functions for simple arithmetic. Use WebAssembly macros when custom calculations or style output are needed. The bundled `public/macros/sample_macros.wat` and `.wasm` files include a `color_if` example that can set a positive value background to `#a7f3d0`.

See the [WebAssembly macro ABI reference](wasm-macro-abi.md) for macro behavior.
