/** Nota até a qual a avaliação pede olhar de gente antes de qualquer decisão. */
export const LOW_RATING_MAX = 3;

export function isLowRating(rating: number): boolean {
  return rating <= LOW_RATING_MAX;
}
