# WebAssembly Macro ABI Reference

Gridelle can load WebAssembly modules as spreadsheet macros. Each exported macro function can operate on selected cell values and optionally return style instructions for the target cell.

The sample implementation lives in `public/macros/sample_macros.wat` and `public/macros/sample_macros.wasm`.

## Required Exports

### Memory

Every macro module must export linear memory:

```wat
(memory (export "memory") 1)
```

The initial size can be one 64 KiB page. The host may grow memory when it needs more space for input values or style output.

### Macro Functions

Macro functions are discovered from exported WebAssembly functions.

Supported signature shape:

```wat
(func (export "sumRange")
  (param $ptr i32)
  (param $len i32)
  (param $stylePtr i32)
  (result f64))
```

Arguments:

| Parameter | Description |
| --- | --- |
| `ptr` | Pointer to the first `f64` input value in exported memory. |
| `len` | Number of `f64` values available from `ptr`. |
| `stylePtr` | Optional pointer to a 16-byte style instruction buffer. Existing functions without this third parameter remain supported. |

Return value:

- Numeric WebAssembly return values are converted to strings and written to the function cell.
- `NaN` or an undefined result becomes an empty string.

When a module exports more than one function, each export becomes a macro candidate. Runtime IDs use the form `wasm:{moduleId}.{exportName}`.

## Input Memory Layout

The host writes input values as a contiguous `Float64Array`.

```wat
f64.load
  (i32.add
    (local.get $ptr)
    (i32.shl (local.get $index) (i32.const 3)))
```

Modules should complete work without imports. Gridelle does not currently provide host import functions for macro modules.

## Style Instruction Buffer

Functions that accept `stylePtr` can write a 16-byte structure to update the target cell style. The host clears all bytes before each call.

| Offset | Type | Meaning |
| --- | --- | --- |
| `+0` | `i32` | Flags. Bit 0 enables text color; bit 1 enables background color. |
| `+4` | `i32` | Text color as `0xRRGGBB`. Negative values clear the color. |
| `+8` | `i32` | Background color as `0xRRGGBB`. Negative values clear the color. |
| `+12` | `i32` | Reserved for future expansion. |

Only fields enabled by flags are applied to the UI.

## Function Arguments in YAML

When a macro is applied, Gridelle stores the selected macro ID and input selection in `func`.

```yaml
value: ""
func:
  name: "wasm:macros.sumRange"
  args:
    axis: "column"
    key: "effort"
    rows:
      start: 2
      end: 10
```

Row-wise ranges are supported:

```yaml
func:
  name: "wasm:macros.rowSum"
  args:
    axis: "row"
    rows: 3
    columns:
      start: 1
      end: 4
```

Explicit cell references are also supported:

```yaml
func:
  name: "wasm:custom.multiply"
  args:
    cells:
      - row: 2
        key: "A"
      - row: 2
        columnIndex: 2
```

Argument fields:

| Field | Meaning |
| --- | --- |
| `name` | Registered macro ID in `wasm:{moduleId}.{exportName}` format. |
| `args.axis` | `column` by default; use `row` for row-wise collection. |
| `args.key` or `args.keys` | One or more column keys. |
| `args.columns` | 1-based column index selection. Useful for row-wise collection. |
| `args.rows` | A row index, an array, or a `{ start, end }` range. |
| `args.cells` | Explicit cell references using `row` and `key` or `columnIndex`. |

## `@self`

The special string `"@self"` points to the row or column of the function cell.

- `rows: "@self"` selects the function cell row.
- `key: "@self"` selects the function cell column.
- `keys: ["@self", "effort"]` selects the function cell column and another column.
- `columns: { start: "@self", end: "@self" }` selects the function cell column in row-wise collection.
- `cells: [{ row: "@self", key: "@self" }]` explicitly references the function cell.

`@self` can be used in mixed arrays and range endpoints. When a function cell is copied or pasted elsewhere, `@self` follows the new cell position.

## Sample `color_if` Macro

The bundled `macros.color_if` sample reads the first selected value. When the value is greater than zero, it writes background color `#a7f3d0` to the style buffer and returns the original value.

```yaml
value: ""
func:
  name: "wasm:macros.color_if"
  args:
    key: effort
    rows:
      start: 2
      end: 10
```

Values less than or equal to zero clear the background color.

## Development Flow

1. Write a WebAssembly module in `.wat`, Rust, AssemblyScript, or another compatible source format.
2. Export `memory` and one or more numeric macro functions.
3. Build the module for a browser-compatible WebAssembly target.
4. Place the generated `.wasm` file in `public/macros/` or another static URL.
5. Load the module from Gridelle's function menu by providing a module ID and URL.
6. Select an exported function and apply it to cells.

## Compatibility Notes

- Modules with multiple memories are not supported.
- Modules with heavy `start` functions are not recommended.
- Loading a module with an existing module ID replaces all function registrations from the previous module, including exports that no longer exist.
- Runtime errors are logged and the function cell falls back to an empty value.
- The ABI is experimental and may change in a future release.
