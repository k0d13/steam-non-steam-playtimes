import type {} from '@steambrew/client';

type SB_AppOverview = NonNullable<ReturnType<(typeof window)['appStore']['GetAppOverviewByAppID']>>;

namespace Steam {
  // ===== CallbackList ===== //

  export interface CallbackList<Arguments extends unknown[]> {
    m_vecCallbacks: Array<(...args: Arguments) => void>;
    Register(callback: (...args: Arguments) => void): {
      Unregister: () => void;
    };
    Dispatch(...args: Arguments): void;
    ClearAllCallbacks(): void;
    CountRegistered(): number;
  }

  // ===== PopupManager ===== //

  export interface PopupManager {
    GetExistingPopup(name: string): Popup | undefined;
    m_rgPopupCreatedCallbacks: CallbackList<[Popup]>;
    AddPopupCreatedCallback(
      callback: (popup: Popup) => void,
    ): ReturnType<this['m_rgPopupCreatedCallbacks']['Register']>;
    m_rgPopupDestroyedCallbacks: CallbackList<[Popup]>;
    AddPopupDestroyedCallback(
      callback: (popup: Popup) => void,
    ): ReturnType<this['m_rgPopupDestroyedCallbacks']['Register']>;
  }

  export const PopupManager: PopupManager = Reflect.get(globalThis, 'g_PopupManager');

  export const DesktopWindowName = 'SP Desktop_uid0';
  export const GamepadWindowName = 'SP BPM_uid0';

  export interface Popup {
    get title(): string;
    set title(title: string);
    get window(): Window | undefined;
    get root_element(): Element;
  }

  export const MainPopup: Popup | undefined = undefined;
  Object.defineProperty(Steam, 'MainPopup', {
    get(): Popup | undefined {
      if (Steam.UIStore.MainInstanceUIMode === UIMode.Desktop)
        return PopupManager.GetExistingPopup(DesktopWindowName);
      if (Steam.UIStore.MainInstanceUIMode === UIMode.Gamepad)
        return PopupManager.GetExistingPopup(GamepadWindowName);
      return undefined;
    },
  });

  // ===== MainWindowBrowser ===== //

  export interface MainWindowBrowserManager {
    m_browser: MainWindowBrowser;
    m_lastActiveTab: 'store' | 'library' | 'community' | (string & {});
    m_lastLocation: MainWindowBrowserLocation;
    m_history: MainWindowBrowserHistory;
  }

  export interface MainWindowBrowserLocation extends Pick<URL, 'pathname' | 'search' | 'hash'> {
    key: string;
  }

  export interface MainWindowBrowser {
    on(name: 'finished-request', listener: (url: string, title: string) => void): void;
  }

  export interface MainWindowBrowserHistory {
    listen(callback: (location: MainWindowBrowserLocation) => void): void;
  }

  export const MainWindowBrowserManager: MainWindowBrowserManager = undefined!;
  Object.defineProperty(Steam, 'MainWindowBrowserManager', {
    get: () => Reflect.get(globalThis, 'MainWindowBrowserManager'),
    enumerable: true,
    configurable: true,
  });

  // ===== LocalizationManager ===== //

  export interface LocalizationManager {
    m_mapTokens: Map<string, string>;
    LocalizeString(token: `#${string}`): string;
  }

  export const LocalizationManager: LocalizationManager = Reflect.get(
    globalThis,
    'LocalizationManager',
  );

  // ===== AppOverview ===== //

  interface BaseAppOverview extends Omit<SB_AppOverview, 'size_on_disk'> {
    appid: number;
    display_name: string;
    sort_as: string;
  }

  export type AppOverview = BaseAppOverview;

  // ===== UIStore ===== //

  export enum UIMode {
    Unknown = -1,
    Gamepad = 4,
    Desktop = 7,
  }

  export interface UIStore {
    get RunningApps(): AppOverview[];
    get MainInstanceUIMode(): UIMode;
  }

  export const UIStore: UIStore = //
    Reflect.get(globalThis, 'SteamUIStore');

  // ===== AppStore ===== //

  export interface AppStore {
    allApps: AppOverview[];
  }

  export const AppStore: AppStore = //
    Reflect.get(globalThis, 'appStore');

  // ===== CollectionStore ===== //

  export interface CollectionStore {
    OnAppOverviewChange(apps: AppOverview[]): void;
  }

  export const CollectionStore: CollectionStore = //
    Reflect.get(globalThis, 'collectionStore');
}

//

export default Steam;
