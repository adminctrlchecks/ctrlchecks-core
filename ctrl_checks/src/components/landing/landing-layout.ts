/**
 * Shared width + horizontal padding shell for every landing section.
 *
 * Each section used to stack Tailwind's `container` (capped at 1400px, 2rem
 * padding) on top of `max-w-7xl` (1280px) and `lg:px-10`, then nested a
 * `max-w-2xl`/`max-w-3xl` column inside that. On a 1920px viewport the real
 * content column ended up ~670-770px wide, leaving most of the screen empty.
 *
 * Dropping `container` removes the double cap so a single value controls the
 * width, and the wider ceiling lets grids and the demo canvas actually use it.
 */
export const SECTION_SHELL = "mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-12";

/**
 * Centered prose column for section headings.
 *
 * Deliberately narrower than SECTION_SHELL — running headline and lede text the
 * full 1440px would hurt readability. Only prose stays capped; grids, cards and
 * the demo canvas span the shell.
 */
export const SECTION_PROSE = "mx-auto max-w-3xl text-center";
