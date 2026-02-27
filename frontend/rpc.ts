import { Millennium } from '@steambrew/client';
import type { Tuple } from './helpers.js';
import type Steam from './steam.js';

async function call<R>(route: `RPC.${string}`, payload: object): Promise<R> {
  return Millennium.callServerMethod(route.slice(4), {
    payload: JSON.stringify(payload),
  }).then((r) => JSON.parse(r));
}

export class RPC {
  async OnNonSteamAppLaunch(app: Steam.AppOverview, instanceId: string) {
    await call('RPC.OnNonSteamAppLaunch', {
      app_name: app.display_name,
      instance_id: instanceId,
    });
  }

  async OnNonSteamAppHeartbeat(app: Steam.AppOverview, instanceId: string) {
    await call('RPC.OnNonSteamAppHeartbeat', {
      app_name: app.display_name,
      instance_id: instanceId,
    });
  }

  async OnNonSteamAppQuit(app: Steam.AppOverview, instanceId: string) {
    await call('RPC.OnNonSteamAppQuit', {
      app_name: app.display_name,
      instance_id: instanceId,
    });
  }

  async GetPlaytimes<T extends readonly string[]>(appNames: T) {
    if (appNames.length === 0) return [] as Tuple<(typeof formatted)[number], T['length']>;
    const timings = await call<
      {
        minutes_forever: number;
        minutes_last_two_weeks: number;
        last_played_at: number | null;
      }[]
    >('RPC.GetPlaytimes', {
      app_names: appNames,
    });
    const formatted = timings.map((t) => ({
      minutesForever: Math.round(t.minutes_forever),
      minutesLastTwoWeeks: Math.round(t.minutes_last_two_weeks),
      lastPlayedAt: t.last_played_at ? new Date(t.last_played_at * 1000) : null,
    }));
    return formatted as Tuple<(typeof formatted)[number], T['length']>;
  }

  async SetPlaytime(appName: string, minutesForever: number) {
    await call('RPC.SetPlaytime', {
      app_name: appName,
      minutes_forever: minutesForever,
    });
  }
}

export default new RPC();
