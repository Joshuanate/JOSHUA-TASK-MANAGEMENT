export interface BibleVerse {
  reference: string;
  niv: string;
  kjv: string;
}

const VERSES: BibleVerse[] = [
  {
    reference: "Proverbs 16:3",
    niv: "Commit to the LORD whatever you do, and he will establish your plans.",
    kjv: "Commit thy works unto the LORD, and thy thoughts shall be established."
  },
  {
    reference: "Colossians 3:23",
    niv: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.",
    kjv: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men;"
  },
  {
    reference: "Luke 16:10",
    niv: "Whoever can be trusted with very little can also be trusted with much, and whoever is dishonest with very little will also be dishonest with much.",
    kjv: "He that is faithful in that which is least is faithful also in much: and he that is unjust in the least is unjust also in much."
  },
  {
    reference: "Galatians 6:9",
    niv: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.",
    kjv: "And let us not be weary in well doing: for in due season we shall reap, if we faint not."
  },
  {
    reference: "Proverbs 21:5",
    niv: "The plans of the diligent lead to profit as surely as haste leads to poverty.",
    kjv: "The thoughts of the diligent tend only to plenteousness; but of every one that is hasty only to want."
  },
  {
    reference: "Ecclesiastes 9:10",
    niv: "Whatever your hand finds to do, do it with all your might.",
    kjv: "Whatsoever thy hand findeth to do, do it with thy might."
  },
  {
    reference: "2 Timothy 1:7",
    niv: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.",
    kjv: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind."
  },
  {
    reference: "James 1:22",
    niv: "Do not merely listen to the word, and so deceive yourselves. Do what it says.",
    kjv: "But be ye doers of the word, and not hearers only, deceiving your own selves."
  },
  {
    reference: "Proverbs 4:25",
    niv: "Let your eyes look straight ahead; fix your gaze directly before you.",
    kjv: "Let thine eyes look right on, and let thine eyelids look straight before thee."
  },
   {
    reference: "Psalm 90:12",
    niv: "Teach us to number our days, that we may gain a heart of wisdom.",
    kjv: "So teach us to number our days, that we may apply our hearts unto wisdom."
  },
  {
    reference: "Philippians 4:13",
    niv: "I can do all this through him who gives me strength.",
    kjv: "I can do all things through Christ which strengtheneth me."
  },
  {
    reference: "Joshua 1:9",
    niv: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.",
    kjv: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest."
  },
  {
    reference: "Proverbs 27:17",
    niv: "As iron sharpens iron, so one person sharpens another.",
    kjv: "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend."
  },
  {
    reference: "Ephesians 5:15-16",
    niv: "Be very careful, then, how you live—not as unwise but as wise, making the most of every opportunity, because the days are evil.",
    kjv: "See then that ye walk circumspectly, not as fools, but as wise, Redeeming the time, because the days are evil."
  }
];

export const getDailyVerse = (): BibleVerse => {
    const today = new Date().toISOString().split('T')[0];
    // Simple hash to get consistent daily index based on date string
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
        hash = ((hash << 5) - hash) + today.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    const index = Math.abs(hash) % VERSES.length;
    return VERSES[index];
};