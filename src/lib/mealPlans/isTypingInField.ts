/** Same guard as WorkoutCanvas keyboard shortcuts, plus contenteditable. */
export function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (target.isContentEditable) return true;
  return false;
}
