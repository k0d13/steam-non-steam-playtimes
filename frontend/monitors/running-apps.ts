import { MONITOR_RUNNING_APPS_POLL_INTERVAL } from '../constants';
import type { Awaitable, Voidable } from '../helpers';
import Steam from '../steam';

/**
 * Monitor running applications and trigger when they launch, quit or heartbeat
 * @param handleLaunch Callback to trigger when an app launches
 * @returns A function to stop monitoring
 */
export function onAppLaunch(
  handleLaunch: (
    app: Steam.AppOverview,
    handlers: {
      onLaunch: (handleLaunch: VoidFunction) => void;
      onHeartbeat: (handleHeartbeat: VoidFunction) => void;
      onQuit: (handleQuit: VoidFunction) => void;
    },
  ) => Awaitable<Voidable<VoidFunction>>,
) {
  let inFlight = false;
  const onHeartbeatMap = new Map<number, Set<VoidFunction>>();
  const onQuitMap = new Map<number, Set<VoidFunction>>();

  async function checkRunningApps() {
    if (inFlight) return;
    inFlight = true;

    const runningApps = new Set(Steam.UIStore.RunningApps);
    const seenAppNames = new Set<number>();

    for (const app of runningApps) {
      seenAppNames.add(app.appid);

      if (!onQuitMap.has(app.appid)) {
        onQuitMap.set(app.appid, new Set());
        onHeartbeatMap.set(app.appid, new Set());
        const onLaunchSet = new Set<VoidFunction>();

        const onQuit = await handleLaunch(app, {
          onLaunch: (cb: VoidFunction) => onLaunchSet.add(cb),
          onHeartbeat: (cb: VoidFunction) => onHeartbeatMap.get(app.appid)!.add(cb),
          onQuit: (cb: VoidFunction) => onQuitMap.get(app.appid)!.add(cb),
        });
        if (onQuit) onQuitMap.get(app.appid)!.add(onQuit);

        await Promise.allSettled([...onLaunchSet].map((cb) => cb()));
      } else {
        const onHeartbeatSet = onHeartbeatMap.get(app.appid)!;
        await Promise.allSettled([...onHeartbeatSet].map((cb) => cb()));
      }
    }

    for (const [appid, onQuitSet] of onQuitMap) {
      if (!seenAppNames.has(appid)) {
        onQuitMap.delete(appid);
        onHeartbeatMap.delete(appid);
        await Promise.allSettled([...onQuitSet].map((cb) => cb()));
      }
    }

    inFlight = false;
  }

  checkRunningApps();
  const monitor = setInterval(checkRunningApps, MONITOR_RUNNING_APPS_POLL_INTERVAL);
  return () => clearInterval(monitor);
}
