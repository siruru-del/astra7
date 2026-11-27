/* ASTRA-7 entry presentation. The original iframe owns its 3-second countdown.
 * This adapter only styles and observes that existing DOM: no new clock, input,
 * game state, score calculation, countdown delay, or result message is introduced.
 */
(function (global) {
  'use strict';
  const frame=document.getElementById('legacyFrame');
  const portal=document.getElementById('legacyPortal');
  if(!frame||!portal)return;
  const styleUrl=new URL('assets/css/arena-experience.css',document.baseURI).href;
  const state={attached:false,styleLoaded:false,visible:false,digit:null,sequence:[],round:0,source:'native-iframe',shownAt:null,hiddenAt:null};
  let observer=null,styleLink=null;

  function detach(){
    if(observer){observer.disconnect();observer=null;}
    state.attached=false;state.styleLoaded=false;state.visible=false;state.digit=null;styleLink=null;delete portal.dataset.studioCountdown;
  }
  function decorate(){
    detach();
    let doc;
    try{doc=frame.contentDocument;}catch(_error){return;}
    const overlay=doc?.getElementById('gameOverlay'),title=doc?.getElementById('overlayTitle');
    if(!overlay||!title||!doc.head)return;
    styleLink=doc.getElementById('studioArenaExperienceStyle');
    if(!styleLink){
      styleLink=doc.createElement('link');styleLink.id='studioArenaExperienceStyle';
      styleLink.rel='stylesheet';styleLink.href=styleUrl;doc.head.appendChild(styleLink);
    }
    const installedLink=styleLink;
    installedLink.addEventListener('load',()=>{if(styleLink===installedLink)state.styleLoaded=true;},{once:true});
    state.styleLoaded=!!styleLink.sheet;state.attached=true;
    function inspect(){
      const text=title.textContent.trim();
      const visible=!portal.hidden&&!overlay.hidden&&title.classList.contains('countdown-number')&&/^[123]$/.test(text);
      if(visible){
        if(!state.visible){state.round++;state.sequence.length=0;state.shownAt=performance.now();state.hiddenAt=null;}
        if(text!==state.digit){state.sequence.push(Number(text));if(state.sequence.length>3)state.sequence.shift();}
        state.digit=text;if(portal.dataset.studioCountdown!==text)portal.dataset.studioCountdown=text;
      }else{
        if(state.visible)state.hiddenAt=performance.now();
        state.digit=null;delete portal.dataset.studioCountdown;
      }
      state.visible=visible;
    }
    observer=new MutationObserver(inspect);
    observer.observe(overlay,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','class']});
    inspect();
  }
  frame.addEventListener('load',decorate);
  const portalObserver=new MutationObserver(()=>{if(portal.hidden){state.visible=false;state.digit=null;delete portal.dataset.studioCountdown;}});
  portalObserver.observe(portal,{attributes:true,attributeFilter:['hidden']});
  decorate();
  global.STUDIO_ARENA_EXPERIENCE=Object.freeze({
    getState(){return {...state,visible:state.visible&&!portal.hidden&&!document.hidden,hidden:document.hidden,styleLoaded:state.styleLoaded||!!styleLink?.sheet,sequence:[...state.sequence]};}
  });
})(window);
