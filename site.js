"use strict";
const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const tracks=window.FLIGHT_TRACKS||{};
const svgNS="http://www.w3.org/2000/svg";
const flightPlayers=new Map();
const TRAIL_DELAY=.08; // Seconds of source footage; identical physical lag in both playback phases.
const introVideo=document.querySelector(".original-intuition video");
const smallView=window.matchMedia("(max-width:600px)");
const setIntroSource=()=>{
  const time=introVideo.currentTime,playing=!introVideo.paused;
  introVideo.poster=smallView.matches?"assets/slide-flight-intuition-mobile.jpg?v=25":"assets/slide-flight-intuition.jpg";
  introVideo.src=smallView.matches?"assets/slide-flight-intuition-mobile.mp4?v=25":"assets/slide-flight-intuition.mp4";
  introVideo.addEventListener("loadedmetadata",()=>{introVideo.currentTime=Math.min(time,introVideo.duration);if(playing&&!reducedMotion)introVideo.play().catch(()=>{});},{once:true});
};
setIntroSource();smallView.addEventListener("change",setIntroSource);
document.querySelectorAll(".flight-player").forEach(wrapper=>{
  const video=wrapper.querySelector("video"),svg=wrapper.querySelector("svg"),badge=wrapper.querySelector(".speed-label");
  let paths=[],curves=[],data;
  const render=()=>{
    if(!data)return;
    const slow=video.currentTime>=data.fastEnd;
    badge.textContent=slow?"1/4×":"1×";
    badge.classList.toggle("slow",slow);
    const time=data.start+(slow?(video.currentTime-data.fastEnd)/4:video.currentTime)-TRAIL_DELAY;
    paths.forEach((path,i)=>path.setAttribute("d",window.BoomerangCurve.path(curves[i],time)));
  };
  const loadTrace=key=>{
    data=tracks[key];if(!data)return;
    wrapper.dataset.flight=key;video.style.aspectRatio=`${data.width}/${data.height}`;
    svg.setAttribute("viewBox",`0 0 ${data.width} ${data.height}`);svg.replaceChildren();
    curves=window.BoomerangCurve.segments(data.points);
    paths=curves.map(curve=>{
      const path=document.createElementNS(svgNS,"path");
      path.setAttribute("fill","none");path.setAttribute("stroke",data.color);path.setAttribute("stroke-width","2.7");path.setAttribute("stroke-linecap","round");
      svg.append(path);return path;
    });render();
  };
  const frame=()=>{render();if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(frame);else if(!video.paused)requestAnimationFrame(frame);};
  if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(frame);else video.addEventListener("play",frame);
  ["loadedmetadata","timeupdate","seeked","emptied"].forEach(event=>video.addEventListener(event,render));
  loadTrace(wrapper.dataset.flight);
  flightPlayers.set(wrapper.classList.contains("iteration-player")?"iteration":"opening",{video,loadTrace,render});
});
const trials={
 baseline:["Nominal · ~90° grasp · 45 rad/s","Need more spin to precess → Increase grasp angle"],
 spin:["Nominal · ~120° grasp · 53 rad/s","Need to tighten the flight → Decrease boomerang thickness"],
 return:["Thin · ~120° grasp · 51 rad/s","A returning flight"]
};
const trialOrder=["baseline","spin","return"];
const trialButtons=[...document.querySelectorAll("[data-trial]")];
const selectTrial=key=>{
  const button=trialButtons.find(b=>b.dataset.trial===key),player=flightPlayers.get("iteration"),data=tracks[key];
  if(!button||!data)return;
  trialButtons.forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
  player.video.pause();player.video.src=data.src;player.video.poster=data.poster;
  player.video.setAttribute("aria-label",`Selected robot flight: ${button.textContent.trim()}`);
  player.video.load();player.loadTrace(key);
  const copy=document.getElementById("iteration-description");copy.replaceChildren();
  trials[key].forEach((text,i)=>{const p=document.createElement("p");p.textContent=text;if(i===0)p.className="iteration-setting";copy.append(p);});
  player.video.play().catch(()=>{});
};
trialButtons.forEach(button=>button.addEventListener("click",()=>selectTrial(button.dataset.trial)));
flightPlayers.get("iteration").video.addEventListener("ended",()=>{
  if(reducedMotion)return;
  const current=document.querySelector(".iteration-player").dataset.flight;
  selectTrial(trialOrder[(trialOrder.indexOf(current)+1)%trialOrder.length]);
});
document.querySelectorAll("[data-panel]").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll("[data-panel]").forEach(other=>other.setAttribute("aria-pressed",String(other===button)));
  document.querySelectorAll(".evidence-panel").forEach(panel=>panel.hidden=panel.id!==button.dataset.panel);
}));
document.querySelectorAll("[data-replay-video]").forEach(button=>button.addEventListener("click",()=>{
  const video=document.getElementById(button.dataset.replayVideo);
  video.currentTime=0;video.play().catch(()=>{});
}));
document.querySelectorAll("[data-animation]").forEach(figure=>{
  const video=figure.querySelector(".concept-video"),chapters=[...figure.querySelectorAll("[data-time]")],copies=figure.querySelectorAll("[data-index]");
  const update=()=>{let active=0;chapters.forEach((b,i)=>{if(video.currentTime>=Number(b.dataset.time))active=i;});chapters.forEach((b,i)=>b.setAttribute("aria-pressed",String(i===active)));copies.forEach(p=>p.hidden=Number(p.dataset.index)!==active);};
  const play=time=>{video.currentTime=time;update();video.play().catch(()=>{});};
  chapters.forEach(button=>button.addEventListener("click",()=>play(Number(button.dataset.time))));
  figure.querySelector(".replay-animation").addEventListener("click",()=>play(0));video.addEventListener("timeupdate",update);
});
if(reducedMotion){document.querySelectorAll("video").forEach(v=>{v.autoplay=false;v.pause();});}
else if("IntersectionObserver"in window){
  const started=new WeakSet(),resume=new WeakSet();
  const observer=new IntersectionObserver(entries=>entries.forEach(({target:video,intersectionRatio})=>{
    if(intersectionRatio>=.35){if(!started.has(video)||resume.has(video)){started.add(video);resume.delete(video);video.play().catch(()=>{});}}
    else if(!video.paused&&!video.ended){resume.add(video);video.pause();}
  }),{threshold:.35});
  document.querySelectorAll("video").forEach(v=>observer.observe(v));
}
