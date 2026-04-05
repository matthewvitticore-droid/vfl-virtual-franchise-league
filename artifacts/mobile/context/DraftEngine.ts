import {
  DraftProspect, CombineMeasurables, ProspectCollegeStats, NFLPosition, DraftState, DevelopmentTrait,
} from "./types";

// ─── Accolades pool by position ───────────────────────────────────────────────

const ACCOLADES_POOL: Partial<Record<NFLPosition, string[]>> = {
  QB:  ["Heisman Winner","Maxwell Award","Davey O'Brien Award","All-American","Conference POTY","Johnny Unitas Award","Rose Bowl MVP"],
  RB:  ["Doak Walker Award","All-American","Conference POTY","Cotton Bowl MVP","Orange Bowl MVP","Rushing Title"],
  WR:  ["Biletnikoff Award","All-American","Conference POTY","Receiving Title","Touchdown Leader","Senior Bowl Standout"],
  TE:  ["Mackey Award","All-American","Conference POTY","Senior Bowl Standout","Blocking Award"],
  OL:  ["Outland Trophy","Rimington Trophy","Lombardi Award","All-American","Conference Offensive Lineman of Year"],
  DE:  ["Butkus Award","Bednarik Award","All-American","Conference Defensive POTY","Sack Leader","Senior Bowl Standout"],
  DT:  ["Outland Trophy","Lombardi Award","Bednarik Award","All-American","Conference Defensive Lineman of Year"],
  LB:  ["Butkus Award","Bednarik Award","All-American","Conference Defensive POTY","Forced Fumble Leader"],
  CB:  ["Thorpe Award","Bednarik Award","All-American","Conference Defensive POTY","Interception Leader"],
  S:   ["Thorpe Award","Bednarik Award","All-American","Conference Defensive POTY","Interception Leader"],
  K:   ["Lou Groza Award","All-American","Conference Special Teams POTY"],
  P:   ["Ray Guy Award","All-American","Conference Special Teams POTY"],
};

const GENERAL_ACCOLADES = ["Senior Bowl Invite","East–West Shrine Game","3-year Starter","Team Captain","Academic All-American"];

