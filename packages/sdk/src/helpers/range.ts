/**
 * Inclusive integer range. `range(1, 6)` → `[1, 2, 3, 4, 5, 6]`.
 * Counts down when `start > end`: `range(3, 1)` → `[3, 2, 1]`.
 *
 * Handy for floor lists (`FloorVisual.floors`) and animation frames
 * (`AnimClip.frames`) where a contiguous span would otherwise be spelled out.
 */
export function range(start: number, end: number): number[] {
	if (!Number.isInteger(start) || !Number.isInteger(end)) {
		throw new Error('range expects integer bounds')
	}
	const step = start <= end ? 1 : -1
	const out: number[] = []
	for (let i = start; step > 0 ? i <= end : i >= end; i += step) out.push(i)
	return out
}
