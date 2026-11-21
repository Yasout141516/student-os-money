import { readSummary } from '../src/notion.js';
import { route } from './_lib.js';

export default route('GET', (notion, ids) => readSummary(notion, ids));
