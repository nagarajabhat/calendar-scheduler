import {describe,it,expect} from 'vitest';
import {layout} from '../lib/layout';import {expand} from '../lib/recurrence';import {zoned,parts} from '../lib/dates';
import {editChanges} from '../lib/edit';import {reducer} from '../store';
const D=(y,m,d,h=9,tz='UTC')=>zoned(y,m,d,h,0,tz);
const mk=(rule,start=D(2026,10,5),tz)=>({id:'a',title:'x',start,end:start+36e5,attendees:[],exceptions:[],rule:rule&&{tz:'UTC',...rule}});

describe('layout',()=>{
  it('places overlapping events side by side',()=>{const r=layout([{s:0,e:60},{s:30,e:90}]);expect(r.map(x=>[x.c,x.n])).toEqual([[0,2],[1,2]])});
  it('keeps back-to-back events full width',()=>{expect(layout([{s:0,e:60},{s:60,e:120}]).map(x=>x.n)).toEqual([1,1])});
});
describe('recurrence',()=>{
  it('clamps the 31st to month end',()=>{const o=expand(mk({freq:'monthly',count:3},D(2026,1,31)),0,Infinity);expect(o.map(x=>parts(x.start,'UTC').d)).toEqual([31,28,31])});
  it('keeps wall-clock time across DST',()=>{const tz='America/New_York',o=expand(mk({freq:'weekly',count:3,tz},D(2026,3,2,9,tz)),0,Infinity);
    expect(o.map(x=>parts(x.start,tz).h)).toEqual([9,9,9]);expect(new Date(o[0].start).getUTCHours()).toBe(14);expect(new Date(o[2].start).getUTCHours()).toBe(13)});
  it('handles every 2nd Tuesday',()=>{const o=expand(mk({freq:'monthly',nth:true,count:2},D(2026,10,13)),0,Infinity);expect(parts(o[1].start,'UTC')).toMatchObject({m:11,d:10})});
  it('only generates the visible range',()=>{expect(expand(mk({freq:'daily'}),D(2026,10,10,0),D(2026,10,13,0))).toHaveLength(3)});
});
describe('edit scopes',()=>{
  const ev=mk({freq:'daily',count:5}),occ=expand(ev,0,Infinity)[2];
  it('this: adds exception + standalone event',()=>{const c=editChanges([ev],occ,{title:'y'},'this');expect(c).toHaveLength(2);expect(c[0].after.exceptions).toContain(occ.occStart);expect(c[1].after.rule).toBeNull()});
  it('following: truncates old series, starts new one with remaining count',()=>{const c=editChanges([ev],occ,{title:'y'},'following');expect(c[0].after.rule.until).toBe(occ.occStart-1);expect(c[1].after.rule.count).toBe(3)});
  it('all + delete removes the master',()=>{expect(editChanges([ev],occ,null,'all')[0].after).toBeNull()});
  it('rule change on "all" is applied',()=>{expect(editChanges([ev],occ,{...occ,rule:{freq:'weekly',tz:'UTC'}},'all')[0].after.rule.freq).toBe('weekly')});
});
describe('history',()=>{
  const a={id:'a',v:0},a1={id:'a',v:1},a2={id:'a',v:2};
  const c1={id:1,label:'1',changes:[{id:'a',before:a,after:a1}]},c2={id:2,label:'2',changes:[{id:'a',before:a1,after:a2}]};
  const s0={events:[a],past:[],future:[],status:{},ready:true,msg:''};
  it('undo/redo round trip',()=>{let s=reducer(s0,{t:'exec',cmd:c1});s=reducer(s,{t:'undo'});expect(s.events[0].v).toBe(0);s=reducer(s,{t:'redo'});expect(s.events[0].v).toBe(1)});
  it('failed save rolls back when nothing later touched it',()=>{let s=reducer(s0,{t:'exec',cmd:c1});s=reducer(s,{t:'rollback',id:1});expect(s.events[0].v).toBe(0);expect(s.past).toHaveLength(0)});
  it('failed earlier save does not corrupt later history',()=>{let s=reducer(reducer(s0,{t:'exec',cmd:c1}),{t:'exec',cmd:c2});s=reducer(s,{t:'rollback',id:1});expect(s.events[0].v).toBe(2);expect(s.past).toHaveLength(2)});
});
