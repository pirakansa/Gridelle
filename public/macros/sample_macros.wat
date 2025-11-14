(module
  ;; Exports the linear memory so the host can write input values.
  (memory (export "memory") 1)

  ;; sumRange(ptr: i32, len: i32) -> f64
  ;; Interprets the memory starting at `ptr` as a Float64 array with `len` entries.
  (func (export "sumRange") (param $ptr i32) (param $len i32) (result f64)
    (local $sum f64)
    (local $index i32)
    (local.set $sum (f64.const 0))
    (local.set $index (i32.const 0))
    (block $done
      (loop $loop
        (br_if $done (i32.ge_u (local.get $index) (local.get $len)))
        (local.set $sum
          (f64.add
            (local.get $sum)
            (f64.load
              (i32.add
                (local.get $ptr)
                (i32.shl (local.get $index) (i32.const 3))
              )
            )
          )
        )
        (local.set $index (i32.add (local.get $index) (i32.const 1)))
        (br $loop)
      )
    )
    (return (local.get $sum))
  )

  ;; color_if(ptr: i32, len: i32, stylePtr: i32) -> f64
  ;; Highlights the first value if it is greater than zero and returns it.
  (func (export "color_if") (param $ptr i32) (param $len i32) (param $style i32) (result f64)
    (local $value f64)
    (if (result f64) (i32.eqz (local.get $len))
      (then (f64.const 0))
      (else
        (local.set $value (f64.load (local.get $ptr)))
        (if (f64.gt (local.get $value) (f64.const 0))
          (then
            ;; Flag background color (bit 1) and set #a7f3d0 (0x00A7F3D0).
            (i32.store (local.get $style) (i32.const 2))
            (i32.store (i32.add (local.get $style) (i32.const 8)) (i32.const 0x00a7f3d0))
          )
        )
        (local.get $value)
      )
    )
  )
)
