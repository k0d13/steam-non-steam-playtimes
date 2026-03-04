-- dealing with dates in lua is the worst experience i have ever had with programming

---@param iso string
---@return integer
local function iso_to_seconds(iso)
  local y, mo, d, h, mi, s = iso:match("(%d+)-(%d+)-(%d+)T(%d+):(%d+):(%d+)")
  if not y then return 0 end

  y, mo, d, h, mi, s = tonumber(y), tonumber(mo), tonumber(d),
      tonumber(h), tonumber(mi), tonumber(s)

  -- Days from 1970-01-01 using standard calendar formula
  local year = y - 1970
  local leap_days = math.floor((y - 1) / 4)
      - math.floor((y - 1) / 100)
      + math.floor((y - 1) / 400)
      - (math.floor(1969 / 4)
        - math.floor(1969 / 100)
        + math.floor(1969 / 400))

  local month_days = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 }
  -- leap year correction for current year
  if (y % 4 == 0 and y % 100 ~= 0) or (y % 400 == 0) then
    month_days[2] = 29
  end

  local days = year * 365 + leap_days
  for i = 1, mo - 1 do
    days = days + month_days[i]
  end
  days = days + (d - 1)

  return days * 86400 + h * 3600 + mi * 60 + s
end

return {
  iso_to_seconds = iso_to_seconds,
}
