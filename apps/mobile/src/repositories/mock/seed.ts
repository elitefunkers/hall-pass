import type { Gender, Orientation, Prompt } from '@/types/domain';

export const promptLibrary: Prompt[] = [
  { id: 'p01', text: 'A perfect slow morning includes' },
  { id: 'p02', text: 'The most underrated thing about where I live' },
  { id: 'p03', text: 'Something I could talk about for an hour' },
  { id: 'p04', text: 'You’ll win me over if you' },
  { id: 'p05', text: 'If I’m planning our first date, we’re going to' },
  { id: 'p06', text: 'My friends call me when they need' },
  { id: 'p07', text: 'Currently obsessed with' },
  { id: 'p08', text: 'The best advice I’ve ignored' },
  { id: 'p09', text: 'Something I’m quietly getting better at' },
  { id: 'p10', text: 'It’s a good sign if you also' },
  { id: 'p11', text: 'Ask me about' },
  { id: 'p12', text: 'My comfort meal, no substitutions' },
  { id: 'p13', text: 'Give me a free afternoon and I’ll' },
  { id: 'p14', text: 'A tradition I want to keep going' },
  { id: 'p15', text: 'The smallest thing that makes my week' },
  { id: 'p16', text: 'I changed my mind about' },
];

export interface SampleUser {
  id: string;
  firstName: string;
  dateOfBirth: string;
  gender: Gender;
  orientation: Orientation;
  interestedIn: Gender[];
  broadLocation: string;
  distanceKm: number;
  bio?: string;
  photoCount: number;
  answers: [string, string][];
  likesBack: boolean;
  likeComment?: string;
  replies: string[];
}