function genAccolades(pos: NFLPosition, grade: number): string[] {
  const pool = [...(ACCOLADES_POOL[pos] ?? []), ...GENERAL_ACCOLADES];
  const max = grade >= 90 ? 3 : grade >= 80 ? 2 : grade >= 70 ? 1 : 0;
  if (max === 0 && Math.random() > 0.3) return [];
  const count = Math.min(max + (Math.random() < 0.2 ? 1 : 0), pool.length, 3);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function genProspectDevTrait(grade: number): DevelopmentTrait {
  if (grade >= 90) return Math.random() < 0.5 ? "X-Factor" : "Superstar";
  if (grade >= 82) return Math.random() < 0.5 ? "Superstar" : "Star";
  if (grade >= 72) return Math.random() < 0.45 ? "Star" : "Normal";
  if (grade >= 60 && Math.random() < 0.15) return "Late Bloomer";
  return "Normal";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }
function rng(min: number, max: number) { return min + Math.random() * (max - min); }
function irng(min: number, max: number) { return Math.round(rng(min, max)); }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function gaussian(mean: number, std: number, min = 0, max = 999): number {
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return clamp(mean + z * std, min, max);
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function picks<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── Name Pool (for prospects) ────────────────────────────────────────────────

const FIRST = [
  "Darius","Malik","Quinton","Terrell","Javion","DeShawn","Kendrick","Marquise","Tyrese","Lamont",
  "Cortez","Devonte","Jamarion","Kelvin","Rasheed","Deontae","Jermaine","Levonte","Dwayne","Kareem",
  "Trevon","Jaquavious","Elroy","Darnell","Marshawn","Jakeem","Devante","Tyler","Brandon","Nathan",
  "Derek","Blake","Tanner","Logan","Hunter","Austin","Chase","Garrett","Parker","Drew","Cameron",
  "Brennan","Shane","Dylan","Evan","Nolan","Griffin","Reid","Connor","Liam","Owen","Finn",
  "Karim","Amara","Ibrahim","Moussa","Oumar","Samba","Gideon","Solomon","Ezekiel","Nathaniel",
  "Jeremiah","Thaddeus","Cornelius","Reginald","Floyd","Otis","Rufus","Roscoe","Virgil","Alvin",
  "Alejandro","Carlos","Diego","Eduardo","Emilio","Fernando","Gabriel","Hector","Ivan","Jorge",
  "Luis","Marco","Mateo","Miguel","Nicolas","Oscar","Pablo","Rafael","Ricardo","Roberto","Santiago",
  "Leandro","Valentino","Bruno","Luca","Giovanni","Nico","Dante","Angelo","Alaric","Leif","Bjorn",
  "Colton","Preston","Trevor","Quinn","Declan","Callum","Rory","Kieran","Sean","Aiden",
];
const LAST = [
  "Washington","Jefferson","Robinson","Williams","Johnson","Davis","Harris","Thompson","Jackson","Thomas",
  "Walker","Lewis","Clark","Young","Allen","Scott","Green","Baker","Adams","Nelson","Carter",
  "Gonzalez","Rodriguez","Martinez","Garcia","Hernandez","Lopez","Flores","Torres","Ramirez","Cruz",
  "Morrison","Patterson","Chambers","Hawkins","Ferguson","Gardner","Montgomery","Bishop","Harrison",
  "Gallagher","Donovan","Fitzgerald","Callahan","Sullivan","Connelly","Brennan","Sheridan",
  "Mercer","Sloane","Briggs","Holt","Drake","Steele","Cross","Stone","Fox","Chase","Vega",
  "Montoya","Delgado","Fuentes","Santana","Romero","Campos","Acosta","Herrera",
  "Okafor","Mensah","Asante","Boateng","Owusu","Adjei","Darko","Diallo","Kouyate","Traore",
  "Sterling","Whitfield","Redmond","Blackwood","Merriweather","Prescott","Pemberton","Ravenswood",
  "Grimes","Sykes","Booker","Bonner","Bridges","Cannon","Clements","Farrow","Combs",
  "Kowalski","Novak","Petrov","Volkov","Popov","Leblanc","Bouchard","Tremblay",
  "Reyes","Morales","Ortiz","Gutierrez","Chavez","Ramos","Ruiz","Medina","Castillo","Vargas",
  "Whitmore","Dunmore","Ashby","Foxworth","Langley","Northcott","Cromwell","Fairbanks","Hathaway",
];
function rn() { return `${pick(FIRST)} ${pick(LAST)}`; }

// ─── Colleges ─────────────────────────────────────────────────────────────────

const COLLEGES = [
  "Alabama","Ohio State","Georgia","Clemson","LSU","Oklahoma","Michigan","Notre Dame","Penn State","Texas",
  "Oregon","USC","Florida","Florida State","Auburn","Tennessee","Ole Miss","Arkansas","Mississippi State","Nebraska",
  "Iowa","Wisconsin","Minnesota","Michigan State","Northwestern","Illinois","Purdue","Indiana","Maryland","Rutgers",
  "TCU","Baylor","Texas Tech","Kansas State","Oklahoma State","West Virginia","Iowa State","Houston","Cincinnati","UCF",
  "Utah","Colorado","Arizona State","Arizona","Washington","Oregon State","California","Stanford","UCLA","Washington State",
  "Miami","Boston College","Pittsburgh","Virginia Tech","NC State","North Carolina","Louisville","Duke","Syracuse","Wake Forest",
  "Navy","Army","Air Force","Fresno State","Boise State","UTSA","Liberty","BYU","SMU","Memphis",
  "Appalachian State","Troy","Georgia Southern","South Alabama","Coastal Carolina",
];

// ─── Archetypes by Position ───────────────────────────────────────────────────

// Rating-based archetype computer for RB / QB / WR
function computeArchetype(pos: NFLPosition, grade: number, combine: CombineMeasurables): string {
  const dnp = combine.didNotParticipate;
  const spd   = dnp ? 70 : clamp(99 - (combine.fortyYardDash - 4.3) * 65, 40, 99);
  const coneR = dnp ? 70 : clamp(99 - (combine.threeCone - 6.5) * 18, 40, 99);
  const shutR = dnp ? 70 : clamp(99 - (combine.shuttleRun - 4.0) * 58, 40, 99);
  const agi   = (shutR + coneR) / 2;
  const str   = dnp ? 70 : clamp(combine.benchPress * 1.6 + 22, 40, 99);
  const handR = dnp ? 70 : clamp(40 + (combine.handSize - 8.5) * 19.67, 40, 99);
  const base  = clamp(50 + (grade / 100) * 45, 40, 99);
  const cth   = dnp ? 70 : clamp(handR * 0.30 + base * 0.45 + agi * 0.25, 40, 99);
  // Break-tackle proxy
  const btk   = clamp(str * 0.60 + base * 0.40, 40, 99);
  // CAR (carry / ball security) proxy
  const car   = clamp(str * 0.40 + base * 0.35 + agi * 0.25, 40, 99);

  if (pos === "RB") {
    if (btk >= 80)                    return "Power Back";
    if (spd >= 82 && cth >= 76)       return "Receiving Back";
    if (spd >= 80 && agi >= 78)       return "Elusive Back";
    return "Balanced Back";
  }

  if (pos === "QB") {
    const multiElite = [str, base, spd].filter(v => v >= 88).length;
    if (grade >= 88 && multiElite >= 2 && str >= 88) return "Face of Franchise";
    if (spd >= 82)                                    return "Scrambler";
    if (str >= 84)                                    return "Strong Arm";
    if (base >= 82)                                   return "Accurate";
    return "Pocket Passer";
  }

  if (pos === "WR") {
    const h = combine.height, w = combine.weight;
    if (grade >= 88 && h >= 72 && w >= 200 && spd >= 80 && cth >= 80) return "All-Pro Potential";
    if (spd >= 95)              return "Deep Threat";
    if (cth >= 80 && car >= 72) return "Possession Receiver";
    return "Balanced Receiver";
  }

  return "Prospect"; // fallback (never reached for RB/QB/WR)
}

const ARCHETYPES: Partial<Record<NFLPosition, string[]>> = {
  // RB / QB / WR are computed dynamically by computeArchetype — no pool needed
  TE:  ["Receiving TE","Blocking TE","H-Back","Red Zone Threat","Move Tight End","In-Line Blocker"],
  OL:  ["Mauler Guard","Pass Protector","Athletic Tackle","Run Blocker","Zone Blocker","Power Lineman"],
  DE:  ["Speed Rusher","Power Rusher","Hybrid OLB","Run Stopper DE","Pass Rush Specialist","Versatile Edge"],
  DT:  ["Nose Tackle","3-Tech Penetrator","Run Stopper","Interior Pass Rusher","Two-Gap NT","Disruption DT"],
  LB:  ["Coverage LB","Run Stopper LB","Blitzing LB","Box Safety-Hybrid","All-Around LB","Weakside LB"],
  CB:  ["Press Cornerback","Zone Corner","Nickel CB","Long Corner","Slot-only CB","Man Coverage CB"],
  S:   ["Free Safety","Strong Safety","Box Safety","Center Field FS","Robber FS","Run-Support SS"],
  K:   ["Power Kicker","Precision Kicker","Long-Range Specialist"],
  P:   ["Directional Punter","Hang-Time Specialist","Rugby-Style Punter"],
};

// ─── Combine Measurables (position-appropriate) ───────────────────────────────

const COMBINE_RANGES: Record<NFLPosition, {
  forty: [number,number]; bench: [number,number]; vert: [number,number];
  broad: [number,number]; shuttle: [number,number]; cone: [number,number];
  height: [number,number]; weight: [number,number]; arm: [number,number]; hand: [number,number];
}> = {
  QB:  { forty:[4.60,5.00], bench:[15,28],  vert:[28,42], broad:[100,120], shuttle:[4.12,4.45], cone:[6.80,7.40], height:[71,77], weight:[205,240], arm:[30,34], hand:[9.0,10.5] },
  RB:  { forty:[4.28,4.55], bench:[18,34],  vert:[32,45], broad:[110,132], shuttle:[4.00,4.28], cone:[6.55,7.10], height:[67,73], weight:[185,228], arm:[29,33], hand:[8.5,10.0] },
  WR:  { forty:[4.28,4.55], bench:[9,22],   vert:[34,45], broad:[118,135], shuttle:[3.98,4.25], cone:[6.50,7.10], height:[68,76], weight:[170,215], arm:[30,34], hand:[8.5,10.5] },
  TE:  { forty:[4.50,4.85], bench:[20,34],  vert:[28,42], broad:[102,126], shuttle:[4.08,4.42], cone:[6.75,7.35], height:[73,79], weight:[240,272], arm:[31,35], hand:[9.0,11.0] },
  OL:  { forty:[4.90,5.40], bench:[24,40],  vert:[23,34], broad:[96,118],  shuttle:[4.40,4.88], cone:[7.20,8.10], height:[74,80], weight:[285,340], arm:[32,37], hand:[9.5,11.5] },
  DE:  { forty:[4.60,5.05], bench:[22,37],  vert:[28,41], broad:[104,124], shuttle:[4.08,4.48], cone:[6.70,7.30], height:[74,79], weight:[245,278], arm:[32,36], hand:[9.0,11.0] },
  DT:  { forty:[4.70,5.10], bench:[28,42],  vert:[22,36], broad:[90,114],  shuttle:[4.28,4.75], cone:[6.95,7.90], height:[72,78], weight:[290,340], arm:[31,36], hand:[9.5,12.0] },
  LB:  { forty:[4.46,4.75], bench:[22,36],  vert:[30,43], broad:[106,130], shuttle:[4.04,4.38], cone:[6.60,7.25], height:[72,76], weight:[225,255], arm:[30,34], hand:[8.5,10.5] },
  CB:  { forty:[4.28,4.55], bench:[12,22],  vert:[34,45], broad:[116,135], shuttle:[3.95,4.22], cone:[6.45,7.00], height:[69,75], weight:[175,202], arm:[29,33], hand:[8.5,10.5] },
  S:   { forty:[4.28,4.55], bench:[14,27],  vert:[32,44], broad:[112,133], shuttle:[3.97,4.28], cone:[6.50,7.10], height:[70,75], weight:[195,218], arm:[29,33], hand:[8.5,10.5] },
  K:   { forty:[4.80,5.20], bench:[10,20],  vert:[25,36], broad:[98,116],  shuttle:[4.28,4.68], cone:[6.95,7.75], height:[70,76], weight:[175,215], arm:[28,33], hand:[8.5,10.5] },
  P:   { forty:[4.88,5.28], bench:[10,18],  vert:[24,34], broad:[96,114],  shuttle:[4.38,4.78], cone:[7.05,7.85], height:[72,77], weight:[195,228], arm:[29,34], hand:[8.5,10.5] },
};

function generateCombine(pos: NFLPosition, grade: number, dnp = false): CombineMeasurables {
  if (dnp) return {
    fortyYardDash: 0, tenYardSplit: 0, benchPress: 0, verticalJump: 0, broadJump: 0,
    shuttleRun: 0, threeCone: 0, height: 72, weight: 220, armLength: 32, handSize: 9.5, didNotParticipate: true,
  };
  const r = COMBINE_RANGES[pos];
  const gradeBonus = (grade - 50) / 50; // -1 to +1
  function adj(range: [number,number], invert = false) {
    const base = rng(range[0], range[1]);
    const spread = (range[1] - range[0]) * 0.3;
    const adjusted = base + (invert ? gradeBonus : -gradeBonus) * spread;
    return Math.round(clamp(adjusted, range[0] * 0.9, range[1] * 1.05) * 100) / 100;
  }
  const forty = adj(r.forty, true);
  // 10-yd split is ~41-43% of the 40-yd time with realistic variance
  const tenSplit = Math.round(clamp(forty * 0.415 + rng(-0.02, 0.03), 1.44, 1.75) * 100) / 100;
  return {
    fortyYardDash: forty,
    tenYardSplit: tenSplit,
    benchPress: Math.round(adj(r.bench)),
    verticalJump: Math.round(adj(r.vert) * 2) / 2,
    broadJump: Math.round(adj(r.broad)),
    shuttleRun: adj(r.shuttle, true),
    threeCone: adj(r.cone, true),
    height: Math.round(adj(r.height)),
    weight: Math.round(adj(r.weight)),
    armLength: Math.round(adj(r.arm) * 10) / 10,
    handSize: Math.round(adj(r.hand) * 10) / 10,
    didNotParticipate: false,
  };
}

// ─── College Stats by Position ────────────────────────────────────────────────

function generateCollegeStats(pos: NFLPosition, grade: number): ProspectCollegeStats {
  const g = Math.max(8, irng(10, 14));
  const q = grade / 100;
  switch (pos) {
    case "QB": return {
      gamesPlayed: g,
      completionPct: Math.round(gaussian(55 + q * 20, 5, 40, 78) * 10) / 10,
      passingYards:  irng(1800, 1800 + Math.round(q * 1800)),
      passingTDs:    irng(12, 12 + Math.round(q * 22)),
      interceptions: irng(2, 18 - Math.round(q * 10)),
      rushingYards:  irng(50, 650),
      rushingTDs:    irng(0, 8),
    };
    case "RB": return {
      gamesPlayed: g,
      rushingYards:  irng(600, 600 + Math.round(q * 1200)),
      rushingTDs:    irng(5, 5 + Math.round(q * 18)),
      yardsPerCarry: Math.round(gaussian(4.5 + q * 2.5, 0.8, 3.0, 8.5) * 10) / 10,
      receptions:    irng(10, 55),
      receivingYards: irng(80, 500),
    };
    case "WR": return {
      gamesPlayed: g,
      receptions:    irng(40, 40 + Math.round(q * 55)),
      receivingYards: irng(500, 500 + Math.round(q * 1200)),
      receivingTDs:  irng(3, 3 + Math.round(q * 15)),
      yardsPerCatch: Math.round(gaussian(12 + q * 7, 2, 7, 22) * 10) / 10,
    };
    case "TE": return {
      gamesPlayed: g,
      receptions:    irng(25, 25 + Math.round(q * 45)),
      receivingYards: irng(280, 280 + Math.round(q * 800)),
      receivingTDs:  irng(2, 2 + Math.round(q * 12)),
      yardsPerCatch: Math.round(gaussian(10 + q * 6, 2, 6, 18) * 10) / 10,
    };
    case "OL": return {
      gamesPlayed: g,
      gamesStarted: Math.max(g - 2, irng(25, 45)),
    };
    case "DE": case "DT": return {
      gamesPlayed: g,
      tackles:       irng(30, 30 + Math.round(q * 50)),
      sacks:         Math.round(gaussian(5 + q * 12, 3, 0, 22) * 10) / 10,
      forcedFumbles: irng(0, Math.round(q * 5)),
    };
    case "LB": return {
      gamesPlayed: g,
      tackles:       irng(60, 60 + Math.round(q * 60)),
      sacks:         Math.round(gaussian(2 + q * 8, 2, 0, 15) * 10) / 10,
      interceptionsDef: irng(0, Math.round(q * 4)),
      forcedFumbles: irng(0, Math.round(q * 4)),
    };
    case "CB": case "S": return {
      gamesPlayed: g,
      tackles:       irng(40, 40 + Math.round(q * 40)),
      interceptionsDef: irng(0, Math.round(q * 8)),
      passDeflections:  irng(4, 4 + Math.round(q * 14)),
      forcedFumbles: irng(0, 3),
    };
    default: return { gamesPlayed: g };
  }
}

// ─── Strengths & Weaknesses (rating-aware) ────────────────────────────────────

// Athletic traits: strength/weakness text tied to a specific rating.
// Only shown when the player's measured value crosses the threshold.
const ATHL_TRAITS: Array<{
  key: "spd"|"acc"|"agi"|"exp"|"str"|"cth";
  str: string; wk: string;
  hi: number; lo: number;                              // rating thresholds
  rel: Partial<Record<NFLPosition,"h"|"m"|"l">>;       // position relevance
}> = [
  { key:"spd", str:"Elite straight-line speed",          wk:"Lacks top-end speed",
    hi:82, lo:68, rel:{ CB:"h",WR:"h",RB:"h",S:"h",DE:"m",LB:"m",TE:"l" } },
  { key:"acc", str:"Elite change of direction",           wk:"Slow to change direction",
    hi:82, lo:68, rel:{ CB:"h",RB:"h",WR:"h",DE:"h",LB:"m",QB:"m",OL:"l" } },
  { key:"agi", str:"Exceptional lateral agility",         wk:"Below-average lateral agility",
    hi:80, lo:66, rel:{ CB:"h",RB:"m",WR:"m",QB:"m",LB:"m",DE:"m" } },
  { key:"exp", str:"Explosive athleticism off the mark",  wk:"Lacks first-step explosion",
    hi:80, lo:65, rel:{ WR:"h",CB:"m",S:"m",TE:"m",RB:"m" } },
  { key:"str", str:"Outstanding physical strength",       wk:"Needs to add strength and power",
    hi:78, lo:62, rel:{ OL:"h",DT:"h",DE:"h",LB:"m",TE:"m",RB:"l" } },
  { key:"cth", str:"Natural catcher with reliable hands", wk:"Inconsistent hands under pressure",
    hi:76, lo:65, rel:{ WR:"h",TE:"h",RB:"m",CB:"l",S:"l" } },
];

// Football-only pools — no athletic references (those come from ATHL_TRAITS above)
const FOOTBALL_STRENGTHS: Partial<Record<NFLPosition, string[]>> = {
  QB:  ["Quick release","Pocket presence","Pre-snap reads","Decision-making","Anticipation","NFL-ready IQ","Command of offense","Deep ball timing"],
  RB:  ["Vision in the run game","Pass protection","Ball security","Contact balance","Route running out of backfield","Hard to bring down"],
  WR:  ["Route running precision","Separation at the top of routes","Body control on deep balls","Red zone threat","YAC ability","Release off the line"],
  TE:  ["In-line blocking versatility","Seam route specialist","Red zone target","Move tight end skill","Pass protection IQ"],
  OL:  ["Pass set technique","Run blocking leverage","Hand placement","Football IQ","Versatility across the line","Drive blocking"],
  DE:  ["Pass rush variety","Bend around the edge","Motor","First step off the snap","Scheme versatility","Counter moves"],
  DT:  ["Two-gap technique","Interior gap disruption","Clogging the run","Motor","Relentless pursuit","Stacking blockers"],
  LB:  ["Run stopping instincts","Blitz recognition","Coverage IQ","Leadership","Sideline-to-sideline range","Block shedding"],
  CB:  ["Man coverage technique","Zone awareness","Ball production","Press footwork","Football IQ","Playing the ball"],
  S:   ["Range in coverage","Run support instincts","Ball hawking","Communication","QB-read ability","Coverage versatility"],
  K:   ["Clutch under pressure","Kickoff consistency"],
  P:   ["Hang time","Directional punting","Pinning opponents inside the 20"],
};

const FOOTBALL_WEAKNESSES: Partial<Record<NFLPosition, string[]>> = {
  QB:  ["Happy feet under pressure","Decision-making timing","Holding the ball too long","Pre-snap read depth","Footwork in the pocket","Interception-prone"],
  RB:  ["Pass blocking fundamentals","Ball security concerns","Consistency vs. stacked boxes","Route diversity"],
  WR:  ["Blocking effort","Route tree depth","YAC consistency","Concentration drops","Body control in traffic","Size for contested catches"],
  TE:  ["Route tree limitations","Red zone consistency","Blocking footwork","Alignment versatility","Concentration"],
  OL:  ["Technique vs. speed rushers","Awareness on stunts","Footwork in open space","Competitive-level concerns","Consistency"],
  DE:  ["Counter moves off primary rush","Setting the edge vs. the run","Motor late in games","Hand use","Pass rush planning"],
  DT:  ["Leverage in gap protection","Counter moves vs. double teams","Consistency in effort","Stamina"],
  LB:  ["Footwork in zone coverage","Man coverage in space","Getting off blocks","Blitz recognition","Tackling technique"],
  CB:  ["Zone coverage depth","Ball awareness","Tackling in run defense","Technique vs. physicality mismatch","Consistency","Size"],
  S:   ["Man coverage assignments","Tackling technique in space","Reading complex routes","Alignment errors","Reaction time"],
  K:   ["Short-range consistency","Performance in cold weather"],
  P:   ["Consistency in field position","Hang time in wind","Return coverage"],
};

// Generate rating-consistent strengths and weaknesses
function genStrengthsWeaknesses(
  pos: NFLPosition, grade: number, combine: CombineMeasurables,
): { strengths: string[]; weaknesses: string[] } {
  const dnp = combine.didNotParticipate;
  const spd   = dnp ? 70 : clamp(99 - (combine.fortyYardDash - 4.3) * 65, 40, 99);
  const coneR = dnp ? 70 : clamp(99 - (combine.threeCone - 6.5) * 18, 40, 99);
  const shutR = dnp ? 70 : clamp(99 - (combine.shuttleRun - 4.0) * 58, 40, 99);
  const acc   = coneR;
  const agi   = dnp ? 70 : (shutR + coneR) / 2;
  const vertR = dnp ? 70 : clamp(40 + (combine.verticalJump - 22) * 3.278, 40, 99);
  const broadR= dnp ? 70 : clamp(40 + (combine.broadJump - 90) * 1.967, 40, 99);
  const exp   = dnp ? 70 : (vertR + broadR) / 2;
  const str   = dnp ? 70 : clamp(combine.benchPress * 1.6 + 22, 40, 99);
  const handR = dnp ? 70 : clamp(40 + (combine.handSize - 8.5) * 19.67, 40, 99);
  const baseQ = clamp(50 + (grade / 100) * 45, 40, 99);
  const cth   = dnp ? 70 : clamp(handR * 0.30 + baseQ * 0.45 + agi * 0.25, 40, 99);
  const vals: Record<string, number> = { spd, acc, agi, exp, str, cth };

  const athStrengths: string[] = [];
  const athWeaknesses: string[] = [];
  for (const t of ATHL_TRAITS) {
    const r = t.rel[pos];
    if (!r) continue;
    const p = r === "h" ? 0.92 : r === "m" ? 0.65 : 0.28;
    const v = vals[t.key];
    if (v >= t.hi && Math.random() < p) athStrengths.push(t.str);
    else if (v <= t.lo && Math.random() < p) athWeaknesses.push(t.wk);
  }

  const fStr = FOOTBALL_STRENGTHS[pos] ?? ["Motor","Football IQ","Work ethic"];
  const fWk  = FOOTBALL_WEAKNESSES[pos] ?? ["Consistency","Technique","Experience"];
  const tStr = irng(2, 4), tWk = irng(1, 3);

  const strPool = [...new Set([...athStrengths, ...picks(fStr, tStr)])];
  const wkPool  = [...new Set([...athWeaknesses,  ...picks(fWk, tWk)])];
  return {
    strengths: picks(strPool, Math.min(tStr, strPool.length)),
    weaknesses: picks(wkPool,  Math.min(tWk,  wkPool.length)),
  };
}

// ─── Combine → Athletic Score (position-weighted) ─────────────────────────────

function combineAthlScore(pos: NFLPosition, c: CombineMeasurables): number {
  // Derived ratings (same formulas as frontoffice.tsx)
  const spd = clamp(99 - (c.fortyYardDash - 4.3) * 65, 40, 99);
  const vertR  = clamp(40 + (c.verticalJump - 22) * 3.278, 40, 99); // 40" = 99
  const broadR = clamp(40 + (c.broadJump - 90) * 1.967, 40, 99);   // 120" = 99
  const ath = (vertR + broadR) / 2;
  const shutR = clamp(99 - (c.shuttleRun - 3.9) * 57, 40, 99);
  const coneR = clamp(99 - (c.threeCone - 6.5) * 18, 40, 99);
  const qck = (shutR + coneR) / 2;
  const str = clamp(c.benchPress * 1.6 + 22, 40, 99);
  // Arm-length proxy for throw power (QB only, range ~29–37 inches → 40–99)
  const armR = clamp(40 + (c.armLength - 29) * 7.4, 40, 99);

  switch (pos) {
    // Skill positions: speed is king, athleticism and quickness round it out
    case "RB": return spd * 0.45 + ath * 0.30 + qck * 0.25;
    case "WR": return spd * 0.45 + ath * 0.30 + qck * 0.25;
    case "CB": return spd * 0.45 + ath * 0.25 + qck * 0.30;
    case "S":  return spd * 0.40 + ath * 0.25 + qck * 0.25 + str * 0.10;
    case "TE": return spd * 0.30 + ath * 0.25 + qck * 0.25 + str * 0.20;
    case "LB": return spd * 0.30 + ath * 0.20 + qck * 0.30 + str * 0.20;
    // D-line: strength + quickness + first-step speed
    case "DE": return spd * 0.20 + qck * 0.40 + str * 0.40;
    case "DT": return str  * 0.55 + qck * 0.30 + ath * 0.15;
    // O-line: strength dominant
    case "OL": return str  * 0.60 + ath * 0.20 + qck * 0.20;
    // QB: arm power + footwork quickness + mobility
    case "QB": return armR * 0.35 + qck * 0.35 + spd * 0.30;
    default:   return 70; // K/P: neutral
  }
}

// Blend tape/skill seed with position-weighted combine athleticism score.
// Speed positions (CB/WR/RB/S): 70% athleticism so elite 40 times always
// produce elite grades regardless of where the player was seeded.
function adjustGradeForCombine(
  pos: NFLPosition, rawGrade: number, combine: CombineMeasurables,
): number {
  if (combine.didNotParticipate) return rawGrade;
  const score = combineAthlScore(pos, combine);

  // For speed positions athleticism IS the grade — combine score drives 70%.
  // The "skill/tape" seed is only 30% so a 4.28 CB always grades elite.
  // For other positions skill/experience weighs more.
  let skillW: number;
  switch (pos) {
    case "RB": case "WR": case "CB": case "S":
      skillW = 0.30; break; // speed kills — 70% athleticism
    case "DE": case "TE": case "LB":
      skillW = 0.50; break; // even split
    case "DT": case "OL":
      skillW = 0.40; break; // strength-driven, 60% athleticism
    case "QB":
      skillW = 0.55; break; // arm + IQ matter, 45% athleticism
    default:
      skillW = 0.80; break; // K/P: mostly skill/leg
  }
  const athW = 1 - skillW;
  return clamp(Math.round(rawGrade * skillW + score * athW), 35, 99);
}

// ─── Grade → Round Projection ─────────────────────────────────────────────────

function gradeToRound(grade: number): number {
  if (grade >= 87) return 1;
  if (grade >= 78) return 2;
  if (grade >= 70) return 3;
  if (grade >= 62) return 4;
  if (grade >= 54) return 5;
  if (grade >= 47) return 6;
  return 7;
}

function gradeLabel(round: number): DraftProspect["grade"] {
  return (["1st","2nd","3rd","4th","5th","6th","7th"] as const)[round - 1] ?? "7th";
}

// ─── Position Distribution for Draft Class ────────────────────────────────────

const POSITION_POOL: NFLPosition[] = [
  "QB","QB","QB",
  "RB","RB","RB","RB","RB",
  "WR","WR","WR","WR","WR","WR","WR","WR",
  "TE","TE","TE","TE",
  "OL","OL","OL","OL","OL","OL","OL","OL","OL","OL",
  "DE","DE","DE","DE","DE","DE",
  "DT","DT","DT","DT","DT",
  "LB","LB","LB","LB","LB","LB",
  "CB","CB","CB","CB","CB","CB","CB",
  "S","S","S","S","S",
  "K","K","P",
];

// ─── Main: Generate Draft Class ───────────────────────────────────────────────

export function generateDraftClass(year: number, count = 252): DraftProspect[] {
  const prospects: DraftProspect[] = [];
  const positionCount: Partial<Record<NFLPosition, number>> = {};

  for (let i = 0; i < count; i++) {
    const pos = POOL_PICK[i % POOL_PICK.length];
    positionCount[pos] = (positionCount[pos] ?? 0) + 1;

    // Grade distribution: 1st-rounders are rare, most are mid-rounds
    let grade: number;
    if (i < 32)        grade = irng(72, 96);   // Top 32: potential day-1 picks
    else if (i < 64)   grade = irng(62, 80);   // Day 2
    else if (i < 128)  grade = irng(50, 70);   // Day 3
    else               grade = irng(38, 62);   // Late/UDFA

    const dnp = Math.random() < 0.06; // 6% chance didn't participate in combine

    // Generate combine first so athletic profile can refine the grade
    const combine = generateCombine(pos, grade, dnp);
    // Adjust grade ±12 pts based on position-specific combine athleticism
    const finalGrade = adjustGradeForCombine(pos, grade, combine);

    // Dev-trait bonus (X-Factor/Superstar QBs especially)
    const devTrait = genProspectDevTrait(finalGrade);
    const devBonus = (devTrait === "X-Factor" ? 3 : devTrait === "Superstar" ? 2 : devTrait === "Star" ? 1 : 0);
    let adjustedGrade = clamp(finalGrade + devBonus, 35, 99);

    // CTH bonus: elite hands (75+ catching) raise draft grade for skill/DB positions
    if (!dnp && (pos === "WR" || pos === "RB" || pos === "CB" || pos === "S" || pos === "TE")) {
      const handRtg  = clamp(40 + (combine.handSize - 8.5) * 19.67, 40, 99);
      const baseForCTH = clamp(50 + (adjustedGrade / 100) * 45, 40, 99);
      const shutR2 = clamp(99 - (combine.shuttleRun - 4.0) * 58, 40, 99);
      const coneR2 = clamp(99 - (combine.threeCone - 6.5) * 18, 40, 99);
      const agiForCTH = (shutR2 + coneR2) / 2;
      const cth = clamp(Math.round(handRtg * 0.30 + baseForCTH * 0.45 + agiForCTH * 0.25), 40, 99);
      if (cth >= 75) adjustedGrade = clamp(adjustedGrade + 3, 35, 99);
    }

    const projRound = gradeToRound(adjustedGrade);
    const projPick = irng(1, 32);

    const { strengths, weaknesses } = genStrengthsWeaknesses(pos, adjustedGrade, combine);

    prospects.push({
      id: uid(),
      name: rn(),
      position: pos,
      college: pick(COLLEGES),
      overallGrade: adjustedGrade,
      potential: Math.min(99, adjustedGrade + irng(0, 15)),
      projectedRound: projRound,
      projectedPick: projPick,
      grade: gradeLabel(projRound),
      archetype: (pos === "RB" || pos === "QB" || pos === "WR")
        ? computeArchetype(pos, adjustedGrade, combine)
        : pick(ARCHETYPES[pos] ?? ["Prospect"]),
      developmentTrait: devTrait,
      combine,
      collegeStats: generateCollegeStats(pos, adjustedGrade),
      accolades: genAccolades(pos, adjustedGrade),
      strengths,
      weaknesses,
      isPickedUp: false,
      scoutingUnlocked: true,
    });
  }

  // Sort by overall grade descending
  return prospects.sort((a, b) => b.overallGrade - a.overallGrade);
}

// Pre-shuffled position pool for variety
const POOL_PICK = [...POSITION_POOL].sort(() => Math.random() - 0.5);

// ─── Initial Draft State ──────────────────────────────────────────────────────

export function initDraftState(teamIds: string[], playerTeamId: string): DraftState {
  // User's team is inserted based on previous season record (simplified: random 1–32)
  const userSlot = irng(0, 31);
  const otherTeams = teamIds.filter(id => id !== playerTeamId).sort(() => Math.random() - 0.5);
  const draftOrder = [...otherTeams];
  draftOrder.splice(userSlot, 0, playerTeamId);

  return {
    currentRound: 1,
    currentPickInRound: 1,
    overallPick: 1,
    currentTeamId: draftOrder[0],
    isUserTurn: draftOrder[0] === playerTeamId,
    isComplete: false,
    draftOrder,
    completedPicks: [],
  };
}

// ─── AI Pick Logic ────────────────────────────────────────────────────────────

const POSITION_NEED: NFLPosition[] = [
  "QB","RB","WR","TE","OL","DE","DT","LB","CB","S","K","P"
];

export function simulateAIPick(
  teamId: string,
  availableProspects: DraftProspect[],
  round: number,
): DraftProspect {
  const available = availableProspects.filter(p => !p.isPickedUp);
  if (available.length === 0) return availableProspects[0];

  // BPA (Best Player Available) with slight positional need bias
  const topProspects = available.slice(0, Math.min(12, available.length));
  // Occasionally reach for need (20% chance)
  if (Math.random() < 0.2 && topProspects.length > 3) {
    return pick(topProspects.slice(0, 5));
  }
  return topProspects[0];
}
