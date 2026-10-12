import { z } from 'zod';

// The content security policy blocks eval. zod would otherwise try it once to see whether it may
// compile validators, and the browser reports that attempt as a violation.
z.config({ jitless: true });
