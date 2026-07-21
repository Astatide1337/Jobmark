import * as activities from './activities';
import * as projects from './projects';
import * as goals from './goals';
import * as reports from './reports';
import * as search from './search';
import * as contacts from './contacts';
import * as interactions from './interactions';
import * as outreach from './outreach';
import * as focus from './focus';
import * as settings from './settings';
import * as vault from './vault';
import * as account from './account';

export * from './activities';
export * from './projects';
export * from './goals';
export * from './reports';
export * from './search';
export * from './contacts';
export * from './interactions';
export * from './outreach';
export * from './focus';
export * from './settings';
export * from './vault';
export * from './account';

export const allTools = [
  ...Object.values(activities),
  ...Object.values(projects),
  ...Object.values(goals),
  ...Object.values(reports),
  ...Object.values(search),
  ...Object.values(contacts),
  ...Object.values(interactions),
  ...Object.values(outreach),
  ...Object.values(focus),
  ...Object.values(settings),
  ...Object.values(vault),
  ...Object.values(account),
].filter(t => t && typeof t === 'object' && 'definition' in t && 'execute' in t) as Array<{ definition: any; execute: any }>;

export const toolDefinitions = allTools.map(t => t.definition);