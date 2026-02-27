local logger = require("logger")
local millennium = require("millennium")
local playtime   = require("playtime")

RPC = require("rpc").RPC
OnNonSteamAppLaunch = RPC.OnNonSteamAppLaunch
OnNonSteamAppHeartbeat = RPC.OnNonSteamAppHeartbeat
OnNonSteamAppQuit = RPC.OnNonSteamAppQuit
GetPlaytimes = RPC.GetPlaytimes
SetPlaytime = RPC.SetPlaytime

local function on_load()
  playtime.load_sessions()
  millennium.ready()
  logger:info("on_load called")
end

local function on_frontend_loaded()
  logger:info("on_frontend_loaded called")
end

local function on_unload()
  playtime.save_sessions()
  logger:info("on_unload called")
end

return {
  on_load = on_load,
  on_frontend_loaded = on_frontend_loaded,
  on_unload = on_unload,
}
