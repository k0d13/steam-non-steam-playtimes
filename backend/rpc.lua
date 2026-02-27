local playtime = require("playtime")
local json = require("json")

---@return fun(payload: string): string
local function rpcmethod(func)
  return function(payload)
    local data = json.decode(payload)
    local result = func(data)
    if result then
      return json.encode(result)
    else
      -- Cannot nothing or return nil alone because millennium tries to stoi it?
      return 'null'
    end
  end
end

---@class RPC
local RPC = {}

function RPC.new()
  local self = setmetatable({}, { __index = RPC })
  return self
end

---@param payload string
---@return string|nil
function RPC.OnNonSteamAppLaunch(payload)
  local wrapped_func = rpcmethod(function(data)
    playtime.start_session(data.app_name, data.instance_id)
    return nil
  end)
  return wrapped_func(payload)
end

---@param payload string
---@return string|nil
function RPC.OnNonSteamAppHeartbeat(payload)
  local wrapped_func = rpcmethod(function(data)
    playtime.ping_session(data.app_name, data.instance_id)
    return nil
  end)
  return wrapped_func(payload)
end

---@param payload string
---@return string|nil
function RPC.OnNonSteamAppQuit(payload)
  local wrapped_func = rpcmethod(function(data)
    playtime.stop_session(data.app_name, data.instance_id)
    return nil
  end)
  return wrapped_func(payload)
end

---@param payload string
---@return string|nil
function RPC.GetPlaytimes(payload)
  local wrapped_func = rpcmethod(function(data)
    local results = {}
    for _, app_name in ipairs(data.app_names) do
      table.insert(results, playtime.get_playtime(app_name))
    end
    return results
  end)
  return wrapped_func(payload)
end

---@param payload string
---@return string|nil
function RPC.SetPlaytime(payload)
  local wrapped_func = rpcmethod(function(data)
    playtime.set_playtime(data.app_name, data.minutes_forever)
    return nil
  end)
  return wrapped_func(payload)
end

return {
  RPC = RPC,
  rpc = RPC.new()
}
