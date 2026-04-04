/**
 * Module-level flag that tracks whether the user navigated from within the app.
 * Persists during client-side navigation, resets on page refresh or direct URL access.
 */
let navigated = false;

export function markNavigated() {
  navigated = true;
}

export function hasNavigated() {
  return navigated;
}
