import type { BuildComponent } from '@/services/buildService';

// The parts a buyer weighs first, in the order the summary lists them: processor, graphics card, memory, storage.
const MAIN_PART_KEYS = ['cpu', 'gpu', 'memory', 'storage'];

/** The build's processor, graphics card, memory and storage parts, in that order, each kind in the build's own order. */
export function mainParts(components: readonly BuildComponent[]): BuildComponent[] {
    return components
        .filter(c => c.categoryKey !== null && MAIN_PART_KEYS.includes(c.categoryKey))
        .sort((a, b) => MAIN_PART_KEYS.indexOf(a.categoryKey!) - MAIN_PART_KEYS.indexOf(b.categoryKey!) || a.sortOrder - b.sortOrder);
}
