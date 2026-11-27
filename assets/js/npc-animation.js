/* 별빛 사진관 V6.3 — 발 위치를 지키는 NPC 몸짓.
 * Interaction atlas: four 96×128 cells / neutral, greet, explain, remember.
 * Geometry, learning checks and sprite collision anchors are not modified.
 */
(function(global){
  'use strict';
  const IDS=Object.freeze(['manager','technician','guide','archivist']);
  const kinds=new Set(['greet','talk','remember']);
  const state={id:null,kind:null,active:false,elapsed:0,time:0,now:null,room:'lobby',paused:true,reducedMotion:false,pose:0,anchor:null,serial:0};
  const anchors=Object.create(null);
  function hidden(){return typeof document!=='undefined'&&document.hidden;}
  function begin(id,kind='greet'){
    if(!IDS.includes(id))return;
    state.id=id;state.kind=kinds.has(kind)?kind:'talk';state.active=true;state.elapsed=0;state.serial++;
  }
  function end(){state.active=false;state.id=null;state.kind=null;state.elapsed=0;state.pose=0;state.anchor=null;}
  function reset(){end();state.time=0;state.now=null;state.anchor=null;}
  function poseAt(){
    if(!state.active)return 0;
    if(state.reducedMotion)return state.kind==='remember'?3:state.kind==='greet'?1:2;
    const t=state.elapsed;
    if(state.kind==='remember')return 3;
    if(t<640)return 1;
    if(state.kind==='greet')return t%2600<1350?1:0;
    return t%3400<2200?2:0;
  }
  function update(options={}){
    const now=Number.isFinite(options.now)?options.now:performance.now(),dt=state.now===null?0:Math.min(80,Math.max(0,now-state.now));state.now=now;
    state.room=options.room||state.room;state.paused=!!options.paused||hidden();state.reducedMotion=!!options.reducedMotion;
    if(!state.paused&&!state.reducedMotion){state.time+=dt;if(state.active)state.elapsed+=dt;}
    state.pose=poseAt();
  }
  function draw(c,actor,options={}){
    if(!actor||!IDS.includes(actor.id))return false;
    const assets=options.assets||{},spec=options.sprite||{drawWidth:84,drawHeight:112,footY:119,cellHeight:128};
    const acting=state.active&&state.id===actor.id,interaction=assets[actor.id+'_interaction'];
    const useInteraction=acting&&interaction?.naturalWidth>0;
    const im=useInteraction?interaction:assets[actor.id];if(!im?.naturalWidth)return false;
    const anchor=anchors[actor.id]||(anchors[actor.id]={x:actor.x,y:actor.y});
    anchor.x=actor.x;anchor.y=actor.y;if(acting)state.anchor=anchor;
    const dw=spec.drawWidth||84,dh=spec.drawHeight||112,foot=(spec.footY||119)/(spec.cellHeight||128);
    const phase=state.time/1000+IDS.indexOf(actor.id)*1.7;
    let lean=0,sy=1;
    if(!state.reducedMotion){
      sy+=Math.sin(phase*1.3)*.006;
      if(acting){
        const t=state.elapsed/1000;
        if(state.kind==='remember'){lean=Math.sin(Math.min(t,1.2)/1.2*Math.PI)*.016;sy-=Math.sin(Math.min(t,1.0)*Math.PI)*.015;}
        else if(t<.8){lean=Math.sin(t/.8*Math.PI)*-.018;sy-=Math.sin(t/.8*Math.PI)*.012;}
        else {lean=Math.sin(t*1.5)*.004;sy+=Math.sin(t*2)*.004;}
      }
    }
    const sw=im.naturalWidth/(useInteraction?4:3),sh=im.naturalHeight/(useInteraction?1:4);
    const frame=useInteraction?state.pose:(Number.isFinite(actor.frame)?actor.frame:1),row=useInteraction?0:({down:0,left:1,right:2,up:3}[actor.dir]||0);
    c.save();c.imageSmoothingEnabled=false;c.translate(actor.x,actor.y);c.rotate(lean);c.scale(1,sy);
    c.drawImage(im,Math.max(0,Math.min(useInteraction?3:2,frame))*sw,row*sh,sw,sh,-dw/2,-dh*foot,dw,dh);c.restore();
    return true;
  }
  function getState(){return {id:state.id,kind:state.kind,active:state.active,elapsed:state.elapsed,time:state.time,pose:state.pose,serial:state.serial,room:state.room,paused:state.paused,reducedMotion:state.reducedMotion,anchor:state.anchor?{...state.anchor}:null,anchors:Object.fromEntries(Object.entries(anchors).map(([k,v])=>[k,{...v}]))};}
  global.STUDIO_NPC_ANIMATION=Object.freeze({update,begin,end,reset,draw,getState});
})(window);
