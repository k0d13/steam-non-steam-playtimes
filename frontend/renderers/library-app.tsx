import { LastPlayed, PlayBarClasses, Playtime } from '../components/play-bar';
import { NON_STEAM_APP_APPID_MASK } from '../constants';
import { querySelectorAll, renderComponent } from '../helpers';
import logger from '../logger';
import rpc from '../rpc';
import type Steam from '../steam';

export async function patch(window: Window, app: Steam.AppOverview) {
  if (app.appid < NON_STEAM_APP_APPID_MASK) return;

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
      element.setAttribute('data-nsp', 'last-played');

      const existing = parent.querySelector('[data-nsp=last-played]');
      if (existing) existing.replaceWith(element);
      else parent.appendChild(element);
    }

    if (minutesForever > 0) {
      const component = <Playtime minutesForever={minutesForever} />;
      const element = renderComponent(component);
      element.setAttribute('data-nsp', 'playtime');

      const existing = parent.querySelector('[data-nsp=playtime]');
      if (existing) existing.replaceWith(element);
      else parent.appendChild(element);
    }
  }
}
