import test from 'node:test';
import assert from 'node:assert/strict';
import { Story, DEVELOPMENT_SECONDS, canStand } from '../story.mjs';
function advance(s, seconds) { for(let t=0;t<seconds;t+=.25)s.tick(.25); }
test('only the current story interaction advances the sequence',()=>{
 const s=new Story();assert.equal(s.interact('tray'),false);assert.equal(s.interact('phone'),false);assert.equal(s.stage,'collection');assert.equal(s.interact('film'),true);assert.equal(s.stage,'develop');assert.equal(s.interact('film'),false);
});
test('each print develops for the specified time and cannot be lifted early',()=>{
 const s=new Story();s.interact('film');s.interact('tray');advance(s,7.75);assert.equal(s.stage,'processing');assert.equal(s.interact('tray'),false);s.tick(.25);assert.equal(s.stage,'ready');assert.equal(s.progress,0);assert.equal(s.interact('tray'),true);assert.equal(s.stage,'inspect');
});
test('all four photographs and the full ending are reachable in order',()=>{
 const s=new Story();s.interact('film');
 for(let i=0;i<4;i++){
  assert.equal(s.print,i);assert.equal(s.interact('tray'),true);advance(s,DEVELOPMENT_SECONDS[i]);assert.equal(s.stage,'ready');s.interact('tray');assert.equal(s.lower(),false);advance(s,5);assert.equal(s.lower(),true);
  assert.equal(s.stage,['counter','phone','deliver','turn'][i]);
  if(i<3)assert.equal(s.interact(['bell','phone','delivery'][i]),true);
 }
 assert.equal(s.end(),true);assert.equal(s.stage,'ended');assert.equal(s.interact('tray'),false);assert.equal(s.end(),false);
});
test('double interaction cannot consume two photographs',()=>{
 const s=new Story();s.interact('film');s.interact('tray');assert.equal(s.interact('tray'),false);advance(s,8);s.interact('tray');assert.equal(s.interact('tray'),false);assert.equal(s.print,0);
});
test('negative time cannot reverse story progress; long frames are bounded',()=>{
 const s=new Story();s.tick(-10);assert.equal(s.total,0);s.tick(100);assert.equal(s.total,.25);
});
test('collision keeps the player inside the shop and outside furniture',()=>{
 const furniture=[{x0:-2.8,x1:1.1,z0:2.675,z1:3.525}];assert.equal(canStand(-.45,1.35,furniture),true);assert.equal(canStand(0,3,furniture),false);assert.equal(canStand(4.5,0,furniture),false);assert.equal(canStand(0,7,furniture),false);assert.equal(canStand(0,-7,furniture),false);
});
test('partition blocks walls but permits the real doorway',()=>{
 const walls=[{x0:-4.4,x1:1.7,z0:-1.56,z1:-1.34},{x0:3.3,x1:4.4,z0:-1.56,z1:-1.34}];assert.equal(canStand(0,-1.45,walls),false);assert.equal(canStand(2.5,-1.45,walls),true);assert.equal(canStand(1.75,-1.45,walls),false);
});
