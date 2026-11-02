const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8766);
const HOST = process.env.HOST || '127.0.0.1';
const DATA_FILE = path.join(ROOT, 'daily-config.json');
const SOCIAL_FILE = path.join(ROOT, 'social-data.json');
const SECRET_FILE = path.join(ROOT, '.mm_admin_password');
const sessions = new Set();
const subscribers = new Map();
const multiplayerRooms = new Map();

const DEFAULT_CHALLENGES = [
  { kind: 'starts', value: 's' }, { kind: 'startsEnds', value: 'c', extra: 't' },
  { kind: 'exact', value: '5' }, { kind: 'includes', value: 'art' },
  { kind: 'category', value: 'color' }, { kind: 'starts', value: 'p' },
  { kind: 'min', value: '6' }, { kind: 'category', value: 'fruit' },
  { kind: 'includes', value: 'eon' }, { kind: 'category', value: 'vegetable' }
];
const CATEGORY_DATA = {
  color: { label: 'Color / colour', words: 'red blue green yellow orange purple pink brown black white gray grey violet indigo beige gold silver teal maroon cyan magenta turquoise lavender lilac mauve fuchsia burgundy scarlet crimson ruby coral salmon peach apricot amber ochre mustard chartreuse olive lime mint sage emerald jade forest cobalt navy azure cerulean periwinkle aquamarine seafoam tan khaki cream ivory charcoal slate indigo plum orchid rose wine brick rust copper bronze pewter pearl onyx ebony sienna umber sepia vermilion'.split(' ') },
  fruit: { label: 'Fruit', words: 'apple banana orange grape mango peach pear plum lemon lime cherry melon kiwi papaya guava fig date apricot avocado blueberry blackberry raspberry strawberry cranberry currant coconut grapefruit tangerine mandarin clementine nectarine pomegranate pineapple watermelon cantaloupe honeydew persimmon quince kumquat lychee longan rambutan jackfruit durian starfruit dragonfruit passionfruit pomelo plantain mulberry gooseberry elderberry boysenberry cloudberry pawpaw sapodilla tamarind yuzu citron loquat medlar olive raisin'.split(' ') },
  vegetable: { label: 'Vegetable', words: 'carrot potato tomato onion garlic lettuce spinach cabbage broccoli pepper bean pea corn cucumber celery beet pumpkin squash zucchini aubergine eggplant okra radish turnip parsnip yam cassava sweetpotato asparagus artichoke arugula rocket kale chard collard leek scallion shallot cauliflower brusselsprout mushroom ginger fennel endive chicory rutabaga kohlrabi daikon horseradish watercress parsley cilantro basil mint dill chive'.split(' ') },
  animal: { label: 'Animal', words: 'cat dog horse tiger lion bear rabbit mouse dolphin whale eagle owl fox deer sheep goat chicken duck cow pig donkey camel elephant giraffe zebra monkey gorilla panda koala kangaroo otter beaver wolf leopard cheetah jaguar hyena raccoon skunk squirrel hedgehog badger moose elk bison buffalo yak llama alpaca seal walrus penguin crocodile alligator snake lizard turtle frog toad salamander shark salmon trout octopus squid crab lobster shrimp ant bee butterfly beetle spider scorpion snail slug worm bat rat hamster guineaferret ferret'.split(' ') },
  bird: { label: 'Bird', words: 'eagle owl sparrow robin crow raven pigeon dove parrot peacock penguin flamingo swan goose duck chicken turkey ostrich emu kiwi hawk falcon vulture pelican seagull albatross woodpecker hummingbird kingfisher bluejay cardinal canary finch lark magpie jay heron stork crane ibis puffin quail pheasant grouse rooster hen chick parakeet cockatoo macaw toucan cuckoo nightingale blackbird starling swallow swift tern osprey'.split(' ') },
  country: { label: 'Country', words: 'afghanistan albania algeria andorra angola argentina armenia australia austria azerbaijan bahamas bahrain bangladesh barbados belarus belgium belize benin bhutan bolivia botswana brazil brunei bulgaria burundi cambodia cameroon canada chad chile china colombia comoros congo croatia cuba cyprus denmark djibouti dominica ecuador egypt eritrea estonia eswatini ethiopia fiji finland france gabon gambia georgia germany ghana greece grenada guatemala guinea guyana haiti honduras hungary iceland india indonesia iran iraq ireland israel italy jamaica japan jordan kazakhstan kenya kiribati kosovo kuwait kyrgyzstan laos latvia lebanon lesotho liberia libya liechtenstein lithuania luxembourg madagascar malawi malaysia maldives mali malta mauritania mauritius mexico micronesia moldova monaco mongolia montenegro morocco mozambique myanmar namibia nauru nepal netherlands nicaragua niger nigeria norway oman pakistan palau palestine panama paraguay peru philippines poland portugal qatar romania russia rwanda samoa senegal serbia seychelles singapore slovakia slovenia somalia spain sudan suriname sweden switzerland syria taiwan tajikistan tanzania thailand togo tonga tunisia turkey turkmenistan tuvalu uganda ukraine uruguay uzbekistan vanuatu vatican venezuela vietnam yemen zambia zimbabwe'.split(' ') },
  flower: { label: 'Flower', words: 'rose tulip daisy lily orchid violet pansy peony iris poppy marigold sunflower dahlia lavender jasmine hibiscus carnation chrysanthemum hydrangea magnolia azalea begonia camellia clover cosmos crocus daffodil foxglove freesia gardenia geranium gladiolus honeysuckle hyacinth lilac lotus narcissus nasturtium petunia phlox primrose snapdragon snowdrop zinnia anemone bluebell buttercup calendula foxglove hollyhock periwinkle verbena wisteria'.split(' ') },
  sport: { label: 'Sport', words: 'football soccer cricket tennis badminton basketball baseball volleyball hockey rugby golf boxing wrestling swimming running cycling rowing skiing skating surfing gymnastics archery athletics bowling chess fencing handball karate kayaking lacrosse parkour polo sailing skating snowboarding softball squash taekwondo triathlon weightlifting wrestling yoga'.split(' ') },
  instrument: { label: 'Musical instrument', words: 'piano guitar violin viola cello harp flute clarinet oboe bassoon trumpet trombone tuba saxophone drums cymbal xylophone marimba ukulele banjo mandolin accordion harmonica tambourine triangle recorder bagpipe sitar tabla drum bass keyboard organ lyre lute zither'.split(' ') },
  food: { label: 'Food', words: 'bread rice pasta pizza burger sandwich salad soup curry sushi taco burrito pancake waffle omelet cheese yogurt cereal noodle dumpling biscuit cookie cake pie brownie muffin pudding chocolate popcorn porridge toast sausage bacon tofu kebab falafel hummus steak roast stew ramen couscous quinoa lentil bean nacho pretzel cracker brownie'.split(' ') },
  drink: { label: 'Drink', words: 'water tea coffee juice milk lemonade smoothie soda cocoa espresso latte cappuccino mocha cider kombucha kefir lassi sherbet punch broth cola tonic seltzer'.split(' ') },
  kitchen: { label: 'Kitchen item', words: 'spoon fork knife plate bowl cup pan pot oven kettle toaster ladle mug whisk spatula colander grater peeler tongs tray blender mixer pitcher jar bottle can opener corkscrew rollingpin saucepan skillet wok steamer strainer apron napkin placemat'.split(' ') },
  bodypart: { label: 'Body part', words: 'head face eye ear nose mouth lip tooth tongue chin cheek neck shoulder arm elbow wrist hand finger thumb chest back waist hip leg knee ankle foot toe heel brain heart lung liver kidney stomach skin bone muscle hair nail palm forehead eyebrow eyelash throat'.split(' ') },
  clothing: { label: 'Clothing', words: 'shirt blouse jacket coat sweater hoodie dress skirt pants trousers jeans shorts sock shoe boot sandal slipper hat cap scarf glove mitten belt tie suit uniform vest cardigan pajamas robe gown cloak'.split(' ') },
  tree: { label: 'Tree', words: 'oak pine maple birch cedar willow ash elm fir spruce apple cherry peach pear palm teak beech alder poplar sycamore walnut chestnut magnolia cypress redwood sequoia baobab acacia bamboo banyan eucalyptus hemlock larch olive orange pecan'.split(' ') },
  job: { label: 'Profession', words: 'doctor nurse teacher lawyer engineer pilot chef baker farmer artist actor singer dancer writer editor designer architect plumber electrician carpenter mechanic scientist dentist pharmacist journalist photographer librarian therapist coach accountant firefighter police officer'.split(' ').filter(w => !w.includes(' ')) },
  school: { label: 'School item', words: 'book pencil pen eraser ruler notebook paper folder backpack desk chalk crayon marker glue scissors calculator compass textbook atlas dictionary sharpener stapler board globe tablet laptop'.split(' ') },
  transport: { label: 'Mode of transport', words: 'car bus train bicycle bike scooter motorcycle airplane plane helicopter boat ship ferry subway tram taxi truck van tractor rickshaw canoe kayak sailboat skateboard sled wagon'.split(' ') },
  weather: { label: 'Weather word', words: 'rain snow hail sleet sunshine wind breeze storm thunder lightning cloud fog mist frost ice heat cold drizzle downpour blizzard hurricane tornado cyclone rainbow'.split(' ') },
  shape: { label: 'Shape', words: 'circle square triangle rectangle oval diamond star heart crescent cube sphere cone cylinder pyramid hexagon pentagon octagon spiral line arc'.split(' ') },
  emotion: { label: 'Emotion', words: 'happy sad angry afraid scared excited joyful calm proud shame love hate envy worry hope surprise disgust delight grief trust courage'.split(' ') }
};

