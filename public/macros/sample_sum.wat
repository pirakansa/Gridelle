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
)
