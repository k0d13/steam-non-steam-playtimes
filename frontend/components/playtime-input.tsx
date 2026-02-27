import { Button, findClassModule, TextField } from '@steambrew/client';
import { createMs, Time } from 'enhanced-ms';
import { useCallback, useMemo, useState } from 'react';
import { forceFakeLocationChange } from '../helpers';
import logger from '../logger';
import rpc from '../rpc';
import type Steam from '../steam';

const ms = createMs({
  formatOptions: {
    includedUnits: ['hour', 'minute'],
    useAbbreviations: true,
  },
});

const SettingsStyles = findClassModule((m) => m.SectionTopLine)!;

export function PlaytimeInput({ app }: { app: Steam.AppOverview }) {
  const [playtimeMs, setPlaytimeMs] = //
    useState(app.minutes_playtime_forever * Time.Minute);
  const [initialPlaytime] = useState(() => ms(playtimeMs) ?? '');
  const isValid = useMemo(
    () => Number.isFinite(playtimeMs) && playtimeMs >= 0 && playtimeMs <= Time.Year * 25,
    [playtimeMs],
  );

  const [saveState, setSaveState] = useState('Save');
  const updatePlaytime = useCallback(async () => {
    try {
      setSaveState('Saving...');
      const minutesForever = Math.round(playtimeMs / Time.Minute);
      await rpc.SetPlaytime(app.display_name, minutesForever);
      app.minutes_playtime_forever = minutesForever;
      setSaveState('Saved');
    } catch (e) {
      setSaveState('Failed');
      logger.debug('Failed to set playtime', e);
    } finally {
      setTimeout(() => {
        setSaveState('Save');
        // Force location monitor to detect a "refresh" of the page to
        // instantly update the playtime
        forceFakeLocationChange();
      }, 2000);
    }
  }, [app, playtimeMs]);

  return (
    <div>
      <div className={SettingsStyles.Title}>Playtime</div>
      <div>
        Manually set the total playtime for this app. Reducing it below the current total will reset
        date-based playtime statistics.
      </div>
      <div className={SettingsStyles.AsyncBackedInputChildren}>
        <TextField
          // @ts-expect-error - placeholder is a valid prop but not typed
          placeholder="e.g. 2h 30m"
          defaultValue={initialPlaytime}
          onChange={(e) => {
            if (e.target.value === '') setPlaytimeMs(0);
            else setPlaytimeMs(ms(e.target.value) || NaN);
          }}
          style={!isValid ? { border: 'red 1px solid', marginLeft: '1px' } : {}}
        />
        <Button
          className={`${SettingsStyles.SettingsDialogButton} ${SettingsStyles.ShortcutChange} DialogButton`}
          onClick={updatePlaytime}
          disabled={!isValid}
        >
          {saveState}
        </Button>
      </div>
    </div>
  );
}