function getPassword() {
  if (process.env.MM_ADMIN_PASSWORD) return process.env.MM_ADMIN_PASSWORD;
  try { return fs.readFileSync(SECRET_FILE, 'utf8').trim(); }
  catch { const password = crypto.randomBytes(12).toString('base64url'); fs.writeFileSync(SECRET_FILE, password, { flag: 'wx' }); return password; }
}
const ADMIN_PASSWORD = getPassword();
function dayValues(date) {
  let seed = 0;
  for (const c of date) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: 26 }, () => { seed = (seed * 1664525 + 1013904223) >>> 0; return 1 + seed % 9; });
}
function readData() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; } }
function validDate(date) { return /^\d{4}-\d{2}-\d{2}$/.test(date || ''); }
function defaultConfig(date) { return { date, challenges: DEFAULT_CHALLENGES, letterValues: dayValues(date), updatedAt: null, isDefault: true }; }
function getConfig(date) { const all = readData(); return all[date] || defaultConfig(date); }
function readSocial() {
  try { const data=JSON.parse(fs.readFileSync(SOCIAL_FILE,'utf8')); return {players:{},leaderboards:{},...data}; }
  catch { return {players:{},leaderboards:{}}; }
}
function writeSocial(data) {
  const temp=SOCIAL_FILE+'.tmp'; fs.writeFileSync(temp,JSON.stringify(data)); fs.renameSync(temp,SOCIAL_FILE);
}
function indiaToday() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
function dailyChallengeMatches(word,ch) {
  if(ch.kind==='starts') return word.startsWith(String(ch.value||'').toLowerCase());
  if(ch.kind==='startsEnds') return word.startsWith(String(ch.value||'').toLowerCase())&&word.endsWith(String(ch.extra||'').toLowerCase());
  if(ch.kind==='exact') return word.length===Number(ch.value);
  if(ch.kind==='min') return word.length>=Number(ch.value);
  if(ch.kind==='includes') return [...new Set(String(ch.value||'').toLowerCase().replace(/[^a-z]/g,''))].every(c=>word.includes(c));
  if(ch.kind==='category') { const key=ch.value==='colour'?'color':ch.value; return (CATEGORY_DATA[key]?.words||[]).includes(word); }
  return false;
}
const offlineWords = (() => { try { const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8'),m=html.match(/<script id="word-data" type="text\/plain">([\s\S]*?)<\/script>/); return new Set(m?m[1].trim().split(/\s+/):[]); } catch { return new Set(); } })();
async function validEnglishWord(word) {
  if(offlineWords.has(word)) return true;
  try { const response=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,{signal:AbortSignal.timeout(4000)}); if(!response.ok) return false; const data=await response.json(); return Array.isArray(data)&&data.some(x=>Array.isArray(x.meanings)&&x.meanings.some(m=>Array.isArray(m.definitions)&&m.definitions.length)); }
  catch { return false; }
}
function rankRows(rows) { rows.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)); let last=null,place=0; return rows.map((x,i)=>{if(last===null||x.score<last)place=i+1;last=x.score;return{...x,place}}); }
function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'content-type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(data);
}
function readBody(req, limit = 100_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > limit) { reject(new Error('Request too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
function authorized(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)mm_session=([a-f0-9]+)/);
  return Boolean(match && sessions.has(match[1]));
}
function emit(date, config) {
  for (const client of subscribers.get(date) || []) client.write(`data: ${JSON.stringify(config)}\n\n`);
}
function staticPage(res, filename) {
  fs.readFile(path.join(ROOT, filename), (err, bytes) => {
    if (err) return send(res, 404, 'Not found');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(bytes);
  });
}

const MP_STARTS = ['a','b','c','d','f','g','h','l','m','p','r','s','t','w'];
const MP_START_ENDS = [['b','d'],['c','t'],['f','t'],['h','e'],['m','t'],['p','e'],['s','t'],['t','e']];
const MP_INCLUDES = ['ar','st','in','er','an','on','at','re','ing','est'];
function randomChallenge() {
  const kind = ['starts','startsEnds','exact','min','includes','category'][Math.floor(Math.random()*6)];
  if (kind === 'starts') return {kind,value:MP_STARTS[Math.floor(Math.random()*MP_STARTS.length)]};
  if (kind === 'startsEnds') { const pair=MP_START_ENDS[Math.floor(Math.random()*MP_START_ENDS.length)]; return {kind,value:pair[0],extra:pair[1]}; }
  if (kind === 'exact') return {kind,value:String([4,5,6,7][Math.floor(Math.random()*4)])};
  if (kind === 'min') return {kind,value:String([5,6,7][Math.floor(Math.random()*3)])};
  if (kind === 'includes') return {kind,value:MP_INCLUDES[Math.floor(Math.random()*MP_INCLUDES.length)]};
  const categories=['color','fruit','vegetable','animal','bird','country','flower','sport','instrument','food','drink','kitchen','bodypart','clothing','tree','school','transport','weather','shape','emotion'];
  return {kind:'category',value:categories[Math.floor(Math.random()*categories.length)]};
}
function mpMatches(word,ch) {
  if(ch.kind==='starts') return word.startsWith(ch.value);
  if(ch.kind==='startsEnds') return word.startsWith(ch.value)&&word.endsWith(ch.extra);
  if(ch.kind==='exact') return word.length===Number(ch.value);
  if(ch.kind==='min') return word.length>=Number(ch.value);
  if(ch.kind==='includes') return [...new Set(ch.value)].every(c=>word.includes(c));
  if(ch.kind==='category') return (CATEGORY_DATA[ch.value]?.words||[]).includes(word);
  return false;
}
function mpSnapshot(room, playerId) {
  const answerRows=room.answers.map((row,i)=>({round:i+1,answers:room.status==='complete'||i<room.round?Object.entries(row).map(([id,a])=>({name:room.players.find(p=>p.id===id)?.name||'Player',word:a.word,points:a.points})):[]}));
  return {code:room.code,date:room.date,mode:room.mode,maxPlayers:room.maxPlayers,status:room.status,round:room.round+1,roundCount:5,challenges:room.challenges,key:room.key,players:room.players.map(p=>({id:p.id===playerId?p.id:undefined,name:p.name,team:p.team,score:p.score,submitted:Boolean(room.answers[room.round]?.[p.id])})),answers:answerRows,playerId};
}
function cleanName(value){return String(value||'').trim().replace(/[<>]/g,'').slice(0,24)||'Player';}
async function readJson(req){try{return await readBody(req)}catch{return {}}}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/play' || url.pathname === '/index.html')) return staticPage(res, 'index.html');
  if (req.method === 'GET' && (url.pathname === '/controller' || url.pathname === '/controller.html')) return staticPage(res, 'controller.html');

  if (req.method === 'GET' && url.pathname === '/api/daily') {
    const date = url.searchParams.get('date');
    if (!validDate(date)) return send(res, 400, { error: 'Use a YYYY-MM-DD date.' });
    return send(res, 200, getConfig(date));
  }
  if (req.method === 'GET' && url.pathname === '/api/session') return send(res, 200, { authenticated: authorized(req) });
  if (req.method === 'GET' && url.pathname === '/api/categories') return send(res, 200, CATEGORY_DATA);
  if (req.method === 'POST' && url.pathname === '/api/player/register') {
    const body=await readJson(req),playerId=String(body.playerId||'').slice(0,80),displayName=cleanName(body.name);
    if(!/^[a-zA-Z0-9_-]{8,80}$/.test(playerId)) return send(res,400,{error:'Player ID is invalid.'});
    const data=readSocial(); data.players[playerId]={id:playerId,displayName,updatedAt:new Date().toISOString()}; writeSocial(data);
    return send(res,200,{playerId,displayName});
  }
  if (req.method === 'POST' && url.pathname === '/api/daily-score') {
    const body=await readJson(req),date=String(body.date||''),playerId=String(body.playerId||''),answers=body.answers;
    if(date!==indiaToday()) return send(res,400,{error:'Scores can only be submitted for today’s IST run.'});
    if(!/^[a-zA-Z0-9_-]{8,80}$/.test(playerId)||!Array.isArray(answers)||answers.length!==10) return send(res,400,{error:'A complete ten-word run is required.'});
    const data=readSocial(),player=data.players[playerId]; if(!player) return send(res,404,{error:'Player profile was not found. Please reload and enter your name again.'});
    const config=getConfig(date); let score=0;
    for(let i=0;i<10;i++) {
      const answer=answers[i]||{},word=String(answer.word||'').trim().toLowerCase();
      if(!word) { if(answer.status!=='Timed out') return send(res,400,{error:`Challenge ${i+1} is missing an answer.`}); continue; }
      if(!/^[a-z]{1,60}$/.test(word)||!dailyChallengeMatches(word,config.challenges[i])||!await validEnglishWord(word)) return send(res,400,{error:`Challenge ${i+1} could not be verified.`});
      const ids=word.length%2?[Math.floor(word.length/2)]:[word.length/2-1,word.length/2];
      const points=ids.reduce((sum,j)=>sum+config.letterValues[word.charCodeAt(j)-97],0)/ids.length; score+=points;
    }
    score=Number(score.toFixed(1)); if(Math.abs(score-Number(body.score))>0.05) return send(res,400,{error:'The submitted total did not match the verified words.'});
    const board=data.leaderboards[date]||(data.leaderboards[date]={}),old=board[playerId];
    board[playerId]={playerId,name:player.displayName,score:Math.max(old?.score||0,score),attempts:(old?.attempts||0)+1,lastPlayed:new Date().toISOString()};
    writeSocial(data);
    const entries=rankRows(Object.values(board).map(row=>({playerId:row.playerId,name:row.name,score:row.score,attempts:row.attempts}))),mine=entries.find(x=>x.playerId===playerId);
    return send(res,200,{score,best:mine.score,place:mine.place,entries:entries.slice(0,20).map(({playerId:id,...row})=>({...row,isYou:id===playerId}))});
  }
  if (req.method === 'GET' && url.pathname === '/api/leaderboard') {
    const date=String(url.searchParams.get('date')||''); if(!validDate(date)) return send(res,400,{error:'Use a YYYY-MM-DD date.'});
    const playerId=String(url.searchParams.get('playerId')||''),data=readSocial(),entries=rankRows(Object.values(data.leaderboards[date]||{}).map(row=>({playerId:row.playerId,name:row.name,score:row.score,attempts:row.attempts})));
    return send(res,200,{date,entries:entries.slice(0,50).map(({playerId:id,...row})=>({...row,isYou:Boolean(playerId&&id===playerId)}))});
  }
  if (req.method === 'POST' && url.pathname === '/api/mp/create') {
    const body=await readJson(req),date=String(body.date||''),mode=['duel','teams','ffa'].includes(body.mode)?body.mode:'duel';
    if(!validDate(date)) return send(res,400,{error:'Use a YYYY-MM-DD date.'});
    const maxPlayers=mode==='duel'?2:mode==='teams'?4:Math.max(2,Math.min(5,Number(body.maxPlayers)||5));
    let code; do { code=crypto.randomBytes(3).toString('hex').toUpperCase(); } while(multiplayerRooms.has(code));
    const playerId=crypto.randomBytes(12).toString('hex'),config=getConfig(date);
    const room={code,date,mode,maxPlayers,key:config.letterValues,players:[{id:playerId,name:cleanName(body.name),team:mode==='teams'?1:null,score:0}],challenges:Array.from({length:5},randomChallenge),answers:Array.from({length:5},()=>({})),round:0,status:'lobby',createdAt:Date.now()};
    multiplayerRooms.set(code,room); return send(res,200,mpSnapshot(room,playerId));
  }
  if (req.method === 'POST' && url.pathname === '/api/mp/join') {
    const body=await readJson(req),room=multiplayerRooms.get(String(body.code||'').toUpperCase());
    if(!room) return send(res,404,{error:'Room code not found. Check it and try again.'});
    if(room.status!=='lobby') return send(res,409,{error:'This room has already started.'});
    if(room.players.length>=room.maxPlayers) return send(res,409,{error:'This room is full.'});
    const playerId=crypto.randomBytes(12).toString('hex'),team=room.mode==='teams'?(room.players.length%2)+1:null;
    room.players.push({id:playerId,name:cleanName(body.name),team,score:0});
    if(room.players.length===room.maxPlayers) room.status='playing';
    return send(res,200,mpSnapshot(room,playerId));
  }
  if (req.method === 'GET' && url.pathname === '/api/mp/state') {
    const room=multiplayerRooms.get(String(url.searchParams.get('code')||'').toUpperCase()),playerId=String(url.searchParams.get('playerId')||'');
    if(!room||!room.players.some(p=>p.id===playerId)) return send(res,404,{error:'Room session not found.'});
    return send(res,200,mpSnapshot(room,playerId));
  }
  if (req.method === 'POST' && url.pathname === '/api/mp/submit') {
    const body=await readJson(req),room=multiplayerRooms.get(String(body.code||'').toUpperCase()),player=room?.players.find(p=>p.id===String(body.playerId||''));
    if(!room||!player) return send(res,404,{error:'Room session not found.'});
    if(room.status!=='playing'||Number(body.round)!==room.round+1) return send(res,409,{error:'This round is no longer accepting answers.'});
    if(room.answers[room.round][player.id]) return send(res,409,{error:'Your answer for this round is already in.'});
    const word=String(body.word||'').trim().toLowerCase(),challenge=room.challenges[room.round];
    if(!/^[a-z]{2,60}$/.test(word)||!mpMatches(word,challenge)) return send(res,400,{error:'That word does not fit this challenge.'});
    const middle=word.length%2?[Math.floor(word.length/2)]:[word.length/2-1,word.length/2];
    const points=middle.reduce((sum,i)=>sum+room.key[word.charCodeAt(i)-97],0)/middle.length;
    room.answers[room.round][player.id]={word,points:Number(points.toFixed(1))}; player.score=Number((player.score+points).toFixed(1));
    if(room.players.every(p=>room.answers[room.round][p.id])) {
      if(room.round===4) room.status='complete'; else room.round++;
    }
    return send(res,200,mpSnapshot(room,player.id));
  }
  if (req.method === 'POST' && url.pathname === '/api/login') {
    try {
      const body = await readBody(req);
      const supplied = String(body.password || '');
      const a = Buffer.from(supplied); const b = Buffer.from(ADMIN_PASSWORD);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return send(res, 401, { error: 'Password not accepted.' });
      const token = crypto.randomBytes(24).toString('hex'); sessions.add(token);
      return send(res, 200, { authenticated: true }, { 'set-cookie': `mm_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200` });
    } catch (e) { return send(res, 400, { error: e.message }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/logout') {
    const match = (req.headers.cookie || '').match(/(?:^|;\s*)mm_session=([a-f0-9]+)/);
    if (match) sessions.delete(match[1]);
    return send(res, 200, { authenticated: false }, { 'set-cookie': 'mm_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }
  if (req.method === 'GET' && url.pathname === '/api/updates') {
    const date = url.searchParams.get('date');
    if (!validDate(date)) return send(res, 400, { error: 'Use a YYYY-MM-DD date.' });
    res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write(`data: ${JSON.stringify(getConfig(date))}\n\n`);
    if (!subscribers.has(date)) subscribers.set(date, new Set());
    subscribers.get(date).add(res);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(heartbeat); subscribers.get(date)?.delete(res); });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/daily') {
    if (!authorized(req)) return send(res, 401, { error: 'Controller login required.' });
    try {
      const body = await readBody(req);
      const { date, challenges, letterValues } = body;
      if (!validDate(date)) return send(res, 400, { error: 'Use a YYYY-MM-DD date.' });
      if (!Array.isArray(challenges) || challenges.length !== 10) return send(res, 400, { error: 'Provide exactly ten challenges.' });
      if (!Array.isArray(letterValues) || letterValues.length !== 26 || letterValues.some(v => !Number.isInteger(v) || v < 1 || v > 9)) return send(res, 400, { error: 'Provide 26 letter values from 1 to 9.' });
      const allowed = new Set(['starts', 'startsEnds', 'exact', 'min', 'includes', 'category']);
      if (challenges.some(ch => !allowed.has(ch.kind) || !String(ch.value || '').trim() || (ch.kind === 'category' && !CATEGORY_DATA[ch.value]))) return send(res, 400, { error: 'Choose a preloaded category and complete each challenge.' });
      const all = readData();
      const config = { date, challenges, letterValues, updatedAt: new Date().toISOString(), isDefault: false };
      all[date] = config;
      const temp = DATA_FILE + '.tmp';
      fs.writeFileSync(temp, JSON.stringify(all, null, 2)); fs.renameSync(temp, DATA_FILE);
      emit(date, config);
      return send(res, 200, { saved: true, config });
    } catch (e) { return send(res, 400, { error: e.message }); }
  }
  send(res, 404, 'Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`Middle Management public site: http://127.0.0.1:${PORT}/`);
  console.log(`Middle Management controller: http://127.0.0.1:${PORT}/controller`);
  console.log(`Controller password stored in ${SECRET_FILE}`);
  console.log(`Listening on ${HOST}. Configure a public host and persistent storage before deployment.`);
});
