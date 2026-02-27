local function utc_offset()
  local utc = os.time(os.date("!*t"))
  local now = os.time(os.date("*t"))
  return os.difftime(utc, now)
end

---@param iso string
---@return integer
local function iso_to_seconds(iso)
  local Y, m, D, H, M, S = iso:match("(%d+)-(%d+)-(%d+)T(%d+):(%d+):(%d+)")
  assert(Y and m and D and H and M and S)

  local ts = os.time({
    year = tonumber(Y) + 0,
    month = tonumber(m) + 0,
    day = tonumber(D) + 0,
    hour = tonumber(H),
    min = tonumber(M),
    sec = tonumber(S)
  }) or 0
  return math.max(0, ts + utc_offset())
end

---@param seconds integer
---@return string
local function seconds_to_iso(seconds)
  return os.date("!%Y-%m-%dT%H:%M:%S+00:00", seconds)
end

return {
  iso_to_seconds = iso_to_seconds,
  seconds_to_iso = seconds_to_iso
}
