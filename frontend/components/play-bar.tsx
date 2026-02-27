import { findClassModule, findModuleExport } from '@steambrew/client';
import Steam from '../steam';

const formatRelativeDate = //
  findModuleExport((e) => e?.toString?.()?.includes('"#Time_Today"'));
const formatDuration = //
  findModuleExport((e) => e?.toString?.()?.includes('"#Played_"'));

const PlayBar = findClassModule((m) => m.GameStat) as Record<string, string>;
export const PlayBarClasses = PlayBar;

export function LastPlayed({ lastPlayedAt }: { lastPlayedAt: Date }) {
  return (
    <div className={`${PlayBar.GameStat} ${PlayBar.LastPlayed} Panel`}>
      <div className={PlayBar.GameStatRight}>
        <div className={PlayBar.PlayBarLabel}>
          {/* TODO: Currently this assumes every non-steam app is a game, allow to differentiate */}
          {/* IDEA: Check if the app exists on Steam - grab the app type and use here */}
          {Steam.LocalizationManager.LocalizeString('#AppDetails_SectionTitle_LastPlayed')}
        </div>
        <div className={`${PlayBar.PlayBarDetailLabel} ${PlayBar.LastPlayedInfo}`}>
          {formatRelativeDate(lastPlayedAt.getTime() / 1000)}
        </div>
      </div>
    </div>
  );
}

export function Playtime({ minutesForever }: { minutesForever: number }) {
  return (
    <div className={`${PlayBar.GameStat} ${PlayBar.Playtime} Panel`}>
      <div className={`${PlayBar.GameStatIcon} ${PlayBar.PlaytimeIcon}`}>
        <PlayTimeIcon />
      </div>
      <div className={PlayBar.GameStatRight}>
        <div className={PlayBar.PlayBarLabel}>
          {/* TODO: RE: L18 */}
          {Steam.LocalizationManager.LocalizeString('#AppDetails_SectionTitle_PlayTime')}
        </div>
        <div className={PlayBar.PlayBarDetailLabel}>{formatDuration(minutesForever)}</div>
      </div>
    </div>
  );
}

function PlayTimeIcon() {
  return (
    <svg
      version="1.1"
      id="Layer_2"
      xmlns="http://www.w3.org/2000/svg"
      className="SVGIcon_Button SVGIcon_PlayTime"
      x="0px"
      y="0px"
      width="256px"
      height="256px"
      viewBox="0 0 256 256"
    >
      <title>Play Time</title>
      <polyline
        fill="none"
        stroke="#000000"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit="10"
        points="85.5,149.167 128,128 128,55.167 "
      />
      <path
        fill="none"
        stroke="#000000"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit="10"
        d="M128,17.5c61.027,0,110.5,49.473,110.5,110.5S189.027,238.5,128,238.5S17.5,189.027,17.5,128"
      />
      <circle
        stroke="#000000"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit="10"
        cx="26.448"
        cy="85.833"
        r="5.5"
      />
      <circle
        stroke="#000000"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit="10"
        cx="50.167"
        cy="50.5"
        r="5.5"
      />
      <circle
        stroke="#000000"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit="10"
        cx="86"
        cy="26.667"
        r="5.5"
      />
    </svg>
  );
}
