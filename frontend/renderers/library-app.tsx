import { LastPlayed, PlayBarClasses, Playtime } from '../components/play-bar';
import { NON_STEAM_APP_APPID_MASK } from '../constants';
import { querySelectorAll, renderComponent } from '../helpers';
import logger from '../logger';
import rpc from '../rpc';
import type Steam from '../steam';

const activeViews = new Map<Window, Steam.AppOverview>();
export function unpatch(window: Window) {
  activeViews.delete(window);
}
export async function refresh(appId: number) {
  await Promise.allSettled(
    [...activeViews]
      .filter(([, app]) => app.appid === appId)
      .map(([window, app]) => patch(window, app)),
  );
}

export async function patch(window: Window, app: Steam.AppOverview) {
  // This window now shows a different page; drop any previous tracking first
  unpatch(window);
  if (app.appid < NON_STEAM_APP_APPID_MASK) return;
  activeViews.set(window, app);

  logger.debug(
    `Patching library app for non-Steam app '${app.display_name}'`, //
    { window, app },
  );

  // I tried using app.minutes_playtime_forever and such but the stats didn't appear after the first render (???)
  const [{ minutesForever, lastPlayedAt }] = //
    await rpc.GetPlaytimes([app.display_name] as const);

  const parents = await querySelectorAll(window.document, `.${PlayBarClasses.GameStatsSection}`);

  for (const parent of parents) {
    if (lastPlayedAt) {
      const component = <LastPlayed lastPlayedAt={lastPlayedAt} />;
      const element = renderComponent(component);

      const existing = parent.querySelector(':has([data-nsp="last-played"])');
      if (existing) existing.replaceWith(element);
      else parent.appendChild(element);
    }

    if (minutesForever > 0) {
      const component = <Playtime minutesForever={minutesForever} />;
      const element = renderComponent(component);

      const existing = parent.querySelector(':has([data-nsp="playtime"])');
      if (existing) existing.replaceWith(element);
      else parent.appendChild(element);
    }
  }
}
