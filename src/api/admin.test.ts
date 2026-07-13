import { expectTypeOf, it } from 'vitest';
import type { KookChannelSortRun } from './admin';

type KookChannelSortRunsResponse = Awaited<
  ReturnType<typeof import('./admin').listKookChannelSortRuns>
>;

it('uses the exact camelCase KOOK sort run page contract', () => {
  expectTypeOf<KookChannelSortRunsResponse>().toEqualTypeOf<{
    list: KookChannelSortRun[];
    total: number;
    page: number;
    pageSize: number;
  }>();
});
