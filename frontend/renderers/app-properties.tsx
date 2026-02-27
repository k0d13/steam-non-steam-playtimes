import { beforePatch } from '@steambrew/client';
import { PlaytimeInput } from '../components/playtime-input';
import { NON_STEAM_APP_APPID_MASK } from '../constants';
import { waitFor } from '../helpers';
import logger from '../logger';
import Steam from '../steam';

interface AppPropertiesPage {
  title: string;
  route: string;
  link: string;
  content: React.ReactNode;
}

function isAppPropertiesPage(page: unknown): page is AppPropertiesPage {
  return (
    typeof page === 'object' &&
    page !== null &&
    'route' in page &&
    typeof page.route === 'string' &&
    page.route.startsWith('/app/:appid/properties/')
  );
}

// Yes I know this isn't ideal, but it's the latest place where pages
// can be added to the app properties page, and I don't want to bother
// with mutating the DOM.

export async function register() {
  // On Steam startup, Array#map is called ~15,000 times. By
  // waiting for the MainWindowBrowserManager to be ready before patching,
  // we reduce the number of calls to this patch to ~700.
  await waitFor(() => Steam.MainWindowBrowserManager);

  const patch = beforePatch(Array.prototype, 'map', function (this: AppPropertiesPage[]) {
    if (
      this.length === 0 ||
      this.length > 20 ||
      !this.every(isAppPropertiesPage) ||
      this.some((p) => p.route === '/app/:appid/properties/playtime')
    )
      return;

    const appId = Number(this[0]!.link.split('/')[2]);
    if (Number.isNaN(appId) || appId < NON_STEAM_APP_APPID_MASK) return;
    const app = Steam.AppStore.allApps.find((a) => a.appid === appId)!;

    this.push({
      title: 'Playtime',
      route: '/app/:appid/properties/playtime',
      link: `/app/${app.appid}/properties/playtime`,
      content: (
        <div className="DialogBody">
          <PlaytimeInput app={app} />
        </div>
      ),
    });
  });

  logger.debug('Registered app properties patch', { patch });

  return patch.unpatch;
}
