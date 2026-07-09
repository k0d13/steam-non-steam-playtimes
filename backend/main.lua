-- Millennium's luavm runs LuaJIT, which compiles hot loops into dynamically
-- generated executable code pages. Anti-cheat / memory-scanning software that
-- injects into every process (e.g. nProtect GameGuard, Windhawk) crashes when it
-- walks those anonymous JIT regions, surfacing as an EXCEPTION_ACCESS_VIOLATION
-- inside the injected module and getting misattributed to this plugin. Forcing
-- the interpreter removes the trigger. See issue #46.
if type(jit) == "table" and type(jit.off) == "function" then
  pcall(jit.off)
  pcall(jit.flush)
end

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
