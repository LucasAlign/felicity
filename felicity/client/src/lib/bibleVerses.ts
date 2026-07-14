import { getDayOfYear } from "date-fns";

export interface BibleVerse {
  reference: string;
  text: string;
}

// A small curated set (KJV — public domain) leaning toward the themes that
// fit a busy, homeschooling parent: peace, strength, provision, patience,
// and raising children. Rotates by day of year so it's stable all day and
// cycles through the list rather than repeating.
export const BIBLE_VERSES: BibleVerse[] = [
  {
    reference: "Philippians 4:6-7",
    text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.",
  },
  {
    reference: "Proverbs 3:5-6",
    text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
  },
  {
    reference: "Joshua 1:9",
    text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
  },
  {
    reference: "Isaiah 41:10",
    text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee.",
  },
  {
    reference: "Psalm 46:1",
    text: "God is our refuge and strength, a very present help in trouble.",
  },
  {
    reference: "Psalm 118:24",
    text: "This is the day which the LORD hath made; we will rejoice and be glad in it.",
  },
  {
    reference: "Matthew 6:33",
    text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.",
  },
  {
    reference: "Jeremiah 29:11",
    text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.",
  },
  {
    reference: "Proverbs 22:6",
    text: "Train up a child in the way he should go: and when he is old, he will not depart from it.",
  },
  {
    reference: "Psalm 127:3",
    text: "Lo, children are an heritage of the LORD: and the fruit of the womb is his reward.",
  },
  {
    reference: "Galatians 6:9",
    text: "And let us not be weary in well doing: for in due season we shall reap, if we faint not.",
  },
  {
    reference: "Colossians 3:23",
    text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men.",
  },
  {
    reference: "Isaiah 40:31",
    text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
  },
  {
    reference: "Matthew 11:28",
    text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
  },
  {
    reference: "Romans 8:28",
    text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
  },
  {
    reference: "Philippians 4:13",
    text: "I can do all things through Christ which strengtheneth me.",
  },
  {
    reference: "Psalm 23:1",
    text: "The LORD is my shepherd; I shall not want.",
  },
  {
    reference: "Lamentations 3:22-23",
    text: "It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.",
  },
  {
    reference: "Nehemiah 8:10",
    text: "The joy of the LORD is your strength.",
  },
  {
    reference: "Psalm 55:22",
    text: "Cast thy burden upon the LORD, and he shall sustain thee: he shall never suffer the righteous to be moved.",
  },
];

export function getVerseOfTheDay(date: Date = new Date()): BibleVerse {
  const index = getDayOfYear(date) % BIBLE_VERSES.length;
  return BIBLE_VERSES[index];
}
