local json    = require("json")
local utils   = require("utils")
local fs      = require("fs")
local helpers = require("helpers")
local logger  = require('logger')

---@class Session
---@field instance_id? string
---@field started_at integer
---@field ended_at integer

SESSIONS_PATH = fs.parent_path(utils.get_backend_path()) .. "/sessions.json"
SESSIONS      = {} ---@type table<string, Session[]>

local function migrate_sessions()
  local needed_migration = false
  for _, sessions in pairs(SESSIONS) do
    for _, session in ipairs(sessions) do
      if type(session.started_at) ~= "number" then
        session.started_at = helpers.iso_to_seconds(session.started_at)
        needed_migration = true
      end
      if type(session.ended_at) ~= "number" then
        session.ended_at = helpers.iso_to_seconds(session.ended_at)
        needed_migration = true
      end
    end
  end
  return needed_migration
end

local function save_sessions()
  local temp_path = SESSIONS_PATH .. ".tmp"
  local json_str = json.encode(SESSIONS)
  local ok, error = utils.write_file(temp_path, json_str)
  if ok and not error then fs.rename(temp_path, SESSIONS_PATH) end
end

local function load_sessions()
  local file = io.open(SESSIONS_PATH, "r")
  if file then
    local content = file:read("*all")
    file:close()
    if content then
      SESSIONS = json.decode(content)
      if migrate_sessions() then
        local backup_path = SESSIONS_PATH .. ".bkp"
        utils.write_file(backup_path, content)
        save_sessions()
      end
    end
  end
end

local function collapse_sessions()
  local two_weeks_ago = os.time() - 14 * 24 * 60 * 60
  local unix_epoch = 0

  for _, sessions in pairs(SESSIONS) do
    local zero_session = nil ---@type Session|nil
    local latest_session = nil ---@type Session|nil
    local stale_sessions = {} ---@type Session[]

    for _, session in ipairs(sessions) do
      if session.started_at == unix_epoch then
        zero_session = session
      end

      if not latest_session or session.ended_at > latest_session.ended_at then
        latest_session = session
      end

      if session.ended_at < two_weeks_ago then
        table.insert(stale_sessions, session)
      end
    end

    if not zero_session then
      zero_session = { started_at = unix_epoch, ended_at = unix_epoch }
      table.insert(sessions, 1, zero_session)
    end

    for _, session in ipairs(stale_sessions) do
      if session ~= latest_session and session ~= zero_session then
        local session_time = session.ended_at - session.started_at
        zero_session.ended_at = zero_session.ended_at + session_time

        for i = #stale_sessions, 1, -1 do
          if sessions[i] == session then
            table.remove(sessions, i)
            break
          end
        end
      end
    end
  end
end

-- --

---@param app_name string
---@param instance_id string
---@return nil
local function start_session(app_name, instance_id)
  logger:info("Non-steam app " .. app_name .. " launched, starting session...")
  if not SESSIONS[app_name] then SESSIONS[app_name] = {} end
  local now = os.time()
  table.insert(SESSIONS[app_name], {
    instance_id = instance_id,
    started_at = now,
    ended_at = now
  })
end

---@param app_name string
---@param instance_id string
---@return nil
local function ping_session(app_name, instance_id)
  -- Avoid spamming the console with this
  -- logger:info("Non-steam app " .. app_name .. " still running, pinging session...")
  for _, session in ipairs(SESSIONS[app_name]) do
    if session.instance_id == instance_id then
      session.ended_at = os.time()
      save_sessions()
      break
    end
  end
end

---@param app_name string
---@param instance_id string
---@return nil
local function stop_session(app_name, instance_id)
  logger:info("Non-steam app " .. app_name .. " stopped, ending session...")
  for _, session in ipairs(SESSIONS[app_name]) do
    if session.instance_id == instance_id then
      session.ended_at = os.time()
      session.instance_id = nil
      collapse_sessions()
      save_sessions()
      break
    end
  end
end

---@param app_name string
local function get_playtime(app_name)
  local two_weeks_ago = os.time() - 14 * 24 * 60 * 60
  local unix_epoch = 0

  local minutes_forever = 0
  local minutes_last_two_weeks = 0
  local last_played_at = nil

  for _, session in ipairs(SESSIONS[app_name] or {}) do
    local started_at = session.started_at
    local ended_at = session.ended_at
    local minutes = (ended_at - started_at) / 60

    if started_at > two_weeks_ago then
      minutes_last_two_weeks = minutes_last_two_weeks + minutes
    end
    minutes_forever = minutes_forever + minutes

    if started_at ~= unix_epoch and (not last_played_at or ended_at > last_played_at) then
      last_played_at = ended_at
    end
  end

  return {
    minutes_forever = minutes_forever,
    minutes_last_two_weeks = minutes_last_two_weeks,
    last_played_at = last_played_at
  }
end


---@param app_name string
---@param minutes_forever number
local function set_playtime(app_name, minutes_forever)
  local unix_epoch = 0

  local sessions = SESSIONS[app_name] or {}
  local current_minutes = 0
  for _, session in ipairs(sessions) do
    local minutes = (session.ended_at - session.started_at) / 60
    current_minutes = current_minutes + minutes
  end

  if minutes_forever >= current_minutes then
    local extra_minutes = minutes_forever - current_minutes
    local zero_session = nil
    for _, session in ipairs(sessions) do
      if session.started_at == unix_epoch then
        zero_session = session
        break
      end
    end

    if not zero_session then
      zero_session = { started_at = unix_epoch, ended_at = unix_epoch }
      table.insert(sessions, zero_session)
    end

    zero_session.ended_at = zero_session.ended_at + extra_minutes * 60
  else
    local new_sessions = {
      {
        started_at = unix_epoch,
        ended_at = unix_epoch + minutes_forever * 60
      }
    }
    sessions = new_sessions
  end

  SESSIONS[app_name] = sessions
  save_sessions()
end

--

return {
  load_sessions = load_sessions,
  save_sessions = save_sessions,
  start_session = start_session,
  ping_session = ping_session,
  stop_session = stop_session,
  get_playtime = get_playtime,
  set_playtime = set_playtime
}
