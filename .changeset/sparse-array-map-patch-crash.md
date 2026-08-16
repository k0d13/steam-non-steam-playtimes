---
'non-steam-playtimes': patch
---

Fix a crash in the app properties patch when Steam calls `Array#map` on a sparse array. `Array#every` skips holes, so an array of empty slots passed the validation guard and then threw when reading `link` of an undefined first element
