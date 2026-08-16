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
  logger:info("Backend loaded, waiting for frontend...")
end

local function on_frontend_loaded()
  logger:info("Frontend has loaded, now ready to track playtime...")
end

local function on_unload()
  playtime.save_sessions()
end

return {
  on_load = on_load,
  on_frontend_loaded = on_frontend_loaded,
  on_unload = on_unload,
}
