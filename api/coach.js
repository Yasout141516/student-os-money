import { runCoach } from '../src/coach.js';
import { route } from './_lib.js';

export default route('POST', (notion, ids) => runCoach(notion, ids));
