# non-steam-playtimes

## 2.0.3

### Patch Changes

- 85489d8: Fix a crash in the app properties patch when Steam calls `Array#map` on a sparse array. `Array#every` skips holes, so an array of empty slots passed the validation guard and then threw when reading `link` of an undefined first element
- da3607f: Update playtime on the library page in place, instead of faking a router navigation

## 2.0.2

### Patch Changes

- 03127a1: Hide builtin steam playtimes to prioritise this plugins editable playtime
