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

const ARCHETYPES: Partial<Record<NFLPosition, string[]>> = {
  QB:  ["Pocket Passer","Dual-Threat","Game Manager","Gunslinger","Mobile QB","System QB"],
  RB:  ["Workhorse Back","Receiving Back","Power Runner","Change of Pace","Bruiser","Elusive Scooter"],
  WR:  ["Slot Receiver","Deep Threat","Route Runner","Red Zone Target","Physical WR","Possession Receiver"],
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

// ─── Strengths & Weaknesses ───────────────────────────────────────────────────

const STRENGTHS_BY_POS: Partial<Record<NFLPosition, string[]>> = {
  QB:  ["Quick release","Pocket presence","Arm strength","Accuracy on intermediate routes","Decision-making","Mobility","Anticipation","NFL-ready IQ","Deep ball accuracy","Pre-snap reads"],
  RB:  ["Burst through gaps","Vision","Pass protection","Receiving ability","Elusiveness","Breaking tackles","Speed in open field","Ball security","Route running","Contact balance"],
  WR:  ["Route running","Separation","Contested catches","Deep speed","Run after catch","Blocking","Release off line","Body control","Reliable hands","Red zone threat"],
  TE:  ["In-line blocking","Receiving threat","Move tight end","Red zone target","Route running","Run blocking","Versatility","Seam routes","Physical mismatch","Pass protection"],
  OL:  ["Pass protection","Run blocking","Quick feet","Hand technique","Strength at point of attack","Intelligence","Versatility","Drive blocking","Athletic ability","Anchor vs. power"],
  DE:  ["First step quickness","Pass rush moves","Bend around edge","Power rush","Versatility","Motor","Run defense","Counter moves","Disruption","Get off the ball"],
  DT:  ["Clogging the run","Pass rush push","Two-gap technique","Leverage","Motor","Strength","Pursuit","Disruption","First step","Stacking blockers"],
  LB:  ["Run stopping","Coverage ability","Blitzing","Instincts","Tackling","Sideline-to-sideline speed","Pass rush","Awareness","Block shedding","Leadership"],
  CB:  ["Man coverage","Zone coverage","Ball production","Press technique","Recovery speed","Physicality","Playing the ball","Technique","Tackling","Football IQ"],
  S:   ["Range in coverage","Run support","Zone awareness","Ball hawking","Communication","Physicality","Tackling","Coverage versatility","Leadership","Reading the QB"],
  K:   ["Leg strength","Accuracy","Kickoff consistency","Clutch performance"],
  P:   ["Hang time","Directional punting","Pinning opponents deep","Rugby-style"],
};
const WEAKNESSES_BY_POS: Partial<Record<NFLPosition, string[]>> = {
  QB:  ["Happy feet under pressure","Accuracy on deep outs","Pre-snap reads","Footwork in pocket","Ball security","Decision-making","Holding ball too long","Size/frame","Interception-prone","Scramble timing"],
  RB:  ["Pass blocking","Durability concerns","Size","Receiving out of backfield","Ball security","Consistency","Speed in long runs","Vision on cutback","NFL-level reads","Route diversity"],
  WR:  ["Drops under pressure","Blocking","Creating separation vs. press","Body control","Route tree depth","YAC consistency","Concentration drops","Consistency","Size","Physicality"],
  TE:  ["Run blocking","Route tree","Separation","Athleticism vs. LBs","Red zone inconsistency","Hands","Blocking footwork","Pass protection","Alignment versatility","Concentration"],
  OL:  ["Pass sets vs. speed","Footwork in space","Run blocking leverage","Technique","Strength","Awareness on stunts","Depth of experience","Athleticism","Consistency","Competitive level"],
  DE:  ["Setting the edge vs. run","Counter moves","Bend around corner","Pass rush consistency","Effort","Against double teams","Motor late in games","Hand use","Setting up rushes","Power at point of attack"],
  DT:  ["Pass rush moves","Leverage","Against double teams","Motor","Consistency","Initial quickness","Stamina","Counter moves","Getting off blocks","Size"],
  LB:  ["Coverage in space","Footwork in zone","Tackling technique","Blitz recognition","Getting off blocks","Pass rush","Consistency","Man coverage","Physical limitations","Block shedding"],
  CB:  ["Coverage in zone","Tackling","Physical press coverage","Recovery speed","Ball awareness","Physicality","Coverage depth","Technique vs. physicality","Consistency","Size"],
  S:   ["Man coverage","Tackling in space","Technique","Reaction time","Physicality","Reading complex concepts","Communication","Physicality vs. WRs","Alignment","Speed"],
  K:   ["Short-range consistency","Performance in cold","Kickoff touchback rate"],
  P:   ["Field position consistency","Hang time in wind","Return coverage"],
};

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

    const projRound = gradeToRound(grade);
    const projPick = irng(1, 32);
    const dnp = Math.random() < 0.06; // 6% chance didn't participate in combine

    const numStrengths = irng(2, 4);
    const numWeaknesses = irng(1, 3);
    const strPool = STRENGTHS_BY_POS[pos] ?? ["Athletic ability","Motor","Work ethic"];
    const wkPool = WEAKNESSES_BY_POS[pos] ?? ["Inexperience","Technique","Consistency"];

    prospects.push({
      id: uid(),
      name: rn(),
      position: pos,
      college: pick(COLLEGES),
      overallGrade: grade,
      potential: Math.min(99, grade + irng(0, 15)),
      projectedRound: projRound,
      projectedPick: projPick,
      grade: gradeLabel(projRound),
      archetype: pick(ARCHETYPES[pos] ?? ["Prospect"]),
      developmentTrait: genProspectDevTrait(grade),
      combine: generateCombine(pos, grade, dnp),
      collegeStats: generateCollegeStats(pos, grade),
      accolades: genAccolades(pos, grade),
      strengths: picks(strPool, numStrengths),
      weaknesses: picks(wkPool, numWeaknesses),
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
