
const $=id=>document.getElementById(id);let events=[];try{events=JSON.parse(localStorage.getItem('thhg-events')||'[]')}catch{};
let currentInnings=Number(localStorage.getItem('thhg-current-innings')||1);if(currentInnings!==2)currentInnings=1;
let firstSide=localStorage.getItem('thhg-first-side')||'THHG batting';
function sideFor(n){return n===1?firstSide:(firstSide==='THHG batting'?'THHG bowling':'THHG batting')}
$('inningsSide').value=sideFor(currentInnings);
function currentEvents(){return events.filter(e=>(e.inningsNumber||1)===currentInnings)}
function add(e){if(!requireOrder())return;if(stats().legal>=number('limit')*6){alert('All 12 overs are complete. Select the other team from the dropdown above, or undo a delivery.');return}e.story=Array.from(document.querySelectorAll('input[name="storyChoice"]:checked')).map(x=>x.value).join(' | ');e.note=$('storyNote').value.trim();document.querySelectorAll('input[name="storyChoice"]:checked').forEach(x=>x.checked=false);$('storyNote').value='';e.batter=$('striker').value;e.bowler=$('inningsSide').value==='THHG batting'?(selectedOppositionBowler()||'Opposition bowler'):$('bowler').value;e.innings=$('inningsSide').value;e.inningsNumber=currentInnings;e.timestamp=new Date().toISOString();e.pairNames=$('inningsSide').value==='THHG batting'?[...matchOrder.pairs[Math.min(2,Math.floor(stats().legal/24))]]:oppositionPair(Math.floor(stats().legal/6));if($('inningsSide').value==='THHG batting'){rememberOppositionBowler();saveOppositionBowlerSelection();}events.push(e);
// An odd number of completed runs changes ends. A new over also changes strike.
// Only completed running runs cause an automatic swap; no-balls/wides don't.
e.strikeSwap=ScoringRules.changesEnds(e);
let before=stats().legal-(e.legal||0),after=stats().legal;
let oldOver=Math.floor(before/6),newOver=Math.floor(after/6);
if(oldOver===newOver&&e.strikeSwap){let sel=$('striker');sel.selectedIndex=sel.selectedIndex===0?1:0;}
save()}function save(){localStorage.setItem('thhg-events',JSON.stringify(events));render()}const LEAGUE_RULES=Object.freeze({start:200,limit:12,penalty:5,wideValue:2,nbValue:2});function number(id){return Object.prototype.hasOwnProperty.call(LEAGUE_RULES,id)?LEAGUE_RULES[id]:Number($(id).value)||0}function dot(){add({type:'dot',runs:0,legal:1,label:'Dot ball'})}function bat(n){add({type:'bat',runs:n,legal:1,label:n===0?'Dot ball':n+' off bat'})}function extra(type){let names={wide:'Wide',noball:'No-ball',bye:'Bye',legbye:'Leg bye'};let completed=0,batRuns=0,val;if(type==='wide'||type==='noball'){completed=Number($('completedRuns').value)||0;batRuns=type==='noball'?(Number($('noBallBatRuns').value)||0):0;val=number(type==='wide'?'wideValue':'nbValue')+2*completed+batRuns;}else{val=Number(prompt('How many '+names[type].toLowerCase()+' runs?',1));}if(!Number.isFinite(val)||!Number.isInteger(val)||val<0)return;let counted=stats().legal;let advances=ScoringRules.countsAsBall(type,counted,number('limit'));add({type,runs:val,...((type==='wide'||type==='noball')?{completedRuns:completed,batRuns}:{}),legal:advances?1:0,label:names[type]+' +'+val+(completed?' ('+completed+' completed run'+(completed===1?'':'s')+')':'')+(batRuns?' ('+batRuns+' off bat)':'')});if(type==='wide'||type==='noball'){$('completedRuns').value='0';$('noBallBatRuns').value='0';}}function wicket(method){let runs=Number($('wicketRuns').value)||0;let batter=$('striker').value;add({type:'wicket',runs,legal:1,wicket:1,outBatter:batter,dismissal:method,label:(runs?runs+' off bat + ':'')+method+' ('+batter+')'});$('wicketRuns').value='0'}function custom(){let r=Number(prompt('Total extra runs to add (e.g. overthrow)',1));if(!Number.isFinite(r)||!Number.isInteger(r)||r<0)return;let legal=confirm('Is this a NEW delivery? OK = yes, Cancel = score correction/extra on a previous ball.');add({type:'custom',runs:r,legal:legal?1:0,label:'Custom +'+r})}function undo(){let idx=events.findLastIndex(e=>(e.inningsNumber||1)===currentInnings);if(idx>=0){events.splice(idx,1);lastLineupKey='';save()}}function stats(){return ScoringRules.totals(currentEvents())}function escapeHtml(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function render(){let s=stats();renderLiveStats();updateLineup(s.legal);$('runs').textContent=s.runs;$('wickets').textContent=s.wickets;$('net').textContent=number('start')+s.runs-s.wickets*number('penalty');let caption=document.querySelector('.scoreboard-caption');if(caption)caption.textContent=s.legal>=number('limit')*6?'INNINGS COMPLETE':'LIVE INNINGS';$('overs').textContent=s.legal>=number('limit')*6?number('limit')+' overs complete':(s.legal>0&&s.legal%6===0?'Over '+Math.floor(s.legal/6)+' complete · Next: Over '+(Math.floor(s.legal/6)+1)+' · Ball 1 of 6':'Over '+(Math.floor(s.legal/6)+1)+' · Ball '+(s.legal%6+1)+' of 6');let finalOver=s.legal>=Math.max(0,(number('limit')-1)*6)&&s.legal<number('limit')*6;$('finalOverIndicator').style.display=finalOver?'block':'none';if(finalOver){let done=s.legal%6;$('finalOverDots').innerHTML=Array.from({length:6},(_,i)=>'<span style="height:8px;flex:1;border-radius:6px;background:'+(i<done?'#25734b':'#dbe3dd')+'"></span>').join('')}$('overProgress').textContent=Math.min(Math.floor(s.legal/6),number('limit'))+' of '+number('limit')+' overs complete · '+Math.max(0,number('limit')*6-s.legal)+' counting balls remaining';$('wides').textContent=s.wides;$('noballs').textContent=s.noballs;let counted=0,dots=0,thisOver=0;for(const e of currentEvents()){if(e.legal&&e.runs===0&&['dot','bat','wicket'].includes(e.type))dots++;if(Math.floor(counted/6)===Math.floor(s.legal/6)&&s.legal<number('limit')*6)thisOver+=e.runs;counted+=e.legal||0}$('dots').textContent=dots;$('thisOver').textContent=thisOver;$('history').innerHTML=currentEvents().map((e,i,all)=>'<div class="history-entry"><div class="history-main"><strong class="history-meta">Ball '+(all.slice(0,i).reduce((n,x)=>n+(x.legal||0),0)%6+1)+' of over '+(Math.floor(all.slice(0,i).reduce((n,x)=>n+(x.legal||0),0)/6)+1)+' | '+escapeHtml(e.label)+'</strong>'+(e.timestamp?'<span class="history-time">'+eventTime(e).replace(/^ · /,'')+'</span>':'')+'</div><div class="history-people"><span><b>Batter:</b> '+escapeHtml(e.batter||'Unknown')+'</span><span><b>Bowler:</b> '+escapeHtml(e.bowler||'Unknown')+'</span></div>'+(e.story||e.note?'<div class="history-detail">'+(e.story?escapeHtml(e.story):'')+(e.story&&e.note?' · ':'')+(e.note?escapeHtml(e.note):'')+'</div>':'')+'</div>').reverse().join('')||'<span class="muted">No deliveries recorded yet</span>';renderScorecard();$('notice').textContent=s.legal>=number('limit')*6?'Overs limit reached — switch innings when ready.':'';}function showScreen(screen) {
  for (const name of ['scoring', 'live', 'players']) {
    $(name + 'Screen').style.display = name === screen ? 'block' : 'none';
    $(name + 'Tab').classList.toggle('active', name === screen);
    $(name + 'Tab').setAttribute('aria-pressed', String(name === screen));
  }
  window.scrollTo(0, 0);
}

function renderMatchOverview(){
 const opponent=($('opponentName').value||'Opposition').trim(),away=$('homeAway').value==='away';
 const home=away?opponent:'THHG',visitors=away?'THHG':opponent;
 const date=$('matchDate').value,venue=$('matchVenue').value;
 $('officialMatchDetails').innerHTML='<div class="sheet-match-details"><strong>'+escapeHtml(home)+' (Home) v '+escapeHtml(visitors)+' (Away)</strong><span>'+escapeHtml(date||'Date not set')+' · '+escapeHtml(venue||'Venue not set')+'</span><span>Innings: '+escapeHtml(sideFor(currentInnings)==='THHG batting'?'THHG':opponent)+'</span></div>';
 const first=inningsStats(1),second=inningsStats(2),hasSecond=events.some(e=>(e.inningsNumber||1)===2);
 let msg='Match in progress';
 if(first.legal>=72&&second.legal>=72){const a=200+first.runs-first.outs*5,b=200+second.runs-second.outs*5;msg=a===b?'Match tied':(a>b?(sideFor(1)==='THHG batting'?'THHG':opponent):(sideFor(2)==='THHG batting'?'THHG':opponent))+' won by '+Math.abs(a-b)+' net runs'}
 $('matchResultSummary').innerHTML='<div class="sheet-result"><strong>'+escapeHtml(msg)+'</strong><span>'+escapeHtml(sideFor(1)==='THHG batting'?'THHG':opponent)+': '+(200+first.runs-first.outs*5)+' net'+(hasSecond?' · '+escapeHtml(sideFor(2)==='THHG batting'?'THHG':opponent)+': '+(200+second.runs-second.outs*5)+' net':'')+'</span></div>';
}
function renderOfficialBowling(){
 const bowlers=new Map();
 for(const e of currentEvents()){
  const name=e.bowler||'Unknown bowler';if(!bowlers.has(name))bowlers.set(name,{balls:0,runs:0,wickets:0});
  const b=bowlers.get(name);b.balls+=e.legal||0;
  b.runs+=(e.type==='bye'||e.type==='legbye')?0:(e.runs||0);
  if(e.wicket&&!/run\s*out/i.test(e.dismissal||''))b.wickets++;
 }
 const rows=[...bowlers].map(([name,b])=>'<tr><td>'+escapeHtml(name)+'</td><td>'+Math.floor(b.balls/6)+'.'+b.balls%6+'</td><td>'+b.runs+'</td><td>'+b.wickets+'</td></tr>').join('');
 $('officialBowlingStats').innerHTML='<h3>Bowling figures</h3><div class="official-scroll"><table class="official-table"><thead><tr><th>Bowler</th><th>Overs</th><th>Runs</th><th>Wkts</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4">No deliveries yet</td></tr>')+'</tbody></table></div>';
}
function renderOfficialScorecard(){
 const es=currentEvents(), batters=new Map(), overs=Array.from({length:12},(_,i)=>({number:i+1,events:[],runs:0,wickets:0,bowlers:new Set(),net:200})); 
 const extras={wide:0,noball:0,bye:0,legbye:0};let counted=0,totalRuns=0,totalWickets=0;
 const batting=sideFor(currentInnings)==='THHG batting';
 const names=batting?matchOrder.pairs.flat():oppositionBatters();
 for(const name of names)if(name&&!batters.has(name))batters.set(name,{runs:0,wickets:0});
 for(const e of es){
  const overIndex=Math.min(11,Math.floor(counted/6)),o=overs[overIndex],name=e.batter||'Unknown batter';
  if(!batters.has(name))batters.set(name,{runs:0,wickets:0});
  const runs=e.type==='bat'||e.type==='wicket'?e.runs:e.type==='noball'?(e.batRuns||0):0;
  batters.get(name).runs+=runs;
  if(e.wicket){const out=e.outBatter||name;if(!batters.has(out))batters.set(out,{runs:0,wickets:0});batters.get(out).wickets++}
  if(Object.prototype.hasOwnProperty.call(extras,e.type))extras[e.type]+=e.runs||0;
  o.events.push(e);o.runs+=e.runs||0;o.wickets+=e.wicket?1:0;o.bowlers.add(e.bowler||'Unknown bowler');
  totalRuns+=e.runs||0;totalWickets+=e.wicket?1:0;counted+=e.legal||0;
 }
 let cumulative=200;
 for(const o of overs){cumulative+=o.runs-5*o.wickets;o.net=cumulative}
 const pill=e=>'<span class="sheet-ball '+(e.wicket?'sheet-wicket':e.type==='wide'||e.type==='noball'?'sheet-extra':'')+'">'+escapeHtml(e.wicket?'−5':e.type==='wide'?'Wd':e.type==='noball'?'NB':e.runs||0)+'</span>';
 let html='';
 for(let pair=0;pair<3;pair++){
  const pairNames=names.slice(pair*2,pair*2+2),section=overs.slice(pair*4,pair*4+4);
  html+='<section class="sheet-pair"><h3>Batting pair '+(pair+1)+' <small>Overs '+(pair*4+1)+'–'+(pair*4+4)+'</small></h3><div class="sheet-pair-names">'+pairNames.map(n=>'<div><strong>'+escapeHtml(n||'Batter')+'</strong><span>'+((batters.get(n)||{}).runs||0)+' runs · '+((batters.get(n)||{}).wickets||0)+' wickets lost</span></div>').join('')+'</div><div class="sheet-over-grid">';
  for(const o of section){
   html+='<div class="sheet-over"><div class="sheet-over-title">Over '+o.number+'</div><div class="sheet-over-bowler">'+escapeHtml([...o.bowlers].join(', ')||'Awaiting bowler')+'</div><div class="sheet-balls">'+o.events.map(pill).join('')+Array.from({length:Math.max(0,6-o.events.filter(e=>e.legal).length)},()=>'<span class="sheet-ball sheet-empty">·</span>').join('')+'</div><div class="sheet-over-figures">Runs '+o.runs+' · Wkts '+o.wickets+'</div><div class="sheet-over-net">Net '+o.net+'</div></div>';
  }
  html+='</div></section>';
 }
 const extraTotal=Object.values(extras).reduce((a,b)=>a+b,0);
 html+='<section class="sheet-summary"><h3>Extras summary</h3><div class="sheet-summary-grid">'+[['Wides',extras.wide],['No-balls',extras.noball],['Byes',extras.bye],['Leg-byes',extras.legbye],['Total extras',extraTotal]].map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('')+'</div><h3>Innings summary</h3><div class="sheet-summary-grid">'+[['Runs scored',totalRuns],['Wickets × 5',totalWickets*5],['Final net',200+totalRuns-totalWickets*5]].map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('')+'</div></section>';
 $('officialScorecard').innerHTML=html;
}
function renderLiveStats() {
  renderMatchOverview();
  renderOfficialScorecard();
  renderOfficialBowling();
  const es = currentEvents();
  const partnership = ScoringRules.partnerships(es, matchOrder.pairs, oppositionBatters(), sideFor(currentInnings) === 'THHG batting');
  const pairName = partnership.currentNames.filter(Boolean).join(' & ');
  const thisPairRuns = partnership.currentRuns;
  let over = [], dots = 0, batBalls = 0, rotations = 0;
  const inningsStart = number('start'), penalty = number('penalty');
  for (const event of es) {
    if (event.legal && ['dot', 'bat', 'wicket'].includes(event.type)) {
      if (event.runs === 0) dots++;
      batBalls++;
      if (event.runs % 2 === 1) rotations++;
    }
  }
  const legal = stats().legal, completed = legal >= number('limit') * 6;
// Keep the completed over visible until the first delivery of the next over is recorded.
let targetOver=legal>0&&legal%6===0?Math.floor(legal/6)-1:Math.floor(legal/6);
if(completed)targetOver=number('limit')-1;
let deliveryCount=0, lastOver=-1;
for(let e of es){let eventOver=Math.floor(deliveryCount/6);lastOver=eventOver;deliveryCount+=e.legal||0}
if(lastOver>=0)targetOver=Math.min(lastOver,number('limit')-1);
over=[];deliveryCount=0;
for(let e of es){if(Math.floor(deliveryCount/6)===targetOver)over.push(e);deliveryCount+=e.legal||0}
let chips=over.map(e=>{let kind=e.wicket?'wicket':(e.type==='wide'||e.type==='noball'?'extra':e.runs===0?'dot':'run');let val=e.wicket?'−5':e.type==='wide'?'Wd':e.type==='noball'?'NB':e.runs;return '<span class="over-ball '+kind+'" title="'+escapeHtml(e.label||'')+'">'+val+'</span>'}).join('');let slots=Math.max(0,6-over.filter(e=>e.legal).length);chips+=Array.from({length:slots},()=>'<span class="over-ball">·</span>').join('');$('currentOverGraphic').innerHTML=chips;$('liveOverBalls').innerHTML=chips;let other=events.filter(e=>(e.inningsNumber||1)!==currentInnings),otherCount=0,otherRuns=0,otherWickets=0;for(let e of other){if(otherCount>=legal)break;otherRuns+=e.runs;otherWickets+=e.wicket?1:0;otherCount+=e.legal||0}let compare=other.length&&otherCount>=legal?'Other innings at this stage: '+(inningsStart+otherRuns-otherWickets*penalty)+' net ('+((inningsStart+stats().runs-stats().wickets*penalty)-(inningsStart+otherRuns-otherWickets*penalty)>=0?'+':'')+((inningsStart+stats().runs-stats().wickets*penalty)-(inningsStart+otherRuns-otherWickets*penalty))+' difference)':'Score comparison available once the other innings reaches this stage';let tile=(name,value,wide=false)=>'<div class="stat-tile'+(wide?' wide':'')+'"><span>'+name+'</span><strong>'+value+'</strong></div>';$('liveStatGrid').innerHTML=tile('Current batting pair',escapeHtml(pairName||'Not started'),true)+tile('Current pair runs',thisPairRuns)+tile('Current pair dots',partnership.currentDots)+tile('Innings dot balls',dots)+tile('Dot ball %',legal?(100*dots/legal).toFixed(1)+'%':'0%')+tile('Strike rotation %',batBalls?(100*rotations/batBalls).toFixed(1)+'%':'0%')+tile('Average partnership',partnership.average.toFixed(1))+tile('Highest partnership',partnership.highest)+tile('Innings comparison',escapeHtml(compare),true)}
function eventDateTime(e){let d=new Date(e.timestamp);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'2-digit'})+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}function eventTime(e){if(!e.timestamp)return '';let d=new Date(e.timestamp);return Number.isNaN(d.getTime())?'':' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}function renderScorecard(){let es=currentEvents(),overs={},batters={},bowlers={};let counted=0;for(let e of es){let ov=Math.min(number('limit'),Math.floor(counted/6)+1);if(!overs[ov])overs[ov]={runs:0,wickets:0};overs[ov].runs+=e.runs;overs[ov].wickets+=e.wicket?1:0;let name=e.batter||'Unknown';if(!batters[name])batters[name]={runs:0,outs:0};if(e.type==='bat'||e.type==='wicket')batters[name].runs+=e.runs;if(e.wicket){let out=e.outBatter||name;if(!batters[out])batters[out]={runs:0,outs:0};batters[out].outs++}let bw=e.bowler||'Unknown';if(!bowlers[bw])bowlers[bw]={runs:0,wickets:0};if(e.type!=='bye'&&e.type!=='legbye')bowlers[bw].runs+=e.runs;bowlers[bw].wickets+=e.wicket?1:0;counted+=e.legal||0}let line=(a)=>a.map(x=>'<div>'+escapeHtml(x)+'</div>').join('');$('overTable').innerHTML=line(Object.entries(overs).map(([n,x])=>'Over '+n+': '+x.runs+' runs · '+x.wickets+' wickets'))||'No overs scored';$('batterTable').innerHTML=line(Object.entries(batters).map(([n,x])=>n+': '+x.runs+' runs · '+x.outs+' dismissals'))||'No batting data';$('bowlerTable').innerHTML=line(Object.entries(bowlers).map(([n,x])=>n+': '+x.runs+' runs conceded · '+x.wickets+' wickets'))||'No bowling data'}for(let id of ['matchDate','opponentName',...Array.from({length:6},(_,i)=>'oppBatter'+(i+1))]){let el=$(id);el.value=localStorage.getItem('thhg-'+id)||'';el.addEventListener('input',()=>{localStorage.setItem('thhg-'+id,el.value);if(id.startsWith('oppBatter')){let old=$('striker').selectedIndex;lastLineupKey='';updateLineup(stats().legal);$('striker').selectedIndex=old}})}function inningsStats(n){return events.filter(e=>(e.inningsNumber||1)===n).reduce((a,e)=>{a.runs+=e.runs;a.legal+=e.legal;a.outs+=e.wicket?1:0;return a},{runs:0,legal:0,outs:0})}
function summary(){return [1,2].filter(n=>n===1||currentInnings===2).map(n=>{let a=inningsStats(n);return `${sideFor(n)==='THHG batting'?'THHG':'Opposition'}: ${a.runs}/${a.outs} (${Math.floor(a.legal/6)}.${a.legal%6} overs), net ${number('start')+a.runs-a.outs*number('penalty')}`}).join(' | ')}async function share(){try{await navigator.clipboard.writeText(summary());alert('Summary copied!')}catch{prompt('Copy this summary:',summary())}}function csv(x){return '"'+String(x??'').replace(/"/g,'""')+'"'}function exportCsv(){let rows=['event,innings_number,innings,batter,bowler,type,runs,legal_ball,wicket,story,note,out_batter,dismissal,match_date,opposition,venue,timestamp',...events.map((e,i)=>[i+1,e.inningsNumber||1,e.innings||'',e.batter||'',e.bowler||'',e.type,e.runs,e.legal,e.wicket||0,e.story||'',e.note||'',e.outBatter||'',e.dismissal||'',$('matchDate').value,$('opponentName').value,$('matchVenue').value,e.timestamp||''].map(csv).join(','))];let blob=new Blob([rows.join('\n')],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='thhg-match.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}async function copyBallHistory(){let es=currentEvents(),counted=0;let lines=es.map(e=>{let line='Ball '+(counted%6+1)+' of over '+(Math.floor(counted/6)+1)+' | '+e.label+(e.timestamp?eventTime(e).replace(/^ · /,' | '):'')+'\\nBatter: '+(e.batter||'Unknown')+' | Bowler: '+(e.bowler||'Unknown')+(e.story||e.note?'\\n'+[e.story,e.note].filter(Boolean).join(' | '):'');counted+=e.legal||0;return line;}).reverse();let output=(($('opponentName').value||'Match')+' — '+$('inningsSide').value+'\\n\\n'+(lines.length?lines.join('\\n\\n'):'No deliveries recorded yet')).replace(/\\n/g,'\n');try{await navigator.clipboard.writeText(output)}catch{prompt('Copy ball-by-ball history:',output)}}
function resetTestData(){if(confirm("Clear ALL recorded scores and return to the start? This cannot be undone.")){events=[];localStorage.removeItem("thhg-events");currentInnings=1;firstSide="THHG batting";localStorage.removeItem("thhg-current-innings");localStorage.removeItem("thhg-first-side");$("inningsSide").value=firstSide;lastLineupKey="";render()}}
function oppositionBatters(){return [1,2,3,4,5,6].map(i=>($('oppBatter'+i)?.value||'').trim()||'Opposition batter '+i)}
function oppositionPair(over){let start=Math.min(2,Math.floor(over/4))*2;return oppositionBatters().slice(start,start+2)}
const ORDER_KEY='thhg-match-order-v1';
const EMPTY_ORDER={pairs:[['',''],['',''],['','']],bowlers:['','','','','','']};
function readOrder(){try{let v=JSON.parse(localStorage.getItem(ORDER_KEY)||'null');if(v&&Array.isArray(v.pairs)&&v.pairs.length===3&&v.pairs.every(p=>Array.isArray(p)&&p.length===2)&&Array.isArray(v.bowlers)&&v.bowlers.length===6)return v;}catch{}return JSON.parse(JSON.stringify(EMPTY_ORDER));}
let matchOrder=readOrder();
const playerSetup = new PlayerSetup(document, localStorage, matchOrder, escapeHtml);
function renderOrderForm() { playerSetup.render(matchOrder); }
function saveOrder() {
  const next = playerSetup.read();
  if (!next) return;
  if (events.length && !confirm('Changing the order during a match affects future deliveries only. Existing deliveries keep their recorded names. Continue?')) return;
  matchOrder = next;
  playerSetup.save(next);
  lastLineupKey = '';
  $('orderStatus').textContent = 'Players and order saved.';
  $('orderDetails').open = false;
  render();
}
function configuredOrder(){return matchOrder.pairs.every(p=>p.every(Boolean))&&matchOrder.bowlers.every(Boolean)}
function requireOrder(){if(configuredOrder())return true;showScreen('players');$('orderDetails').open=true;$('orderStatus').textContent='Save a complete batting and bowling order before scoring.';$('orderSetup').scrollIntoView({behavior:'smooth'});return false}
renderOrderForm();
function oppositionBowlerNames(){let saved=JSON.parse(localStorage.getItem('thhg-opposition-bowlers-list')||'[]');return [...new Set([...saved,...events.filter(e=>e.innings==='THHG batting').map(e=>e.bowler).filter(n=>n&&n!=='Opposition bowler')])];}
function selectedOppositionBowler(){return $('oppositionBowler').value==='__new__'?$('newOppositionBowler').value.trim():$('oppositionBowler').value.trim()}
function rememberOppositionBowler(){let name=selectedOppositionBowler();if(!name)return;let names=oppositionBowlerNames();if(!names.includes(name))localStorage.setItem('thhg-opposition-bowlers-list',JSON.stringify([...names,name]));}
function refreshOppositionBowler(){let sel=$('oppositionBowler'),over=Math.min(11,Math.floor(stats().legal/6)),saved=JSON.parse(localStorage.getItem('thhg-opposition-bowlers')||'{}'),chosen=saved[currentInnings+'-'+over]||'';let names=oppositionBowlerNames();if(chosen&&!names.includes(chosen))names.push(chosen);sel.innerHTML='<option value="">Select opposition bowler</option>'+names.map(n=>'<option value="'+escapeHtml(n)+'">'+escapeHtml(n)+'</option>').join('')+'<option value="__new__">+ Add new bowler…</option>';sel.value=chosen||'';$('newOppositionBowler').style.display=sel.value==='__new__'?'':'none';}
let lastLineupKey='';function updateLineup(legal){let over=Math.min(11,Math.floor(legal/6)),side=$('inningsSide').value,batting=side==='THHG batting';let pair=matchOrder.pairs[Math.min(2,Math.floor(over/4))].map((n,i)=>n||'Batter '+(i+1)),bowler=matchOrder.bowlers[over%6]||'Bowler '+(over%6+1);let key=side+'-'+over+'-'+(batting?'':oppositionBatters().join('|'));if(key!==lastLineupKey){let str=$('striker'),bw=$('bowler');str.innerHTML=(batting?pair:oppositionPair(over)).map(n=>'<option>'+escapeHtml(n)+'</option>').join('');bw.innerHTML=(batting?['Opposition bowler']:matchOrder.bowlers).map(n=>'<option>'+escapeHtml(n)+'</option>').join('');if(!batting)bw.value=bowler;
// Reconstruct from the last delivery for reload and undo, including uncounted extras.
str.value=ScoringRules.nextStriker(batting?pair:oppositionPair(over),currentEvents().at(-1),legal,batting);
lastLineupKey=key;}$('bowler').style.display=batting?'none':'';$('oppositionBowler').style.display=batting?'':'none';$('newOppositionBowler').style.display='none';if(batting)refreshOppositionBowler();$('lineupNow').innerHTML=batting?'Over '+(over+1)+' · Batting pair: '+pair.map(escapeHtml).join(' & '):'Over '+(over+1)+' · Bowler: '+escapeHtml(bowler);} function saveOppositionBowlerSelection(){let over=Math.min(11,Math.floor(stats().legal/6));let names=JSON.parse(localStorage.getItem('thhg-opposition-bowlers')||'{}');names[currentInnings+'-'+over]=selectedOppositionBowler();localStorage.setItem('thhg-opposition-bowlers',JSON.stringify(names));}
$('oppositionBowler').addEventListener('change',()=>{let isNew=$('oppositionBowler').value==='__new__';$('newOppositionBowler').style.display=isNew?'':'none';if(isNew){$('newOppositionBowler').value='';$('newOppositionBowler').focus()}else saveOppositionBowlerSelection();});
$('newOppositionBowler').addEventListener('change',()=>{let name=$('newOppositionBowler').value.trim();if(!name)return;rememberOppositionBowler();saveOppositionBowlerSelection();refreshOppositionBowler();$('oppositionBowler').value=name;});
$('inningsSide').addEventListener('change',()=>{let chosen=$('inningsSide').value;if(currentInnings===1&&currentEvents().length){if(!confirm('Start the other team’s innings? The first innings will be saved.')){$('inningsSide').value=sideFor(1);return;}currentInnings=2;localStorage.setItem('thhg-current-innings','2');}else if(currentInnings===2){$('inningsSide').value=sideFor(2);return;}else{firstSide=chosen;localStorage.setItem('thhg-first-side',firstSide)}lastLineupKey='';render()});for(let n of [0,1,2,3,4,5,6]){let b=document.createElement('button');b.textContent=n;b.onclick=()=>bat(n);$('runButtons').appendChild(b)}render();

if(configuredOrder())$('orderDetails').open=false;