export const sampleUsers: SampleUser[] = [
  {
    id: 's-amara', firstName: 'Amara', dateOfBirth: '1996-04-12', gender: 'woman', orientation: 'straight',
    interestedIn: ['man'], broadLocation: 'Riverside', distanceKm: 3, photoCount: 4, likesBack: true,
    answers: [['p01', 'Black coffee, the crossword in pen, and absolutely no alarms.'], ['p05', 'Find the smallest bookshop in the city and each buy the other a book under ten pounds.'], ['p16', 'Running. I used to hate it, now I’m the person who signs up for 10ks.']],
    likeComment: 'Okay, your answer about the market made me laugh out loud.',
    replies: ['Hi! I was hoping you’d say something 😊', 'Honestly that sounds like a great plan. What are you up to this weekend?'],
  },
  {
    id: 's-jonah', firstName: 'Jonah', dateOfBirth: '1993-09-03', gender: 'man', orientation: 'bisexual',
    interestedIn: ['woman', 'man', 'nonbinary'], broadLocation: 'Old Town', distanceKm: 6, photoCount: 3, likesBack: false,
    answers: [['p07', 'Fermenting things. My kitchen currently has three jars of something.'], ['p11', 'The time I accidentally joined a choir.'], ['p12', 'Dal, rice, a fried egg on top. I won’t be taking questions.']],
    replies: ['Hey hey. Good to match!', 'The choir story is long but I promise it’s worth it.'],
  },
  {
    id: 's-lena', firstName: 'Lena', dateOfBirth: '1998-01-22', gender: 'woman', orientation: 'bisexual',
    interestedIn: ['woman', 'man', 'nonbinary'], broadLocation: 'Harbour District', distanceKm: 2, photoCount: 4, likesBack: true,
    answers: [['p03', 'Why every city should have more benches. I have opinions.'], ['p10', 'Read the plaque on every statue you walk past.'], ['p13', 'Rent a rowing boat and pretend I know what I’m doing.']],
    likeComment: 'Your photo by the lake looks like a film still.',
    replies: ['Hello! Thanks for liking my bench rant.', 'What’s the best bench you know? This is important.'],
  },
  {
    id: 's-theo', firstName: 'Theo', dateOfBirth: '1991-06-30', gender: 'man', orientation: 'straight',
    interestedIn: ['woman'], broadLocation: 'Northfield', distanceKm: 9, photoCount: 3, likesBack: false,
    answers: [['p06', 'Someone to drive the van on moving day.'], ['p08', '“Don’t buy a project motorbike.” It’s in pieces in my garage.'], ['p14', 'Sunday roast for whoever turns up. Door’s open.']],
    replies: ['Hi there!', 'The motorbike is still in pieces, if you were wondering.'],
  },
  {
    id: 's-river', firstName: 'River', dateOfBirth: '1997-11-08', gender: 'nonbinary', orientation: 'queer',
    interestedIn: ['woman', 'man', 'nonbinary'], broadLocation: 'Canal Quarter', distanceKm: 4, photoCount: 3, likesBack: true,
    answers: [['p09', 'Ceramics. My bowls are no longer technically plates.'], ['p02', 'The 24-hour bakery that nobody believes exists.'], ['p04', 'Have a strong opinion about a font.']],
    likeComment: 'I need to know your font opinion, it’s only fair.',
    replies: ['Hi! Okay, font opinions first, then everything else.', 'Mine: rounded sans-serifs are a crime. Discuss.'],
  },
  {
    id: 's-sofia', firstName: 'Sofia', dateOfBirth: '1994-02-17', gender: 'woman', orientation: 'lesbian',
    interestedIn: ['woman', 'nonbinary'], broadLocation: 'Westgate', distanceKm: 5, photoCount: 4, likesBack: false,
    answers: [['p15', 'When the bus driver waits for me even though I’m clearly late.'], ['p05', 'Go to the late opening at the science museum and argue about the dinosaurs.'], ['p07', 'Learning every word to one very long folk song.']],
    replies: ['Hi! Nice to meet you here.', 'The dinosaur argument is mandatory, just so you know.'],
  },
  {
    id: 's-marcus', firstName: 'Marcus', dateOfBirth: '1990-08-14', gender: 'man', orientation: 'gay',
    interestedIn: ['man'], broadLocation: 'Riverside', distanceKm: 3, photoCount: 3, likesBack: true,
    answers: [['p13', 'Walk until I find a café I’ve never tried.'], ['p03', 'Architecture of train stations. Yes, really.'], ['p10', 'Think a picnic counts as dinner.']],
    likeComment: 'A picnic absolutely counts as dinner.',
    replies: ['Hey! Great to match.', 'So what’s your favourite station? Trick question, it’s all of them.'],
  },
  {
    id: 's-priya', firstName: 'Priya', dateOfBirth: '1995-05-05', gender: 'woman', orientation: 'straight',
    interestedIn: ['man'], broadLocation: 'Eastbank', distanceKm: 7, photoCount: 4, likesBack: false,
    answers: [['p12', 'My grandmother’s rajma. I have tried for years and still can’t match it.'], ['p11', 'Climbing — badly, but enthusiastically.'], ['p08', '“Sleep on it.” I never sleep on it.']],
    replies: ['Hi! How’s your week going?', 'Okay, I have to ask — are you a climber too?'],
  },
  {
    id: 's-ezra', firstName: 'Ezra', dateOfBirth: '1999-03-19', gender: 'man', orientation: 'pansexual',
    interestedIn: ['woman', 'man', 'nonbinary'], broadLocation: 'University Quarter', distanceKm: 1, photoCount: 3, likesBack: true,
    answers: [['p01', 'Making pancakes badly and eating them anyway.'], ['p16', 'Pineapple on pizza. I was wrong. I apologise.'], ['p04', 'Send me a song you think I’ve never heard.']],
    likeComment: 'Sending you a song if this works out. Fair warning.',
    replies: ['Hi! The song offer stands.', 'Here’s mine: anything by a band with a terrible name.'],
  },
  {
    id: 's-noor', firstName: 'Noor', dateOfBirth: '1992-12-01', gender: 'woman', orientation: 'bisexual',
    interestedIn: ['man', 'woman', 'nonbinary'], broadLocation: 'Hillcrest', distanceKm: 8, photoCount: 3, likesBack: false,
    answers: [['p14', 'A New Year’s Day swim, however cold it is.'], ['p06', 'An honest opinion on a haircut.'], ['p02', 'The view from the top of the car park. Trust me.']],
    replies: ['Hello! I’m glad you said hi.', 'Have you ever done a cold-water swim?'],
  },
  {
    id: 's-sam', firstName: 'Sam', dateOfBirth: '1996-07-27', gender: 'nonbinary', orientation: 'pansexual',
    interestedIn: ['woman', 'man', 'nonbinary'], broadLocation: 'Old Town', distanceKm: 6, photoCount: 3, likesBack: false,
    answers: [['p07', 'Board games with absurdly long rulebooks.'], ['p15', 'A properly sharpened pencil.'], ['p05', 'Mini golf. I will be unbearably competitive.']],
    replies: ['Hi! Up for a game sometime?', 'I warn you, I read the whole rulebook.'],
  },
  {
    id: 's-daniel', firstName: 'Daniel', dateOfBirth: '1989-10-10', gender: 'man', orientation: 'straight',
    interestedIn: ['woman'], broadLocation: 'Harbour District', distanceKm: 2, photoCount: 4, likesBack: true,
    answers: [['p09', 'Patience. Ask me again after I’ve finished this jigsaw.'], ['p13', 'Fix a bike, then ride it somewhere with a view.'], ['p03', 'Weather. Clouds especially. Sorry in advance.']],
    likeComment: 'Fellow cloud enthusiast? Tell me your favourite type.',
    replies: ['Hi! Nice to match with you.', 'Cumulonimbus, obviously. Very dramatic.'],
  },
];

export function samplePhotoUri(userId: string, index: number): string {
  return `https://picsum.photos/seed/hallpass-${userId}-${index}/720/900`;
}
