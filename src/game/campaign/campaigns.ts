import { CampaignMission, FactionId } from '../engine/types';

// =====================================================
// THE GREAT ONLINE WAR - Campaign Story
// =====================================================
//
// The internet has fractured. What was once a chaotic but
// functional digital ecosystem has collapsed into total war.
// Each faction believes they alone hold the truth, and they
// will meme, sue, simp, and lift their way to dominance.
//
// The story follows the conflict through each faction's
// perspective, revealing that the true enemy was
// chronically-online behavior all along.
// (But that won't stop anyone.)

export interface CampaignChapter {
  id: string;
  name: string;
  faction: FactionId;
  description: string;
  missions: CampaignMission[];
}

export const CAMPAIGNS: CampaignChapter[] = [
  // =====================================================
  // CHAPTER 1: THE CHUDS - "The Basement Awakens"
  // =====================================================
  {
    id: 'chud_campaign',
    name: 'The Basement Awakens',
    faction: 'chuds',
    description: 'The NEETs have been roused from their slumber by the normies\' intrusion into their sacred digital spaces. It\'s time to emerge from the basement and reclaim what is rightfully theirs: the entire internet.',
    missions: [
      {
        id: 'chud_m1',
        name: 'Tendies Must Flow',
        description: 'Establish Mom\'s House and begin gathering resources.',
        briefing: 'The tendies supply is running low, and Mom says you need to "get a real job." Instead, you\'ve decided to build an empire. Start by establishing your base and gathering enough Copium to survive. A rival faction of Chads has been spotted doing push-ups menacingly in the distance.',
        faction: 'chuds',
        mapId: 'discourse_arena',
        objectives: [
          { id: 'obj1', description: 'Build Mom\'s House', type: 'build', target: 'chud_main', completed: false, required: true },
          { id: 'obj2', description: 'Train 4 NEETs', type: 'build', target: 'chud_neet', amount: 4, completed: false, required: true },
          { id: 'obj3', description: 'Gather 500 Copium', type: 'collect', target: 'copium', amount: 500, completed: false, required: true },
        ],
        sideQuests: [
          {
            id: 'sq1',
            name: 'The Ancient Meme Cache',
            description: 'A stash of pre-2010 memes has been discovered in the northeast. These vintage memes could boost morale significantly.',
            trigger: { type: 'location', value: '65,15' },
            objectives: [
              { id: 'sq1_obj', description: 'Send a unit to the meme cache location', type: 'discover', target: '65,15', completed: false, required: true },
            ],
            reward: { copium: 200, clout: 100 },
            discovered: false,
            completed: false,
          },
        ],
        secrets: [
          {
            id: 'secret1',
            name: 'Rare Pepe #001',
            hint: 'There\'s something hidden near the water\'s edge in the south...',
            location: { x: 40, y: 75 },
            discovered: false,
            reward: 'Unlocks the "Original Rare Pepe" cosmetic for the Pepe Lord hero.',
          },
        ],
        difficulty: 'casual',
        nextMission: 'chud_m2',
        unlocks: ['chud_rage_pit'],
      },
      {
        id: 'chud_m2',
        name: 'Forum Wars',
        description: 'Defend your territory from a White Knight Crusader assault.',
        briefing: 'The Crusaders have taken offense to your "problematic" posting habits and are sending a righteous army to cancel you. Build defenses, train Keyboard Warriors, and prepare for a siege. They fight with the power of moral superiority, but you have something stronger: spite.',
        faction: 'chuds',
        mapId: 'discourse_arena',
        objectives: [
          { id: 'obj1', description: 'Build a Rage Pit', type: 'build', target: 'chud_rage_pit', completed: false, required: true },
          { id: 'obj2', description: 'Train 6 Keyboard Warriors', type: 'build', target: 'chud_keyboard_warrior', amount: 6, completed: false, required: true },
          { id: 'obj3', description: 'Survive 3 Crusader attack waves', type: 'survive', target: 'waves', amount: 3, completed: false, required: true },
          { id: 'obj4', description: 'Destroy the Crusader outpost', type: 'destroy', target: 'crusader_armory', completed: false, required: true },
        ],
        sideQuests: [
          {
            id: 'sq2',
            name: 'The Banned Account',
            description: 'A legendary troll has been locked behind a firewall to the west. Free them to gain a powerful temporary ally.',
            trigger: { type: 'location', value: '10,40' },
            objectives: [
              { id: 'sq2_obj', description: 'Destroy the Firewall (neutral building)', type: 'destroy', target: 'firewall', completed: false, required: true },
            ],
            reward: { units: ['chud_reddit_mod'] },
            discovered: false,
            completed: false,
          },
        ],
        secrets: [],
        difficulty: 'heated',
        nextMission: 'chud_m3',
        unlocks: ['chud_doom_tower'],
      },
      {
        id: 'chud_m3',
        name: 'The Doompill Offensive',
        description: 'Launch a full assault on the Chosen\'s Media Empire.',
        briefing: 'The Chosen have been running a disinformation campaign claiming that your faction "doesn\'t touch grass." This cannot stand (even though it\'s technically true). Build Doomers, siege their Media Empire, and show them the true meaning of blackpilled. The Pepe Lord stirs in his ancient slumber...',
        faction: 'chuds',
        mapId: 'discourse_arena',
        objectives: [
          { id: 'obj1', description: 'Build a Doom Tower', type: 'build', target: 'chud_doom_tower', completed: false, required: true },
          { id: 'obj2', description: 'Summon the Pepe Lord', type: 'build', target: 'chud_pepe_lord', completed: false, required: true },
          { id: 'obj3', description: 'Destroy the Chosen\'s Central Bank', type: 'destroy', target: 'chosen_main', completed: false, required: true },
        ],
        sideQuests: [],
        secrets: [
          {
            id: 'secret2',
            name: 'The Legendary Fedora',
            hint: 'In the center of the meme zone, an ancient artifact awaits...',
            location: { x: 40, y: 40 },
            discovered: false,
            reward: '+5 armor to Pepe Lord permanently.',
          },
        ],
        difficulty: 'heated',
        unlocks: ['chud_moms_basement'],
      },
    ],
  },

  // =====================================================
  // CHAPTER 2: THE CHOSEN - "The Invisible Hand"
  // =====================================================
  {
    id: 'chosen_campaign',
    name: 'The Invisible Hand',
    faction: 'chosen',
    description: 'The global economy is in shambles (again). The Chosen see this not as a crisis, but as an opportunity. Through shrewd investment and strategic litigation, they will bring order to the chaos — and make a tidy profit while doing so.',
    missions: [
      {
        id: 'chosen_m1',
        name: 'Seed Funding',
        description: 'Establish your Central Bank and build an economic engine.',
        briefing: 'Every empire starts with capital. Establish your Central Bank, train Merchants, and begin accumulating wealth faster than any other faction. Remember: compound interest is the most powerful force in the universe. The early investor gets the tendies.',
        faction: 'chosen',
        mapId: 'discourse_arena',
        objectives: [
          { id: 'obj1', description: 'Build the Central Bank', type: 'build', target: 'chosen_main', completed: false, required: true },
          { id: 'obj2', description: 'Accumulate 1000 Copium', type: 'collect', target: 'copium', amount: 1000, completed: false, required: true },
          { id: 'obj3', description: 'Build a Law Firm', type: 'build', target: 'chosen_law_firm', completed: false, required: true },
        ],
        sideQuests: [
          {
            id: 'sq3',
            name: 'Insider Trading',
            description: 'An informant near the swamps has valuable market intelligence.',
            trigger: { type: 'location', value: '20,60' },
            objectives: [
              { id: 'sq3_obj', description: 'Reach the informant', type: 'discover', target: '20,60', completed: false, required: true },
            ],
            reward: { copium: 500, tendies: 50 },
            discovered: false,
            completed: false,
          },
        ],
        secrets: [],
        difficulty: 'casual',
        nextMission: 'chosen_m2',
        unlocks: ['chosen_media_empire'],
      },
      {
        id: 'chosen_m2',
        name: 'Hostile Takeover',
        description: 'Use economic warfare to weaken the Chads before attacking.',
        briefing: 'The Chads have been flexing dangerously close to our borders. Direct confrontation is inadvisable — their biceps are enormous. Instead, we\'ll use a more sophisticated approach: sue them into poverty, then send in the lawyers to clean up.',
        faction: 'chosen',
        mapId: 'discourse_arena',
        objectives: [
          { id: 'obj1', description: 'Build a Media Empire', type: 'build', target: 'chosen_media_empire', completed: false, required: true },
          { id: 'obj2', description: 'Reduce the Chads to below 200 Copium', type: 'collect', target: 'chad_copium_below', amount: 200, completed: false, required: true },
          { id: 'obj3', description: 'Destroy the Iron Temple', type: 'destroy', target: 'chad_main', completed: false, required: true },
        ],
        sideQuests: [],
        secrets: [],
        difficulty: 'heated',
        nextMission: 'chosen_m3',
        unlocks: ['chosen_space_program'],
      },
      {
        id: 'chosen_m3',
        name: 'Space Laser Online',
        description: 'Deploy the ultimate weapon against all remaining factions.',
        briefing: 'The conspiracies were right all along (sort of). The Space Program is complete, and it\'s time to demonstrate the Orbital Strike to the remaining factions. But beware — they\'ve formed a desperate alliance against you. Time to show them why you control the banks.',
        faction: 'chosen',
        mapId: 'discourse_arena',
        objectives: [
          { id: 'obj1', description: 'Build the Space Program', type: 'build', target: 'chosen_space_program', completed: false, required: true },
          { id: 'obj2', description: 'Summon The Rothschild', type: 'build', target: 'chosen_rothschild', completed: false, required: true },
          { id: 'obj3', description: 'Defeat all enemy factions', type: 'destroy', target: 'all_enemies', completed: false, required: true },
        ],
        sideQuests: [],
        secrets: [
          {
            id: 'secret3',
            name: 'The Protocols',
            hint: 'Hidden in the deepest part of the map lies... a really good bagel recipe.',
            location: { x: 5, y: 75 },
            discovered: false,
            reward: 'All Merchants permanently gather 50% faster.',
          },
        ],
        difficulty: 'malding',
        unlocks: ['chosen_central_bank'],
      },
    ],
  },

  // =====================================================
  // CHAPTER 3: CRUSADERS - "In This Moment, I Am Euphoric"
  // =====================================================
  {
    id: 'crusader_campaign',
    name: 'In This Moment, I Am Euphoric',
    faction: 'crusaders',
    description: 'The Crusaders have pledged to protect the honor of all who need protecting (whether they asked for it or not). With fedoras tipped and katanas drawn, they ride forth on a quest for chivalry in a world that never asked for it.',
    missions: [
      {
        id: 'crusader_m1',
        name: "M'Lady's Request",
        description: 'Build the Simp Castle and prove your worth.',
        briefing: 'A distress signal has been detected from the digital realm. Someone, somewhere, is being disrespected on the internet. This cannot stand. Establish the Simp Castle, rally the Loyal Simps, and prepare to defend honor that was never in danger.',
        faction: 'crusaders',
        mapId: 'discourse_arena',
        objectives: [
          { id: 'obj1', description: 'Build the Simp Castle', type: 'build', target: 'crusader_main', completed: false, required: true },
          { id: 'obj2', description: 'Train 5 Loyal Simps', type: 'build', target: 'crusader_simp', amount: 5, completed: false, required: true },
          { id: 'obj3', description: 'Build the Fedora Armory', type: 'build', target: 'crusader_armory', completed: false, required: true },
          { id: 'obj4', description: 'Defeat the Chud raiding party', type: 'destroy', target: 'chud_raiders', completed: false, required: true },
        ],
        sideQuests: [
          {
            id: 'sq4',
            name: 'The Enchanted Fedora',
            description: 'Legend speaks of a Fedora of Supreme Tipping, hidden in the mountains.',
            trigger: { type: 'location', value: '55,30' },
            objectives: [
              { id: 'sq4_obj', description: 'Find the Enchanted Fedora', type: 'discover', target: '55,30', completed: false, required: true },
            ],
            reward: { clout: 200, item: 'enchanted_fedora' },
            discovered: false,
            completed: false,
          },
        ],
        secrets: [],
        difficulty: 'casual',
        nextMission: 'crusader_m2',
        unlocks: ['crusader_stream_temple'],
      },
      {
        id: 'crusader_m2',
        name: 'The Great Donation Drive',
        description: 'Fund the war effort through strategic simping.',
        briefing: 'The war chest is empty because Sir Chaddington donated it all to an e-girl\'s birthday stream. Time to rebuild! Construct the Stream Temple, recruit E-Girl Healers, and launch the Great Donation Drive to fund the next offensive.',
        faction: 'crusaders',
        mapId: 'discourse_arena',
        objectives: [
          { id: 'obj1', description: 'Build the Stream Temple', type: 'build', target: 'crusader_stream_temple', completed: false, required: true },
          { id: 'obj2', description: 'Accumulate 300 Clout', type: 'collect', target: 'clout', amount: 300, completed: false, required: true },
          { id: 'obj3', description: 'Train 3 E-Girl Healers', type: 'build', target: 'crusader_egirl_healer', amount: 3, completed: false, required: true },
        ],
        sideQuests: [],
        secrets: [],
        difficulty: 'heated',
        nextMission: 'crusader_m3',
        unlocks: ['crusader_donation_hall'],
      },
      {
        id: 'crusader_m3',
        name: 'The Final Tip',
        description: 'The ultimate battle for internet chivalry.',
        briefing: 'The time has come for the Final Tip. Sir Chaddington will lead the most devoted Simps, the most dedicated Paladins, and the most premium-subscribed E-Girls into the ultimate battle. All factions must kneel before the power of unconditional support.',
        faction: 'crusaders',
        mapId: 'discourse_arena',
        objectives: [
          { id: 'obj1', description: 'Summon Sir Chaddington', type: 'build', target: 'crusader_chad_thundercock', completed: false, required: true },
          { id: 'obj2', description: 'Build the Donation Hall', type: 'build', target: 'crusader_donation_hall', completed: false, required: true },
          { id: 'obj3', description: 'Defeat all enemy factions', type: 'destroy', target: 'all_enemies', completed: false, required: true },
        ],
        sideQuests: [],
        secrets: [
          {
            id: 'secret4',
            name: 'The DM That Was Never Sent',
            hint: 'In the ruins of an old forum, a draft message remains unsent...',
            location: { x: 60, y: 60 },
            discovered: false,
            reward: 'Sir Chaddington gains the "Unsent DM" ability: stuns all enemies for 3 seconds.',
          },
        ],
        difficulty: 'malding',
        unlocks: [],
      },
    ],
  },

  // =====================================================
  // CHAPTER 4: THE CHADS - "The Way of the Grind"
  // =====================================================
  {
    id: 'chad_campaign',
    name: 'The Way of the Grind',
    faction: 'chads',
    description: 'The Chads don\'t do politics. They don\'t do drama. They do reps. But when the other factions threaten their sacred gym, the Bros must unite under the GigaChad to defend the Iron Temple and spread the gospel of gains to all.',
    missions: [
      {
        id: 'chad_m1',
        name: 'Leg Day',
        description: 'Build the Iron Temple and begin the grind.',
        briefing: 'Bro. The weights aren\'t going to lift themselves. Establish the Iron Temple, train some Gym Rats to gather protein (resources), and prepare for the most important day of all: leg day. The Chosen have been spreading rumors that you skip it. This aggression will not stand.',
        faction: 'chads',
        mapId: 'discourse_arena',
        objectives: [
          { id: 'obj1', description: 'Build the Iron Temple', type: 'build', target: 'chad_main', completed: false, required: true },
          { id: 'obj2', description: 'Train 5 Gym Rats', type: 'build', target: 'chad_gym_rat', amount: 5, completed: false, required: true },
          { id: 'obj3', description: 'Build the Gains Dojo', type: 'build', target: 'chad_gym', completed: false, required: true },
          { id: 'obj4', description: 'Train 4 Bros', type: 'build', target: 'chad_bro', amount: 4, completed: false, required: true },
        ],
        sideQuests: [
          {
            id: 'sq5',
            name: 'The Forbidden Pre-Workout',
            description: 'A mysterious substance has been found near the mountains. It glows.',
            trigger: { type: 'location', value: '45,25' },
            objectives: [
              { id: 'sq5_obj', description: 'Retrieve the Forbidden Pre-Workout', type: 'discover', target: '45,25', completed: false, required: true },
            ],
            reward: { tendies: 100 },
            discovered: false,
            completed: false,
          },
        ],
        secrets: [],
        difficulty: 'casual',
        nextMission: 'chad_m2',
        unlocks: ['chad_supplement_store'],
      },
      {
        id: 'chad_m2',
        name: 'Bulk Season',
        description: 'Expand your territory and out-muscle the competition.',
        briefing: 'It\'s bulk season, which means consuming everything in sight — including enemy territory. The Crusaders have been white-knighting too close to your turf. Show them that chivalry is no match for 315lb bench press. Time to get SWOLE.',
        faction: 'chads',
        mapId: 'discourse_arena',
        objectives: [
          { id: 'obj1', description: 'Build the Supplement Store', type: 'build', target: 'chad_supplement_store', completed: false, required: true },
          { id: 'obj2', description: 'Destroy 2 Crusader buildings', type: 'destroy', target: 'crusader_buildings', amount: 2, completed: false, required: true },
          { id: 'obj3', description: 'Accumulate 100 Tendies', type: 'collect', target: 'tendies', amount: 100, completed: false, required: true },
        ],
        sideQuests: [],
        secrets: [],
        difficulty: 'heated',
        nextMission: 'chad_m3',
        unlocks: ['chad_grind_temple'],
      },
      {
        id: 'chad_m3',
        name: 'Peak Performance',
        description: 'Achieve the ultimate form and crush all opposition.',
        briefing: 'This is it, brah. The final rep. The GigaChad has been summoned from the depths of the Iron Temple, and with a jawline that could cut diamonds, he will lead the Bros to total victory. Remember: we\'re all gonna make it. But them? They\'re NOT gonna make it.',
        faction: 'chads',
        mapId: 'discourse_arena',
        objectives: [
          { id: 'obj1', description: 'Summon the GigaChad', type: 'build', target: 'chad_gigachad', completed: false, required: true },
          { id: 'obj2', description: 'Build the Temple of the Grind', type: 'build', target: 'chad_grind_temple', completed: false, required: true },
          { id: 'obj3', description: 'Defeat all enemy factions', type: 'destroy', target: 'all_enemies', completed: false, required: true },
        ],
        sideQuests: [],
        secrets: [
          {
            id: 'secret5',
            name: 'The Perfect Form',
            hint: 'In the meme zone, a mirror reflects something impossible...',
            location: { x: 40, y: 40 },
            discovered: false,
            reward: 'GigaChad permanently gains "Perfect Form": +100 HP, +10 damage.',
          },
        ],
        difficulty: 'malding',
        unlocks: [],
      },
    ],
  },
];

export function getCampaign(factionId: FactionId): CampaignChapter | undefined {
  return CAMPAIGNS.find(c => c.faction === factionId);
}

export function getMission(missionId: string): CampaignMission | undefined {
  for (const campaign of CAMPAIGNS) {
    const mission = campaign.missions.find(m => m.id === missionId);
    if (mission) return mission;
  }
  return undefined;
}
