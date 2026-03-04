import { NON_STEAM_APP_APPID_MASK } from './constants.js';
import { forceFakeLocationChange } from './helpers.js';
import logger from './logger.js';
import { onLocationChange } from './monitors/location.js';
import { onPopupCreate, PopupType } from './monitors/popups.js';
import { onAppLaunch } from './monitors/running-apps.js';
import { register as registerAppProperties } from './renderers/app-properties.js';
import { patch as patchLibraryApp } from './renderers/library-app.js';
import { register as registerLibraryHome } from './renderers/library-home.js';
import rpc from './rpc.js';
import Steam from './steam.js';

export { RPC } from './rpc.js';

export default async function OnPluginLoaded() {
  registerAppProperties();
  registerLibraryHome();

  // ===== Monitor Running Apps ===== //
  // Monitor running applications to track non-steam app playtime sessions

  onAppLaunch((app, { onLaunch, onHeartbeat, onQuit }) => {
    if (app.appid < NON_STEAM_APP_APPID_MASK) return;
    const instanceId = Math.random().toString(36).slice(2);

    onLaunch(() => {
      logger.debug(
        `Launching non-steam app '${app.display_name}', tracking session '${instanceId}'`, //
        { app, instanceId },
      );
      rpc.OnNonSteamAppLaunch(app, instanceId);
    });

    onHeartbeat(() => {
      logger.debug(
        `Heartbeating non-steam app '${app.display_name}', pinging session '${instanceId}'`, //
        { app, instanceId },
      );
      rpc.OnNonSteamAppHeartbeat(app, instanceId);
      forceFakeLocationChange();
    });

    onQuit(() => {
      logger.debug(
        `Quitting non-steam app '${app.display_name}', ending session '${instanceId}'`, //
        { app, instanceId },
      );
      rpc.OnNonSteamAppQuit(app, instanceId);
    });
  });

  // ===== Monitor Steam Popups ===== //
  // Monitor Steam popups to detect when library pages are loaded

  onPopupCreate((popup, type) => {
    if (type !== PopupType.Desktop && type !== PopupType.Gamepad) return;

    // ===== Monitor Main Window Location ===== //

    const cleanup = onLocationChange(
      () => {
        if (type === PopupType.Desktop) return Steam.MainWindowBrowserManager?.m_lastLocation;
        if (type === PopupType.Gamepad) return popup.window?.opener?.location;
      },
      ({ pathname }) => {
        if (pathname.startsWith('/library/app/')) {
          const appId = Number(pathname.split('/')[3]);
          const app = Steam.AppStore.allApps //
            .find((app) => app.appid === appId)!;
          patchLibraryApp(popup.window!, app);
        }
      },
    );

    return cleanup;
  });
}
