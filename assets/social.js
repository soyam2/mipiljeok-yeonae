(()=>{
'use strict';
const {profiles,posts}=window.MIPIL_SOCIAL;
const layer=document.getElementById('socialExplorer'),root=document.getElementById('simRoot');
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const paths={back:'M15 18l-6-6 6-6',close:'M6 6l12 12M18 6L6 18',down:'M6 9l6 6 6-6',next:'M9 6l6 6-6 6',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',comment:'M21 11.5a9 9 0 0 1-9 9 9.8 9.8 0 0 1-4-.9L3 21l1.5-4.7A9 9 0 1 1 21 11.5Z',share:'M22 2L9 15M22 2l-7 20-6-7-7-6 20-7Z',bookmark:'M6 3h12v18l-6-4-6 4V3Z',grid:'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z',tag:'M8 5h8l2 3h3v13H3V8h3l2-3ZM12 10a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM7 20v-1a5 5 0 0 1 10 0v1',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',home:'M3 10l9-8 9 8v11h-6v-8H9v8H3V10Z',music:'M9 18V5l12-3v13M9 8l12-3M9 18a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3ZM21 15a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Z',pin:'M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6ZM12 15v7',stack:'M7 3h14v14M3 7h14v14H3V7Z',pause:'M8 4v16M16 4v16',play:'M8 3l12 9-12 9V3Z',user:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-2a8 8 0 0 1 16 0v2',check:'M4 12l5 5L20 6',copy:'M9 3h12v14H9V3ZM5 7H3v14h14v-2'};
function icon(n,fill=false){return `<svg viewBox="0 0 24 24" aria-hidden="true" ${fill?'class="svg-fill"':''}><path d="${paths[n]||paths.user}"/></svg>`}
let store={likes:{},saves:{},follows:{},commentLikes:{},comments:{},storyLikes:{},messages:{},blocked:{},dmCount:{},dmWarnings:{},dmMeta:{},mutual:{},likeReactions:{},followGreetings:{}};
try{localStorage.removeItem('mipil.social.v3')}catch(_){}
const persist=()=>{}; // Fresh SNS state on every full website load

// Background freeze: overflow:hidden alone does not reliably lock body scrolling
// in iOS Safari. Freeze the document at its original page offset while a modal
// or the fictional Instagram overlay is active, then restore the exact position.
const pageScrollLock=(()=>{
 const reasons=new Set();
 let snapshot=null;
 const props=['position','top','left','right','width','overflow'];
 function lock(reason){
  if(reasons.has(reason))return;
  reasons.add(reason);
  if(snapshot)return;
  const body=document.body,doc=document.documentElement;
  const y=window.pageYOffset||doc.scrollTop||0;
  const x=window.pageXOffset||doc.scrollLeft||0;
  snapshot={x,y,bodyStyles:Object.fromEntries(props.map(p=>[p,body.style[p]])),
    htmlOverflow:doc.style.overflow,htmlScrollBehavior:doc.style.scrollBehavior};
  body.style.position='fixed';
  body.style.top=(-y)+'px';
  body.style.left='0';
  body.style.right='0';
  body.style.width='100%';
  body.style.overflow='hidden';
  doc.style.overflow='hidden';
  doc.classList.add('mipil-page-frozen');
 }
 function unlock(reason){
  if(!reasons.delete(reason)||reasons.size)return;
  if(!snapshot)return;
  const body=document.body,doc=document.documentElement;
  const old=snapshot;snapshot=null;
  for(const p of props)body.style[p]=old.bodyStyles[p];
  doc.style.overflow=old.htmlOverflow;
  doc.classList.remove('mipil-page-frozen');
  // Disable CSS smooth-scroll during restoration; otherwise it animates the page.
  doc.style.scrollBehavior='auto';
  window.scrollTo(old.x,old.y);
  requestAnimationFrame(()=>{
   window.scrollTo(old.x,old.y);
   doc.style.scrollBehavior=old.htmlScrollBehavior;
  });
 }
 return {lock,unlock,isLocked:()=>reasons.size>0};
})();
window.MIPIL_PAGE_SCROLL_LOCK=pageScrollLock;

// iOS Safari keyboard: fixed panels use the layout viewport, while typing uses
// the smaller visual viewport. Fit only the DM composer view to that viewport.
const dmVisualViewport=window.visualViewport;
function updateDMVisualViewport(){
 const isPhone=window.matchMedia('(max-width:690px)').matches;
 const active=document.activeElement;
 const composing=opened&&current?.type==='dm'&&isPhone&&
   !!active&&active.matches('#simDmForm input[name="message"]');
 layer.classList.toggle('ig-dm-composing',composing);
 document.body.classList.toggle('ig-dm-composing',composing);
 if(!composing){
   layer.style.removeProperty('--ig-visual-height');
   layer.style.removeProperty('--ig-visual-top');
   return;
 }
 const vv=dmVisualViewport;
 const height=vv?.height||window.innerHeight;
 const top=vv?.offsetTop||0;
 layer.style.setProperty('--ig-visual-height',Math.max(180,Math.round(height))+'px');
 layer.style.setProperty('--ig-visual-top',Math.max(0,Math.round(top))+'px');
 const msgs=root.querySelector('.sim-dm-messages');
 if(msgs)msgs.scrollTop=msgs.scrollHeight;
}
root.addEventListener('focusin',e=>{if(e.target.matches('#simDmForm input[name="message"]')){updateDMVisualViewport();requestAnimationFrame(updateDMVisualViewport);}});
root.addEventListener('focusout',e=>{if(e.target.matches('#simDmForm input[name="message"]'))setTimeout(updateDMVisualViewport,80);});
dmVisualViewport?.addEventListener('resize',updateDMVisualViewport,{passive:true});
dmVisualViewport?.addEventListener('scroll',updateDMVisualViewport,{passive:true});
window.addEventListener('resize',updateDMVisualViewport,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(updateDMVisualViewport,100));
const followEvents={};
const likeEvents={};
let screens=[],current=null,opened=false,session='',skipPop=false,focusBefore=null,storyTimer=null,storyStarted=0,storyRemaining=7000,toastTimer;
const handles=Object.fromEntries(Object.entries(profiles).map(([id,p])=>[p.handle,id]));
function av(id,cls=''){const p=profiles[id]||profiles.you;return p.avatar?`<img class="sim-avatar ${cls}" src="${p.avatar}" alt="${esc(p.name)}" loading="lazy">`:`<span class="sim-avatar ${cls}" style="background:${p.color||'#61505d'}">${icon('user')}</span>`}
function avButton(id){return `<button class="sim-avatar-btn" data-action="profile" data-id="${id}" aria-label="${esc(profiles[id]?.name)} 프로필">${av(id)}</button>`}
function handle(id){return `<button class="sim-handle" data-action="profile" data-id="${id}">${esc(profiles[id]?.handle||id)}</button>`}
function mentions(text){return esc(text).replace(/@([a-z0-9_.]+)/gi,(full,h)=>handles[h]?`<button class="sim-handle sim-blue" data-action="profile" data-id="${handles[h]}">${full}</button>`:full)}
function follow(id){const yes=!!store.follows[id];return `<button class="sim-follow ${yes?'followed':''}" data-action="follow" data-id="${id}" aria-pressed="${yes}">${yes&&store.mutual?.[id]?'맞팔로우 중':yes?'팔로잉':'팔로우'}</button>`}
function userComments(pid){return store.comments[pid]||[]}
function allComments(pid){return [...(posts[pid].comments||[]),...userComments(pid).filter(x=>!x.parent)]}
function replies(pid,c){return [...(c.replies||[]),...userComments(pid).filter(x=>x.parent===c.id)]}
function commentCount(pid){return allComments(pid).reduce((n,c)=>n+1+replies(pid,c).length,0)}
function date(s){const [y,m,d]=s.split('-');return `${y}년 ${+m}월 ${+d}일`}
function saveScroll(){if(current){current.scroll=root.querySelector('.sim-scroll')?.scrollTop||0;const inp=root.querySelector('textarea');if(inp)current.draft=inp.value}}
function setScreen(view){
 current=view;render();
 requestAnimationFrame(()=>{
  const sc=root.querySelector('.sim-scroll');
  if(sc){
   if(view.type==='dm')sc.scrollTop=0;
   else if(view.type==='post'&&view.scroll==null){
    const target=sc.querySelector('[data-post-id="'+view.id+'"]');
    if(target)sc.scrollTop+=target.getBoundingClientRect().top-sc.getBoundingClientRect().top;
   }else sc.scrollTop=view.scroll||0;
  }
  if(view.type==='dm'){
    const ms=root.querySelector('.sim-dm-messages');if(ms)ms.scrollTop=ms.scrollHeight;
  }
  updateDMVisualViewport();
 });
}
function navigate(view){saveScroll();screens.push(view);history.pushState({mipilSNS:session,depth:screens.length},'',location.href);setScreen(view)}
function open(id='yul'){if(opened){navigate({type:'profile',id});return}focusBefore=document.activeElement;pageScrollLock.lock('instagram');document.documentElement.classList.add('ig-page-open');opened=true;session='sns'+Date.now();screens=[];layer.classList.add('open');layer.setAttribute('aria-hidden','false');document.body.classList.add('social-open');document.querySelector('main.site').inert=true;syncDock();navigate({type:'profile',id});root.tabIndex=-1;root.focus({preventScroll:true})}
function hide(){opened=false;clearTimeout(storyTimer);layer.classList.remove('ig-dm-composing');document.body.classList.remove('ig-dm-composing');document.documentElement.classList.remove('ig-page-open');layer.classList.remove('open');layer.setAttribute('aria-hidden','true');document.body.classList.remove('social-open');document.querySelector('main.site').inert=false;focusBefore?.focus({preventScroll:true});pageScrollLock.unlock('instagram');syncDock()}
function close(){if(!opened)return;const depth=screens.length;hide();if(depth){skipPop=true;history.go(-depth)}screens=[];current=null}
function back(){if(screens.length>1)history.back();else close()}
window.addEventListener('popstate',e=>{if(skipPop){skipPop=false;return}if(!opened)return;if(e.state?.mipilSNS===session&&e.state.depth>0){screens.length=e.state.depth;setScreen(screens.at(-1))}else hide()});
function syncDock(){const h=document.getElementById('musicDrawer').getBoundingClientRect().height;document.documentElement.style.setProperty('--music-clearance',Math.ceil(h+20)+'px')}
new ResizeObserver(syncDock).observe(document.getElementById('musicDrawer'));window.addEventListener('resize',syncDock);syncDock();
function toolbar(label){return `<header class="sim-top"><button class="sim-icon" data-action="back" aria-label="뒤로">${icon('back')}</button><button class="sim-top-name" data-action="accounts" aria-label="계정 목록">${esc(label)}${current.type==='profile'?icon('down'):''}</button><button class="sim-icon sim-notify-trigger" id="notifyOpen" data-action="notices" aria-label="알림 보기" aria-expanded="false">${icon('heart')}<span class="sim-unread-dot" id="notifyDot" hidden></span></button><button class="sim-close" data-action="close" aria-label="SNS 닫기">닫기 ×</button></header>`}
function bottom(){return `<nav class="sim-bottom" aria-label="SNS 메뉴"><button data-action="feed" class="${current.type==='feed'?'selected':''}" aria-label="피드">${icon('home')}</button><button data-action="search" class="${current.type==='search'?'selected':''}" aria-label="계정 검색">${icon('search')}</button><button data-action="saved" class="${current.type==='saved'?'selected':''}" aria-label="저장한 게시물">${icon('bookmark')}</button><button data-action="activity" class="${current.type==='activity'?'selected':''}" aria-label="내 활동">${icon('heart')}</button><button data-action="profile" data-id="you" aria-label="내 프로필">${av('you')}</button></nav>`}
function tagged(id){const h=profiles[id].handle;return Object.values(posts).filter(p=>p.author!==id&&(p.caption.includes('@'+h)||p.comments.some(c=>c.author===id))).map(p=>p.id)}
function grid(ids){if(!ids.length)return `<div class="sim-empty">${icon('grid')}아직 게시물이 없습니다.</div>`;return `<div class="sim-grid">${ids.map(pid=>{const p=posts[pid];return `<button class="sim-tile" data-action="post" data-id="${pid}" aria-label="${esc(profiles[p.author].name+' · '+p.caption.split('\n')[0])}"><img src="${p.images[0]}" alt="${esc(p.caption.split('\n')[0])}" loading="lazy">${p.pinned||p.images.length>1?`<span class="sim-tile-badge">${icon(p.pinned?'pin':'stack')}</span>`:''}</button>`}).join('')}</div>`}
function profileView(){const p=profiles[current.id],id=current.id,tab=current.tab||'posts';if(store.blocked[id])return `<div class="sim-empty" style="padding:70px 25px">${av(id)}<p>이 계정을 볼 수 없습니다.</p><small>이 계정에서 회원님을 차단했습니다.</small></div>`;const count=p.posts.length;return `<section class="sim-profile"><div class="sim-profile-top"><button class="sim-profile-avatar ${!p.highlights.length?'no-story':''}" data-action="${p.highlights.length?'story':'avatar'}" data-id="${id}" data-group="0" aria-label="${esc(p.name)} ${p.highlights.length?'스토리':'프로필 사진'}">${av(id)}</button><div class="sim-profile-info"><h2 class="sim-profile-user">${esc(p.handle)}</h2><div class="sim-stats"><button data-action="grid-top"><b>${count}</b><span>게시물</span></button><button data-action="followers" data-id="${id}"><b>${(p.followers+(id==='you'?Object.values(store.mutual).filter(Boolean).length:(store.follows[id]?1:0))).toLocaleString()}</b><span>팔로워</span></button><button data-action="following" data-id="${id}"><b>${id==='you'?Object.keys(store.follows).filter(k=>store.follows[k]).length:p.following.toLocaleString()}</b><span>팔로잉</span></button></div></div></div><div class="sim-bio"><div class="sim-muted">${esc(p.category)}</div><div class="sim-bio-name">${esc(p.name)}</div>${mentions(p.bio)}</div><div class="sim-profile-actions">${id==='you'?`<button class="sim-secondary" data-action="saved">저장한 게시물</button><button class="sim-secondary" data-action="activity">내 활동</button>`:follow(id)+`<button class="sim-secondary" data-action="dm" data-id="${id}">메시지</button><button class="sim-secondary" data-action="connections" data-id="${id}">함께 아는 계정</button>`}</div></section>${p.highlights.length?`<div class="sim-highlights">${p.highlights.map((g,i)=>`<button class="sim-highlight" data-action="story" data-id="${id}" data-group="${i}"><img src="${posts[g.posts[0]].images[0]}" alt="${esc(g.title)} 스토리"><span>${esc(g.title)}</span></button>`).join('')}</div>`:''}<nav class="sim-profile-tabs" aria-label="프로필 게시물"><button data-action="profile-tab" data-tab="posts" class="${tab==='posts'?'on':''}" aria-label="게시물">${icon('grid')}<span>게시물</span></button><button data-action="profile-tab" data-tab="tagged" class="${tab==='tagged'?'on':''}" aria-label="연결된 게시물">${icon('tag')}<span>연결된 게시물</span></button></nav>${grid(tab==='posts'?p.posts:tagged(id))}`}
function postView(pid,feed=false){const p=posts[pid],person=profiles[p.author],ci=current?.type==='post'?(current.slides?.[pid]||0):feed?0:(current.slide||0),yes=!!store.likes[pid],saved=!!store.saves[pid];const comments=allComments(pid);return `<article class="sim-post" data-post-id="${pid}"><div class="sim-post-header">${avButton(p.author)}<div class="sim-post-header-info">${handle(p.author)}<div class="sim-location">${esc(p.location)}</div></div>${p.author==='you'?'':`<button class="sim-icon" data-action="profile" data-id="${p.author}" aria-label="프로필 보기">${icon('next')}</button>`}</div><div class="${feed?'':'sim-post-layout'}"><div class="sim-media" data-media="${pid}"><img src="${p.images[ci]}" alt="${esc(person.name+' · '+p.caption.split('\n')[0])}">${p.images.length>1&&!feed?`<span class="sim-media-counter">${ci+1} / ${p.images.length}</span><button class="sim-media-prev" data-action="slide-prev" data-id="${pid}" aria-label="이전 사진" ${ci===0?'hidden':''}>${icon('back')}</button><button class="sim-media-next" data-action="slide-next" data-id="${pid}" aria-label="다음 사진" ${ci===p.images.length-1?'hidden':''}>${icon('next')}</button>`:''}</div><div class="sim-post-detail"><div class="sim-post-actions"><button class="sim-icon ${yes?'sim-liked':''}" data-action="like" data-id="${pid}" aria-label="${yes?'좋아요 취소':'좋아요'}" aria-pressed="${yes}">${icon('heart',yes)}</button><button class="sim-icon" data-action="comments" data-id="${pid}" aria-label="댓글 보기">${icon('comment')}</button><button class="sim-icon" data-action="share" data-id="${pid}" aria-label="게시물 링크 복사">${icon('share')}</button><button class="sim-icon save" data-action="save" data-id="${pid}" aria-label="${saved?'저장 취소':'게시물 저장'}" aria-pressed="${saved}">${icon('bookmark',saved)}</button></div><div class="sim-post-copy"><button class="sim-likes" data-action="likers" data-id="${pid}">좋아요 ${(p.likes+(yes?1:0)).toLocaleString()}개</button><p class="sim-caption">${handle(p.author)}${mentions(p.caption)}</p><button class="sim-all-comments" data-action="comments" data-id="${pid}">댓글 ${commentCount(pid)}개 모두 보기</button>${comments.slice(0,2).map(c=>`<div class="sim-comment-preview">${handle(c.author)}${mentions(c.text)}</div>`).join('')}<div class="sim-date">${date(p.date)}</div></div><div class="sim-inline-editor">${av('you')}<button data-action="comments" data-id="${pid}" data-focus="yes">댓글 달기…</button></div></div></div></article>`}
function commentRow(pid,c,isReply=false){const rs=isReply?[]:replies(pid,c);const key=pid+':'+c.id,liked=!!store.commentLikes[key],expanded=current.expanded?.includes(c.id);return `<div class="sim-comment" data-comment="${c.id}">${avButton(c.author)}<div class="sim-comment-body">${handle(c.author)}<span class="sim-comment-text">${mentions(c.text)}</span><div class="sim-comment-meta"><span>${esc(c.time||'방금')}</span><span>좋아요 ${c.likes+(liked?1:0)}개</span><button data-action="reply" data-id="${c.id}" data-author="${c.author}" data-parent="${isReply?(current.replyParent||''):c.id}">답글 달기</button></div>${rs.length?`<button class="sim-reply-toggle" data-action="toggle-replies" data-id="${c.id}">${expanded?'답글 숨기기':`답글 ${rs.length}개 보기`}</button>${expanded?`<div class="sim-replies">${rs.map(r=>commentRow(pid,{...r,_parent:c.id},true).replace('data-parent=""',`data-parent="${c.id}"`)).join('')}</div>`:''}`:''}</div><button class="sim-comment-heart ${liked?'sim-liked':''}" data-action="comment-like" data-id="${key}" aria-label="댓글 좋아요" aria-pressed="${liked}">${icon('heart',liked)}</button></div>`}
function commentsView(){const p=posts[current.id];if(store.blocked[p.author])return `<div class="sim-empty">이 계정에서 회원님을 차단했습니다.</div>`;return `<div class="sim-comments"><div class="sim-comment sim-comment-caption">${avButton(p.author)}<div class="sim-comment-body">${handle(p.author)}<span class="sim-comment-text">${mentions(p.caption)}</span><div class="sim-comment-meta">${date(p.date)}</div></div></div>${allComments(current.id).map(c=>commentRow(current.id,c)).join('')}</div>`}
function composer(){return `<div class="sim-compose-wrap">${current.replyTo?`<div class="sim-replying">@${esc(profiles[current.replyAuthor].handle)} 님에게 답글 남기는 중<button data-action="cancel-reply" aria-label="답글 취소">×</button></div>`:''}<form class="sim-compose" id="simCompose">${av('you')}<textarea name="comment" aria-label="댓글 입력" rows="1" maxlength="500" placeholder="${current.replyTo?'답글 달기…':'댓글 달기…'}">${esc(current.draft||'')}</textarea><button type="submit" ${!current.draft?.trim()?'disabled':''}>게시</button></form></div>`}
function accountRow(id){return `<div class="sim-account-row">${avButton(id)}<button class="account-main" data-action="profile" data-id="${id}"><strong>${esc(profiles[id].handle)}</strong><small>${esc(profiles[id].name)}${profiles[id].category?' · '+esc(profiles[id].category):''}</small></button>${id==='you'?'':follow(id)}</div>`}
function listView(){let ids=current.ids||Object.keys(profiles).filter(x=>x!=='you');if(current.type==='search'){const q=(current.query||'').toLowerCase();ids=ids.filter(id=>(profiles[id].name+' '+profiles[id].handle+' '+profiles[id].category).toLowerCase().includes(q))}return `${current.type==='search'?`<div class="sim-search"><input id="simSearch" type="search" placeholder="계정 검색" aria-label="계정 검색" value="${esc(current.query||'')}"></div>`:''}<div class="sim-list">${current.note?`<div class="sim-list-caption">${esc(current.note)}</div>`:''}${ids.length?ids.map(accountRow).join(''):'<div class="sim-empty">검색 결과가 없습니다.</div>'}</div>`}
function activityView(){const own=Object.entries(store.comments).flatMap(([pid,cs])=>cs.map(c=>({...c,pid})));const likes=Object.keys(store.likes).filter(k=>store.likes[k]);return `<h3 class="sim-directory-title">내가 남긴 댓글</h3><div class="sim-list">${own.length?own.map(c=>`<div class="sim-account-row">${av('you')}<button class="account-main" data-action="comments" data-id="${c.pid}"><strong>${esc(c.text)}</strong><small>@${esc(profiles[posts[c.pid].author].handle)}의 게시물 · ${c.parent?'답글':'댓글'}</small></button></div>`).join(''):'<div class="sim-empty">아직 남긴 댓글이 없습니다.</div>'}</div><h3 class="sim-directory-title">좋아요한 게시물</h3>${grid(likes)}`}
function storyView(){const p=profiles[current.id],group=p.highlights[current.group||0],idx=current.index||0,post=posts[group.posts[idx]];return `<div class="sim-story ${current.paused?'paused':''}"><img class="sim-story-image" src="${post.images[0]}" alt="${esc(post.caption)}"><div class="sim-story-shade"></div><div class="sim-story-bars">${group.posts.map((_,i)=>`<span class="${i<idx?'done':i===idx?'current':''}"><i></i></span>`).join('')}</div><div class="sim-story-user">${avButton(current.id)}${handle(current.id)}<span class="sim-small">${esc(group.title)}</span><button class="sim-icon" data-action="story-pause" aria-label="${current.paused?'스토리 재생':'스토리 일시정지'}">${icon(current.paused?'play':'pause')}</button></div><button class="sim-story-prev" data-action="story-prev" aria-label="이전 스토리"></button><button class="sim-story-next" data-action="story-next" aria-label="다음 스토리"></button><div class="sim-story-caption">${esc(post.caption)}</div></div>`}
function dmView(){const id=current.id,p=profiles[id],blocked=!!store.blocked[id];const messages=store.messages[id]||[];return `<div class="sim-dm"><div class="sim-dm-profile">${av(id)}<b>${esc(p.handle)}</b></div><div class="sim-dm-messages">${messages.length?messages.map(m=>m.from==='system'?`<div class="sim-dm-notice" role="status">${esc(m.text)}</div>`:`<div class="sim-bubble ${m.from==='you'?'mine':'theirs'}"${m._tempId?` data-dm-temp="${esc(m._tempId)}"`:''}>${esc(m.text)}</div>`).join(''):`<div class="sim-empty">아직 메시지가 없어요</div>`}</div>${blocked?`<div class="sim-dm-block">${esc(p.name)}님이 회원님을 차단했습니다. 더 이상 메시지를 보낼 수 없습니다.</div>`:`<form id="simDmForm"><input name="message" maxlength="240" autocomplete="off" placeholder="메시지 보내기…" aria-label="DM 메시지"><button type="submit">보내기</button></form>`}</div>`}
// Fictional, rule-based DM. The two threads are independent; this is not a generative chatbot.
// User-initiated contact must not be interpreted as forgiveness, affection or a wish to reunite.
const dmReplySets={
 yul:{
  first:[
   '어? 너 여기로 연락했냐. 무슨 일인데.',
   '야, 네 이름 뜨길래 뭔가 했다. 할 말 있어?',
   '웬일이냐. 옆집에서 마주치는 것도 모자라서 DM까지?',
   '오, 너냐. 나 지금 작업 끝나고 폰 봤다.'
  ],
  greet:[
   '어, 너냐. 근데 왜 이렇게 얌전하게 인사하냐 ㅋㅋ',
   '안녕은 무슨. 옆집에서 보던 사람이면서.',
   '야, 웬일로 먼저 인사하냐. 수상하게.',
   '오, 살아 있네. 오늘 복도에선 안 마주쳤나 보다.',
   '어. 말해 봐. 오늘은 또 뭘로 시비 걸 건데.'
  ],
  reunion:[
   '뭐야, 갑자기 팔로우까지? 너도 참 뜬금없다 ㅋㅋ',
   '네 계정 뜨길래 순간 잘못 눌렀나 했다. 왜, 구경 왔냐?',
   '야, 내 인스타까지 찾아왔네. 뭐가 궁금한데.',
   '맞팔은 했지. 별 뜻까지 붙이진 마라.',
   '동생 얘기 말고 내 얘기 할 거면 해 봐.'
  ],
  meal:[
   '가게에서 김밥 하나 먹었어. 멀쩡하게 식사할 틈이 없네.',
   '아직. 씨​발, 부품 하나가 안 맞아서 밥 먹을 시간도 놓쳤다.',
   '먹었지. 너는 왜, 뭐 시킬 건데?',
   '방금 먹었다. 작업복에 국물 안 튄 게 다행이고.',
   '내 밥까지 챙기게? 야, 별일이네.'
  ],
  daily:[
   '지금 숍이야. 엔진 하나 끝내고 커피 마시는 중.',
   '퇴근했다. 집에 와서 헬멧부터 던져 놨고.',
   '아직 가게. 손에 기름 묻어서 폰 만지는 것도 귀찮네.',
   '오늘? 일했고, 바이크 탔고. 딱히 거창한 건 없어.',
   '집이지. 쉬는데 굳이 사람을 불러내고 싶진 않고.',
   '이제 집 들어왔어. 헬멧 정리하다가 폰 봤다.'
  ],
  workTime:[
   '퇴근 시간? 오늘은 부품 상태 봐야 알아. 정해 놓고 움직이는 타입이 아니라.',
   '지금 막 리프트 내렸다. 정리하고 나가면 되겠네.',
   '아직 멀었어. 씨​발, 손봤던 놈이 또 말썽이야.',
   '한 시간쯤 더 걸릴걸. 너한테 작업 보고까지 해야 하냐?',
   '끝나면 집에 가겠지. 오늘 밤엔 멀리 안 나간다.'
  ],
  work:[
   '바이크 한 대가 사람 미치게 한다. 그래도 이 일은 재밌어.',
   '그건 내가 손대야 돼. 직원한테 맡기기엔 좀 까다롭거든.',
   '작업할 땐 나름 성실하거든? 놀랍냐 ㅋㅋ',
   '오늘은 부품이 늦게 왔어. 일정 다 꼬여서 존나 귀찮네.',
   '손으로 만져 봐야 감이 오는 게 있어. 말로 설명하면 재미없고.',
   '가게 사장 노릇이 다 멋있을 것 같냐. 계산서 보고 있으면 한숨만 나온다.',
   '나 실력으로 먹고사는 사람이야. 그건 좀 믿어도 돼.'
  ],
  photo:[
   '야, 사진 구경은 실컷 했나 보네. 마음에 드는 게 있냐?',
   '그거 누가 찍어줬다. 내가 일부러 포즈 잡은 건 아니고.',
   '바이크 사진은 실제로 보면 훨씬 낫지.',
   '내 얼굴 얘기면 그만하고, 바이크 얘기면 들어준다 ㅋㅋ',
   '하트 눌렀던데. 별생각 없었다고 하면 더 웃기긴 하겠다.',
   '그 사진? 찍힌 날 가게에서 종일 시달렸어. 사진만 멀쩡하지.'
  ],
  love:[
   '야, 무슨 답이 나올 줄 알고 그걸 묻냐.',
   '그건 좀 다른 얘기지. 네가 듣고 싶은 답 정해 놓고 묻지 마.',
   '잠깐. 장난이면 적당히 해. 나 이런 거 장난으로 안 받아.',
   '마음이 생기면 생기는 거지. 지금 여기서 이름 붙일 생각은 없고.',
   '네가 좋다고 해서 내가 바로 착한 놈이 되는 건 아니거든.',
   '내가 여자 관계 복잡한 건 알잖아. 그거 모른 척하고 넘어갈 순 없어.',
   '씨​발, 그런 질문을 그렇게 불쑥 하냐. 나도 생각은 좀 해야지.',
   '설레는 말 기대하면 사람 잘못 골랐어. 내가 하는 말은 좀 삐딱하거든.'
  ],
  women:[
   '여자 만나는 거? 응. 안 숨겼잖아.',
   '내 일정 내가 잡아. 그렇다고 누구한테 거짓말하겠다는 소린 아니고.',
   '왜, 누구한테 무슨 얘기 들었는데. 사실이면 사실이라고 해 주지.',
   '씨​발, 무슨 취조받는 것 같네. 묻는 건 좋은데 몰아가진 마.',
   '만나는 사람이 있냐고? 무슨 뜻으로 묻는지부터 알아야겠는데.',
   '내가 가벼운 만남을 하는 건 사실이지. 그걸 근사하게 포장할 생각 없어.',
   '나도 내 말이 좀 재수 없다는 건 알아. 근데 거짓말하는 것보단 낫잖아.'
  ],
  brother:[
   '한이가 뭐라고 했는데? 아, 내가 대신 해명하겠다는 뜻은 아니다.',
   '형제라고 연애 상담까지 공유하는 사이인 줄 아냐.',
   '그 새끼가 또 혼자 결론부터 냈냐? …아니, 내가 모르는 일에 끼어들진 않을게.',
   '난 그놈이랑 방식부터 달라. 그렇다고 걔를 모르는 사람 취급할 순 없고.',
   '동생 일은 동생한테 물어. 나한테 답을 받아서 뭐 하게.',
   '한이랑 있었던 일은 나도 다 알지 못해. 아는 척할 생각 없고.'
  ],
  meet:[
   '언제? 나 시간표대로 사는 사람 아닌데, 일단 말은 해 봐.',
   '밥? 좋아. 근데 나 저녁엔 약속 잡혀 있을 수도 있어.',
   '집 앞이면 금방이지. 근데 뭐 하려고.',
   '가게로 올 거면 미리 얘기해. 정비할 땐 정신없어.',
   '야, 같이 나가자는 말을 그렇게 아무렇지도 않게 하냐 ㅋㅋ',
   '무턱대고 오라면 곤란해. 나도 사생활이라는 게 있으니까.'
  ],
  apology:[
   '됐다. 네 말이 무슨 뜻인진 알겠어.',
   '뭘 또 사과까지 해. 내가 그렇게 쪼잔한 놈으로 보이냐?',
   '오해였으면 됐어. 다음엔 말 좀 똑바로 하든가.',
   '야, 서로 한마디씩 한 걸로 끝내자. 더 길어지면 피곤해.',
   '그래. 알았어. 나도 말이 좀 거칠었지.'
  ],
  boundary:[
   '알았어. 더 안 건드린다.',
   '됐어, 싫다는데 내가 뭘 더 하겠냐.',
   '오케이. 여기까지만 하지.',
   '그래. 선은 알겠어. 대신 나도 할 말은 할 거야.'
  ],
  tease:[
   '야, 너 진짜 말 얄밉게 한다 ㅋㅋ',
   '아, 씨​발. 내가 또 말렸네. 웃기냐?',
   '너 지금 일부러 긁는 거지. 얼굴 보고 했으면 더 열받았겠다.',
   '내가 만만해 보이냐? 아니, 웃진 마.',
   '존나 신났네. 그렇게 웃긴 말은 아니었거든?',
   '아니, 잠깐만. 그건 내가 잘못한 게 아니잖아 ㅋㅋ',
   '시비는 네가 걸었는데 왜 나만 나쁜 놈 되냐.'
  ],
  ask:[
   '뭘 궁금해하는진 알겠는데, 그걸 왜 나한테 묻냐 ㅋㅋ',
   '어. 그건 얘기해 줄 수 있지.',
   '그거야 상황 봐야지. 내가 항상 같은 대답 하는 사람도 아니고.',
   '야, 질문이 되게 직설적이네. 싫단 소리는 아니다.',
   '나한테 물어봤으니 내가 아는 데까지만 말한다.'
  ],
  short:[
   '어. 읽었어.',
   '그래. 그 정도면 알아들었고.',
   '아니, 그건 좀 웃긴데.',
   '지금 말하는 거 듣고는 있어.',
   '응. 근데 난 그렇게 생각 안 하는데.'
  ],
  other:[
   '야, 그건 좀 의외다. 난 그렇게까지 생각 안 했어.',
   '뭐, 네 말도 일리는 있네. 인정하기 싫지만.',
   '그런 얘길 나한테 하네. 신기하긴 하다.',
   '아니, 그 부분은 내가 반박해도 되냐 ㅋㅋ',
   '그건 내 생각이랑 좀 달라. 그래서 재밌는 거고.',
   '씨​발, 사람 일이 꼭 계산대로 되진 않더라.',
   '어, 그건 네 말이 맞아. 딱 거기까지만 인정한다.',
   '내가 그 상황이면 그냥 나와 버렸을 것 같은데.',
   '그렇게까지 생각할 일인가 싶다가도, 신경 쓰이긴 하겠네.',
   '음. 그 얘기엔 나도 할 말이 좀 있지.'
  ]
 },
 han:{
  first:[
   '…네 이름이 뜨니까 순간 멈칫했어. 오랜만이야. 잘 지냈어?',
   '연락이 오네. 3개월 만이야. 사실 좀 놀랐어.',
   '…이렇게 다시 대화창을 열게 될 줄은 몰랐어. 무슨 일 있어?',
   '오랜만이네. 나도 모르게 메시지를 두 번 확인했어.'
  ],
  greet:[
   '안녕. …너한테 이 인사를 다시 하게 되네.',
   '응, 안녕. 오랜만이라 그런가, 무슨 말부터 해야 할지 모르겠다.',
   '너한테서 메시지 오니까 괜히 폰을 다시 보게 되네.',
   '응. 나야. 반말로 답해도 되지? …원래 그랬으니까.',
   '오랜만이야. 인사는 이렇게 짧은데 생각은 많아지네.'
  ],
  reunion:[
   '네가 다시 연락할 거라곤 생각 못 했어. 반가우면서도 좀 얼떨떨하다.',
   '네가 팔로우한 걸 보고 바로 눌러도 될지 잠깐 망설였어.',
   '그동안 서로 연락하지 않았는데, 이렇게 먼저 알림이 뜨네.',
   '갑자기 무슨 바람이냐고 묻고 싶었어. 그런데 그런 말부터 하면 또 내가 앞서가는 것 같아서.',
   '그냥 우연히 눌렀을 수도 있지. 알아. 그래도 나는 조금 놀랐어.',
   '너한테 대답할 기회가 생긴 건 반갑지만, 의미를 멋대로 붙이진 않을게.',
   '…팔로우 하나에 이렇게 말을 고르는 것도 참 나답다.'
  ],
  meal:[
   '아직 안 먹었어. 회의가 밀렸거든. 오늘은 간단히 먹으려고.',
   '먹었어. 너는? …습관적으로 물어보게 되네.',
   '오전에 바빠서 점심을 놓쳤어. 지금은 괜찮아.',
   '저녁은 먹었어. 예전처럼 네 식사까지 내가 정하진 않을게. 그냥 궁금해서 묻는 거야.',
   '이제 뭐라도 먹으려고. 별것도 아닌 얘기를 너랑 하니까 조금 낯설다.'
  ],
  daily:[
   '회사였어. 이제 막 나왔고. 너는 오늘 어땠어?',
   '지금 집이야. 하루 종일 회의였는데 이상하게 잠은 안 오네.',
   '퇴근했어. 너한테 이런 일상 얘기하는 게 꽤 오랜만이지.',
   '오늘은 일이 생각보다 일찍 끝났어. 네 메시지 볼 여유도 있고.',
   '별일 없었어. …이 말도 오랜만에 하네.',
   '지금 주차장에 차 세웠어. 좀 늦게 봤지.'
  ],
  work:[
   '브랜드 행사 마감했어. 결과는 괜찮았는데, 끝나니 좀 허탈하더라.',
   '회사 얘기라면 한참 할 수 있지. 네가 지겨워할지도 모르겠지만.',
   '회의에서 또 내가 먼저 결론을 냈어. 일할 땐 그게 필요할 때도 있거든. …사적인 관계에까지 그러면 안 됐지만.',
   '런칭 일정 때문에 정신없었어. 그래도 너한테 답할 시간은 내고 싶었고.',
   '오늘은 내가 담당한 캠페인 촬영이 있었어. 직접 보면 더 낫긴 해.',
   '그래, 일은 여전히 바빠. 그 핑계로 중요한 얘기를 미룰 생각은 없어.'
  ],
  photo:[
   '내 사진 봤구나. 너한테 보여주려고 올린 건 아니었는데, 보고 있으니 기분이 묘하네.',
   '그날은 행사가 늦게 끝났어. 사진은 멀쩡해 보여도 현장은 난리였지.',
   '그 사진에 네 이름이 뜬 건 좀 예상 밖이었어.',
   '어떤 사진이든 마음대로 봐. 내가 거기까지 의미를 정할 순 없으니까.',
   '내가 올려 놓고 네가 봤다는 사실에 놀라는 것도 이상하지.',
   '응. 그 컷은 내가 골랐어. 그래서 더 기억나네.'
  ],
  accountability:[
   '미안해. 네 말을 듣는 척하고 결국 내 결정을 밀어붙였어.',
   '그때는 내가 너를 위해서라고 생각했어. 그런데 네가 뭘 원하는지는 제대로 묻지도 않았지.',
   '네가 여러 번 말했잖아. 그때마다 고치겠다고 해 놓고 또 같은 방식으로 굴었어.',
   '미안하다고 한 번 말해서 끝날 일이 아니란 거 알아. 그냥 그 말을 피하고 싶진 않아.',
   '변명할 여지가 없는데도 설명부터 하고 싶어지는 게 내 나쁜 버릇이야.',
   '내가 아직 다 달라졌다고 장담하진 못해. 적어도 뭐가 문제였는지는 모른 척하지 않을 거야.'
  ],
  marriageListen:[
   '맞아. 선택지를 준다고 생각했는데, 내가 이미 답을 정해 둔 뒤였어.',
   '예식장이든 신혼집이든, 결정하는 과정부터 너랑 같이했어야 했지.',
   '네가 반대할 때 이유를 듣는 대신 더 설득하려고 했어. 그게 제일 잘못됐어.',
   '내가 너 대신 계산하고 예약하면 편할 줄 알았어. 불편한 건 그 과정에서 네 자리가 없었다는 거겠지.',
   '이번엔 듣고 싶어. 다만 네가 지금 대답해 줘야 한다고 생각하진 않아.'
  ],
  marriageFuture:[
   '다음엔 내가 예약부터 하지 않을 거야. 같이 알아보고, 네가 싫으면 멈추고.',
   '말로만 달라졌다고 하면 또 내가 편한 답을 강요하는 거겠지.',
   '결정을 빨리 내리는 것과 같이 내리는 건 다른 문제더라. 그걸 뒤늦게 알았어.',
   '지금 다시 결혼 얘기를 꺼내겠다는 뜻은 아니야. 너한테 선택을 재촉할 생각 없어.',
   '내가 할 수 있는 건 바뀐 행동을 보여주는 거야. 네가 확인할 의무는 없고.',
   '계획표 하나 짜서 해결할 수 있는 일이었으면 진작 해결했겠지. 나도 이제 알아.'
  ],
  marriage:[
   '예식장 계약부터 내가 먼저 밀어붙였지. 네 의견이 꼭 필요했던 일인데.',
   '그때 네가 화난 이유를 이해하지 못했어. 나는 잘 준비하고 있다고 믿었거든.',
   '우리 3년이 전부 나빴던 건 아니잖아. 그래서 마지막이 더 아프게 남는 것 같아.',
   '같이 결혼하려던 건데 혼자 준비하는 사람처럼 굴었어. 그건 내 잘못이야.',
   '내가 네 몫까지 책임지려던 게 결국 네 선택을 뺏는 일이 됐어.',
   '파혼했다는 사실은 알고 있어. 그걸 네 마음이 아직 내게 있다고 해석하지도 않을 거고.',
   '솔직히 아직도 가끔은 내가 다 잘하려고 했던 건데, 싶어. …그게 문제라는 것도 알아.'
  ],
  currentLove:[
   '응. 아직 좋아해. 이렇게 물으면 나도 더는 둘러댈 수가 없네.',
   '…좋아해. 지금도. 다만 네가 다시 돌아와야 한다는 뜻은 아니야.',
   '아직 마음이 있어. 그걸 말하는 게 네게 부담이 될까 봐 조심스러웠어.',
   '나한텐 아직 끝나지 않은 마음이 있어. 네 마음까지 내가 정할 순 없지만.'
  ],
  miss:[
   '…나도 보고 싶었어. 그 말을 먼저 할 용기가 없었던 거지.',
   '보고 싶었지. 세 달이나 지났는데도 이 말은 쉽게 나오네.',
   '응, 나도. 그런데 그걸 핑계로 너한테 연락할 자격이 있나 싶었어.',
   '나도 보고 싶어. 그걸 인정하면 좀 더 복잡해질 줄 알아서 입을 다물었지.'
  ],
  stiff:[
   '…그러게. 너랑 얘기하면서도 꼭 회의하듯 말하네. 미안.',
   '아, 좀 웃기다. 3년을 만났는데 지금 와서 내가 면접 보듯 대답하고 있네.',
   '너한테까지 말 하나하나 계산하고 있었네. 그냥 평소처럼 얘기할게.',
   '그건 인정. 내 말투가 또 딱딱해졌어. 너 앞에선 좀 덜 그래도 되는데.'
  ],
  love:[
   '미련이 있냐고? 있어. 없다고 말하면 거짓말이지.',
   '우리 사이를 내가 멋대로 현재진행형이라고 할 순 없어. 난 아직 마음이 남아 있지만.',
   '네가 보고 싶다는 말을 들으면 흔들리지 않는 척하기 어렵지.',
   '우리가 행복했던 시간도 진짜였어. 그걸 내 잘못 때문에 지우고 싶진 않아.',
   '널 좋아했냐는 질문엔 주저할 이유 없어. 사랑했어. 그 뒤가 문제였지.',
   '솔직히 다시 잘해 보고 싶은 마음도 있어. 그걸 네게 요구할 권리는 없다는 것도 알고.',
   '…나는 아직 너한테 아무렇지 않은 척이 잘 안 돼.',
   '그 말을 하면서도 네 반응부터 예상하려고 드는 내가 좀 웃기네.'
  ],
  women:[
   '다른 사람이 생겼냐는 거야? 네가 왜 궁금한지는 캐묻지 않을게. 아는 사실대로 말할게.',
   '그 얘기는 오해 없이 하고 싶어. 정확히 뭘 물은 건지 말해 줘.',
   '파혼이 다른 사람 때문이었다고 생각하진 않았으면 해. 그건 사실이 아니니까.',
   '너랑 헤어진 이유를 다른 여자 핑계로 돌리고 싶진 않아.'
  ],
  brother:[
   '형이랑 얘기했어? …아니, 어디까지 얘기했는지 캐묻진 않을게.',
   '형은 원래 그런 사람이야. 그렇다고 내가 형을 핑계 삼을 생각은 없어.',
   '솔직히 형 얘기 들으니 신경 쓰이긴 해. 그래도 네가 내게 보고할 일은 아니지.',
   '형이랑 나는 많이 달라. 그리고 그게 꼭 누가 더 낫다는 뜻은 아니고.',
   '우리 사이에 있었던 일까지 형이 대신 해결할 수는 없어. 그건 나와 너의 문제였으니까.'
  ],
  meet:[
   '보고 싶어. 그렇다고 네가 원하지 않는데 갑자기 찾아가진 않을게.',
   '시간을 맞출 수 있어. 이번엔 장소부터 내 마음대로 정하지 않을 거고.',
   '커피 한 잔이라도 좋지. 그런데 네가 정말 괜찮을 때.',
   '너랑 마주 앉아서 얘기하면 지금보다 덜 서툴 수 있을까 싶어.',
   '무슨 말을 하든 얼굴 보고 듣고 싶은 건 사실이야. 서두르진 않을게.'
  ],
  apology:[
   '네가 사과할 일로만 보이진 않아. 나도 내 태도를 알아.',
   '괜찮아. 이렇게 말해 줘서 고마워.',
   '우리 대화가 깔끔하게 끝날 거라고 기대하진 않았어.',
   '오해한 부분이면 풀면 돼. 난 그 얘기를 피하고 싶진 않아.'
  ],
  boundary:[
   '알겠어. 더 붙잡지 않을게.',
   '응. 네가 그만하자면 여기까지만 하자.',
   '싫다고 했는데 또 설득하면 같은 실수를 하는 거니까.',
   '그래. 네 말대로 할게. 답장하지 않아도 괜찮아.'
  ],
  tease:[
   '너랑 말싸움하던 감각은 안 잊어버렸나 봐.',
   '그거 일부러 그러는 거지. …알면서도 걸려드네.',
   '어, 그건 좀 아픈데. 반박할 말이 없네.',
   '내가 그렇게 얄미웠어? 아니, 대답은 알고 있는 것 같기도 하고.',
   '잠깐, 그 논리는 좀 불공평한데. 내가 따지는 버릇 있는 거 알잖아.',
   '웃기네. 너한테만큼은 늘 말이 뜻대로 안 돼.'
  ],
  ask:[
   '그건 네가 묻는 방식대로 대답해 볼게. 변명은 안 하고.',
   '응, 물어봐. 내가 모르는 건 모른다고 할게.',
   '그건 단정하지 않을게. 내가 또 혼자 결론 내리면 안 되니까.',
   '내 대답이 마음에 들지 않을 수도 있지. 그래도 사실대로 말할게.',
   '그 질문은 예상 못 했어. 잠깐 생각할게.'
  ],
  short:[
   '응. 듣고 있어.',
   '그래. 그 말은 알겠어.',
   '…그렇게 말하니까 나도 대답을 고르게 되네.',
   '알았어. 억지로 결론 내리진 말자.',
   '음. 그건 조금 생각해 볼게.'
  ],
  other:[
   '너랑 이런 소소한 얘기를 다시 하니까 조금 이상하네. 싫다는 건 아니고.',
   '그렇게 생각할 수도 있겠다. 예전 같으면 나부터 설명했겠지.',
   '나도 할 말은 있는데, 네 얘기를 끊고 싶진 않아.',
   '응. 그 부분은 나도 다르게 생각했어. 서로 얘기해 볼 순 있겠네.',
   '그 얘기 듣고 옛날 생각이 좀 났어. 구체적인 건 말하지 않을게.',
   '내가 또 정답부터 말하려 했네. 미안. 그냥 얘기하고 싶었던 거지.',
   '그렇구나. 당연하게 넘어갈 얘긴 아닌 것 같아.',
   '…잠깐 웃었어. 너랑 말하는 게 오랜만이라.',
   '그건 나도 예상 못 한 얘기야. 좀 솔직해져도 될까.',
   '응. 대충 넘기고 싶진 않아.'
  ]
 }
};
// Brief follow-ups progress the current topic instead of jumping to an unrelated greeting or stock question.
const dmFollowups={
 yul:{
  affectionQuestionLike:['왜긴. 내가 한이 형이라는 건 안 변하잖아. …근데 네 질문을 그냥 씹기도 싫으니까. 씨\u200b발, 됐다.', '그걸 좋아한다, 아니다 두 글자로만 정리하면 끝이냐? 야, 우리 사정 그렇게 간단하지 않아.'],
  affectionQuestionLove:['내가 너랑 그런 말을 한 적부터 없잖아. …아 씨\u200b발, 질문을 해도 꼭 사람 난처한 것만 골라 하냐.', '사랑한다는 말을 지금 여기서 던지면 간단하긴 하겠지. 근데 그다음은? 난 입만 산 놈 되긴 싫어.'],
  affectionLike:['야, 당연히 놀랐지. 우리 사이가 그렇게 간단하냐.', '…좋아한다는 말은 들었어. 나도 좀 생각하게 되잖아, 씨​발.', '아니. 싫다는 소리는 아니라고. 왜 자꾸 사람 말 꼬이게 하냐 ㅋㅋ'],
  affectionLove:['왜긴. 사랑한다는 말을 듣고 멀쩡하면 그게 더 이상한 거지.', '야, 그 말은 장난으로 주고받기 싫어. 내 방식대로 대답할 테니까.', '…씨​발, 안 피한다니까. 얼굴 보고 하자는 뜻이지 네가 당장 와야 된단 얘긴 아니고.'],
  reunion:['왜긴, 네 계정이 갑자기 떴으니까 그렇지. 별일이라도 있냐고.', '팔로우했다길래 그냥 맞팔했지. 그 이상을 내가 어떻게 알아.', '아, 내가 너무 호들갑 떨었냐? 아니면 말고 ㅋㅋ'],
  photo:['사진엔 별 뜻 없다니까. 관심 있으면 가게 와서 실제로 봐.', '하트는 네가 눌렀잖아. 내가 물어보면 안 되냐 ㅋㅋ', '어, 이건 내가 잘 나오긴 했네. 젠장, 말해 놓고 좀 민망한데.'],
  work:['그 부품 말이야. 오늘 내내 말썽이었는데 결국 고쳤어.', '내 일은 내가 알아서 하지. 너한테 투덜거릴 순 있잖아.', '끝나면 잊어버려. 그래서 이 일이 좋아.'],
  women:['아, 씨​발. 그래서 내가 누구를 만났는지 묻는 거냐, 왜.', '없던 일이라고 하진 않을게. 그렇다고 네가 상상하는 걸 전부 사실이라고 할 수도 없고.', '내가 내 선택을 숨기지 않는 거랑 네가 그걸 좋아해야 한다는 건 별개지.'],
  love:['왜? 나도 네가 뭘 묻는지 생각은 해야지.', '말을 뱉으면 책임질 일도 생기잖아. 무턱대고 달콤한 소리 할 생각 없어.', '네가 듣고 싶은 답 정해 놓고 묻지 마. 진짜 내 생각이 궁금하면 기다려.'],
  brother:['그놈이 무슨 말을 했든 난 직접 들은 것만 알아.', '한이가 내 동생인 건 변하지 않아. 그래도 걔랑 네 일까지 대신 결정하진 않지.', '나도 마음에 안 드는 구석은 있지. 형제라는 게 다 그렇잖아.'],
  meet:['못 만난단 말은 안 했어. 일단 내 작업 끝나는 건 봐야지.', '성수동에서 거창하게 갈 데도 없는데, 왜. 근처에서 볼까.', '약속은 말로만 해 두면 꼬이더라. 날짜만 먼저 맞춰 봐.'],
  daily:['하루가 뭐 별거 있냐. 그래도 지금은 쉬는 중이다.', '내일은 가게부터 가야지. 할 일 많아.', '다음엔 복도에서 마주치면 직접 물어봐. ㅋㅋ'],
  tease:['야, 그건 인정 못 한다. 나도 억울하거든.', '아, 씨​발. 너랑 말싸움하면 꼭 이런 식이다.', '그만 웃어, 진짜. 나 지금 웃기려고 한 말 아니거든.'],
  other:['그렇게 말하니까 내가 좀 이상해지네.', '나도 할 말 많은데, 여기선 짧게 하자.', '그거, 네 생각이야. 내 생각은 좀 달라.']
 },
 han:{
  affectionQuestionLike:['왜냐면 아직 마음이 남았으니까. 그게 네 마음까지 안다는 뜻은 아니고.', '우리 3년을 거짓말처럼 지울 수는 없었어. …네가 그걸 물어보니까 기쁘고 좀 아프네.'],
  affectionQuestionLove:['사랑해. 그래도 파혼은 내 잘못 때문에 일어난 일이고, 네가 나를 받아줘야 한다는 말은 아니야.', '응. 사랑해. 그렇지만 이번엔 사랑한단 말로 네 선택을 대신하진 않을게.'],
  affectionLike:['왜냐면 내가 아직 널 좋아하니까. 그걸 숨겨 봐야 뭐가 달라지겠어.', '그래도 우리가 준비했던 결혼이 왜 끝났는지는 잊지 않았어.', '네가 좋아한다고 해서 내가 또 결론부터 정해도 된다는 뜻은 아니잖아.'],
  affectionLove:['당장 보러 가고 싶은 건 사실이야. 그런데 네가 원하지 않으면 안 가.', '…나도 사랑해. 그렇다고 네가 나를 용서했다는 뜻으로 받아들이진 않을게.', '왜 망설이냐고? 예전처럼 또 내 마음부터 앞세우기 싫어서.'],
  reunion:['왜냐면 우리 헤어진 뒤로 네 이름이 이렇게 뜰 줄은 몰랐거든.', '연락이 싫었다는 뜻이 아니야. 그냥 예상하지 못했어.', '네가 아무 의미 없이 눌렀을 수도 있다는 거 알아. 내가 앞서 해석하진 않을게.', '3개월이 짧진 않잖아. 괜히 멀쩡한 척하기가 어렵네.'],
  photo:['사진 때문만은 아니야. 네 이름이 같이 떠서 그랬어.', '그날 업무는 잘 끝났어. 그 얘길 너한테 다시 하게 될 줄은 몰랐네.', '너한테 보여 주려던 사진은 아니었어. 그래도 네가 봤다는 건 알아.'],
  marriage:['그때 가장 중요한 걸 빼먹었지. 네 의견을 먼저 듣는 일.', '우리가 결혼하려던 건 둘이었는데, 결정하는 사람은 나 하나였어.', '그 일로 네가 파혼을 선택했단 걸 받아들여야 한다고 생각해.', '잘해 주고 싶었다는 말로 내 독단을 정당화하진 않을게.'],
  marriageListen:['네가 말한 뒤에라도 멈춰야 했어. 난 듣지 않았지.', '내가 틀릴 수 있다는 생각을 결혼 앞에서 더 못 했어.', '지금이라도 듣는 척만 하게 된다면 그건 더 나쁜 일이고.'],
  marriageFuture:['약속으로 끝내지 않을 거야. 행동이 달라야겠지.', '내가 바뀌어도 네가 돌아와야 할 이유가 되는 건 아니야.', '다음이라는 걸 네가 허락한 적도 없는데 내가 정할 순 없지.'],
  accountability:['맞아. 내가 너를 배려한다면서 내 방식을 강요했지.', '사과가 너무 늦었다는 말도 할 수 있겠지. 그건 내가 감수할게.', '우리 3년을 가볍게 여기지 않아서 더 변명하고 싶지 않아.'],
  currentLove:['왜냐면 아직 좋아하니까. 그게 전부야.', '나도 이 마음을 다 정리할 수 있을 줄 알았어. 잘 안 되더라.', '그렇다고 네 대답을 요구하는 건 아니야.'],
  miss:['네가 보고 싶었다고 하니까 기쁘면서도 좀 미안하네.', '먼저 보고 싶다고 말하면 널 또 붙잡는 거라고 생각했어.', '지금 그 말을 들으니 더 만나고 싶어졌어.'],
  stiff:['그래. 내 말투가 좀 그랬지. 긴장해서 그래.', '네 앞에서까지 꼭 맞는 답을 찾으려고 드는 게 나답네.', '일 얘기 아니잖아. 다시 편하게 말할게.'],
  love:['왜냐고 하면… 아직 좋아하니까. 쉽게 없던 일이 되진 않아.', '네가 원하는 답을 고르라는 말이 아니야. 내 마음을 묻길래 대답한 거야.', '그렇다고 네가 돌아와야 한다고 생각하는 건 아니야.', '다시 만나고 싶은 마음이 있다고 해서 우리가 준비가 됐다는 뜻은 아니겠지.'],
  brother:['형의 행동까지 내가 아는 건 아니야. 함부로 말하지 않을게.', '신경 안 쓰인다고 하면 거짓말이지. 그래도 너한테 확인받을 자격이 있는 건 아니고.', '형에 대한 내 생각과 네가 형을 어떻게 생각하는지는 다른 문제야.'],
  meet:['만나고 싶지. 하지만 나 때문에 불편한 자리는 만들고 싶지 않아.', '내가 먼저 예약하지 말라는 소리, 이제는 알아들어.', '지금 네가 괜찮다고 하면, 어디서 볼지부터 같이 정하자.'],
  daily:['이런 얘기 오래간만이다. 별일 없는 하루도 네가 묻네.', '업무는 끝났어. 너와 할 얘기가 남아 있을 줄은 몰랐는데.', '아니. 답장하는 건 귀찮지 않아.'],
  tease:['그건 좀 불공평해. 웃기긴 하지만.', '너한테 변명하려고 말을 길게 하는 버릇, 아직 못 고쳤네.', '…그래. 이번엔 네 말이 맞아. 얄밉게도.'],
  other:['그 말은 내가 생각한 방향과 다르네. 그렇다고 틀렸다는 건 아니고.', '응. 네가 그렇게 말하니까 이제야 이해되는 부분이 있어.', '나도 조심스럽네. 너무 많은 말을 해 버릴까 봐.']
 }
};
const normDM=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[\s.,!?~…·:;"'`]+/g,'');
function dmIntent(text,id,lastTopic){
 const t=normDM(text);
 if(/그만해|연락하지마|더이상연락|꺼져|차단해|대화그만|말걸지마|이제됐어|^됐어$/.test(t))return 'boundary';
 if(/^(미안|내가미안|내잘못|죄송|사과할게)/.test(t))return 'apology';
 if(id==='han'){
  if(/딱딱|사무적|업무처럼|회사사람|면접|말투|너무정중|로봇같/.test(t))return 'stiff';
  if(/보고싶|보고싶었|보고싶냐|보고싶니/.test(t))return 'miss';
  if(/아직.*(좋아|사랑|마음|미련)|지금도.*(좋아|사랑|마음)|나.*(좋아해|사랑해)[?]?|미련남아/.test(t))return 'currentLove';
  if(/의견|선택권|왜내말|내말은|내말을|내얘기|내생각|들어줄|들어본|내가말했|상의안|고르라고/.test(t))return 'marriageListen';
  if(/다음엔|앞으로어떻게|어떻게바뀔|뭐가달라|뭘바꿀|다시그러면|다시만나면어떻게/.test(t))return 'marriageFuture';
  if(/미안하긴|사과|잘못|반성|후회|변명|뭘잘못|왜그랬|책임|진심으로미안/.test(t))return 'accountability';
  if(/결혼|파혼|혼수|식장|신혼집|약혼|독단|결정권|혼자결정|혼자정하|합의|헤어진이유/.test(t))return 'marriage';
  if(/3개월|삼개월|몇달|오랜만|헤어진지|헤어진뒤|맞팔|팔로우|팔로잉|댓글|갑자기연락|왜연락|잊었|다시연락/.test(t))return 'reunion';
 }
 if(/전한|전율|형|동생|오빠동생/.test(t))return 'brother';
 if(/여자|다른사람|원나잇|바람|만나는사람|데이트상대|다른남자|다른여자/.test(t))return 'women';
 if(/사랑|보고싶|좋아해|좋아하|연애|키스|설레|미련|재결합|다시사귀|나한테마음|나를좋아/.test(t))return 'love';
 if(/퇴근|몇시에끝|언제끝|늦게까지/.test(t)&&id==='yul')return 'workTime';
 if(/커스텀|엔진|정비|바이크|부품|작업|회사|퇴근|회의|행사|런칭|일해|바쁘|가게|출근|직업/.test(t))return 'work';
 if(/사진|하트|좋아요|피드|게시물|포스트|인스타|스토리/.test(t))return 'photo';
 if(/만나|같이밥|밥먹자|커피마시자|약속잡|시간돼|놀자|올래|갈래|보자|볼래/.test(t))return 'meet';
 if(/식사|밥|저녁먹|아침먹|점심먹|먹었어|먹었니|배고파/.test(t))return 'meal';
 if(/뭐해|오늘|지금|잘잤|자고|집에|집이야|일상|근황/.test(t))return 'daily';
 if(/ㅋㅋ|ㅎㅎ|장난|놀려|시비|웃기|바보|재수없|웃겨|미쳤|놀리는/.test(t))return 'tease';
 if(/^(안녕|하이|ㅎㅇ|오랜만이야|잘지내)/.test(t))return 'greet';
 if(/^(왜|어째서|진짜|그래서|뭐가|그게다야|정말|응|어|그래|ㅇㅇ|아니|흠|음|헐|뭐)$/.test(t))return 'followup';
 if(t.length<4)return 'short';
 if(/왜|뭐|언제|어디|누구|어떻게|가능|알아|궁금|\?/.test(text))return 'ask';
 return 'other';
}
function dmMeta(id){
 return store.dmMeta[id]||(store.dmMeta[id]={turn:0,lastTopic:'',lastInput:'',pressure:0,warned:false,used:{},recent:[],exhausted:{},lastSignal:'',calm:0});
}
function dmFresh(id,topic,meta,input,{followup=false}={}){
 const key=(followup?'follow:':'')+topic;
 const choices=(followup?dmFollowups[id]?.[topic]:dmReplySets[id]?.[topic])||[];
 if(!choices.length)return null;
 const seen=meta.used[key]||(meta.used[key]=[]);
 // Never cycle back into already-used copy when a conversation is long.
 const available=choices.filter(line=>!seen.includes(line)&&!meta.recent.includes(line));
 if(!available.length)return null;
 let hash=meta.turn*131+(id==='han'?61:37);
 for(const ch of input)hash=(Math.imul(hash,33)+ch.charCodeAt(0))>>>0;
 const line=available[hash%available.length];
 seen.push(line);meta.recent.push(line);meta.recent=meta.recent.slice(-12);
 return line;
}
function dmCloseTopic(id,meta,topic){
 const key='closed:'+topic;
 if(meta.exhausted[key])return null;
 meta.exhausted[key]=true;
 const answers={
  yul:{love:'야, 같은 말을 돌려서 해 봐야 내 대답은 지금 여기까지야.',other:'이 얘긴 여기서 접자. 나도 더 붙일 말은 없네.',reunion:'팔로우 얘기는 됐어. 나도 더 해 줄 말 없다.'},
  han:{love:'내 마음은 말했어. 같은 질문에 다른 답을 꾸며 내고 싶진 않아.',marriage:'그때 일에 관해선 내 잘못을 인정해. 똑같은 말로 덮고 싶지 않아.',reunion:'네가 연락한 것에 의미를 단정하지 않을게. 그 얘긴 여기까지 하자.',other:'이 부분은 더 같은 말을 반복하고 싶지 않아. 여기까지만 말할게.'}
 };
 return answers[id][topic]||(id==='yul'?'그 얘기는 여기까지 하자. 나도 같은 말 계속하긴 싫어.':'이 얘긴 여기까지 할게. 지금은 더 붙일 말이 없어.');
}
// A question about feelings must NEVER be counted as U confessing.
// Query terms and exact confession words share an input box, not a trigger.
function dmAffectionSignal(text){
 const plain=String(text||'').normalize('NFKC').replace(/\u200b/g,'').trim();
 const compact=normDM(plain).replace(/\u200b/g,'');
 // Recognize informal Korean interrogatives BEFORE checking for a confession.
 // A trailing question mark is optional in DM: "나좋아하냐구", "사랑하냐고", etc.
 const likeForm=/(?:좋아해|좋아하(?:냐|니|나요|나|는(?:거|건|지)|긴해))/;
 const loveForm=/(?:사랑해|사랑하(?:냐|니|나요|나|는(?:거|건|지)|긴해))/;
 const like=likeForm.test(compact),love=loveForm.test(compact);
 if(!like&&!love)return null;
 const both=like&&love;
 // Quoting the word, ordering someone to say it, or discussing the term isn't a declaration.
 if(/(?:사랑해|좋아해)(?:라고|라는|란|라며|그말|이란|해달|해줘|해봐|해야|도돼|도될까|주면)/.test(compact))return null;
 const explicitQuestion=/[?？]/.test(plain);
 const questionGrammar=/(?:좋아|사랑)하(?:냐|니|나요|나(?:요)?|는(?:거|건|지)|긴(?:하냐|하니))/.test(compact);
 const questionTail=/(?:좋아해|사랑해)(?:요)?(?:맞지|맞아|그치|냐|니|나|까|는거야|는거지)/.test(compact);
 // "나 좋아해" (you like me?) differs from "나 너 좋아해" (I like you).
 const receiverQuestion=/(?:^|오빠|형|너|넌|네가|니가|전율|전한)(?:는)?(?:나|날|나를|저|저를)(?:좋아해|사랑해)(?:요)?$/.test(compact)
   ||/(?:오빠|형|너|넌|네가|니가|전율|전한)(?:는)?(?:나|날|나를|저|저를)(?:좋아해|사랑해)/.test(compact);
 if(explicitQuestion||questionGrammar||questionTail||receiverQuestion){
   return {mode:'question',kind:love?'love':'like',both};
 }
 // The counter only grows for an actual, affirmative declaration by U.
 if(/(?:안사랑해|안좋아해|사랑안해|좋아안해|사랑하지않|좋아하지않|사랑못해|좋아하지못|사랑해본|좋아해본|사랑했었|좋아했었)/.test(compact))return null;
 if(/(?:답장해|대답해|왜무시|당장|강제로|무조건|반드시대답)/.test(compact))return null;
 const likeCount=(compact.match(/좋아해/g)||[]).length;
 const loveCount=(compact.match(/사랑해/g)||[]).length;
 // "좋아하냐고" etc. never adds even one declaration to the counter.
 // "좋아하긴 해" is an admission, unlike "좋아하긴 해?".
 const likeAdmit=likeCount===0&&/(?:좋아하긴해)$/.test(compact)?1:0;
 const loveAdmit=loveCount===0&&/(?:사랑하긴해)$/.test(compact)?1:0;
 if(likeCount+loveCount+likeAdmit+loveAdmit===0)return null;
 return {mode:'confession',kind:love?'love':'like',both,
   likeCount:Math.min(likeCount+likeAdmit,4),loveCount:Math.min(loveCount+loveAdmit,4)};
}
const dmAffectionQuestionLines={
 yul:{
  like:[
   '야, 잠깐. 지금 그걸 나한테 묻는 거냐? …너 얼마 전까지 내 동생이랑 결혼 준비하던 사람이잖아. 씨\u200b발, 나보고 뭐라고 답하라고.',
   '신경이 아예 안 쓰이는 건 아니지. 근데 그게 곧장 좋아한다는 대답은 아니잖아.',
   '이 DM에 답한다고 좋아한다는 뜻은 아니거든. …아, 씨\u200b발. 그렇다고 싫다는 말도 아니고.',
   '궁금하긴 해. 그건 인정. 근데 네가 한이랑 파혼했다고 내가 바로 들이대면 그게 더 웃긴 꼴 아니냐?'
  ],
  love:[
   '사랑? 야, 나랑 네가 그런 말 주고받던 사이였냐? 게다가 네 전남친이 내 동생이잖아. …씨\u200b발, 질문 한번 거창하네.',
   '내가 좋다는 말도 제대로 안 했는데 사랑부터 확인하냐? 야, 순서가 아주 개판이네.',
   '한이한테는 오빠고 너한테는 전남친 형인데, 사랑이란 말이 그렇게 쉽게 나오겠냐. …아, 훈계하는 건 아니고.',
   '내가 사랑한다는 말 함부로 안 하는 건 알겠지. 네가 무슨 말을 하는지도 모르는 척 안 할 거고.'
  ],
  both:[
   '좋아하냐, 사랑하냐 한꺼번에? …야, 내 동생 전 약혼자가 나한테 질문 한 번 화끈하게 하네. 씨\u200b발.',
   '좋아한다는 말도 함부로 못 하겠는데 사랑까지? 야, 나 진짜 쉽게 넘어갈 놈 아니야.'
  ],
  likeAfter:[
   '네가 내 머릿속에 남는 건 사실이야. 근데 한이랑 네가 있었던 일까지 없는 셈 치진 못하잖아.',
   '자꾸 물으니까 나도 대답을 골라야 하잖아. …아 씨\u200b발. 이렇게 골치 아픈 건 처음이네.'
  ],
  loveAfter:[
   '네가 무슨 말을 한 건지 나도 알아들었어. 그렇다고 지금 사랑한다고 쉽게 맞받아칠 순 없지.',
   '…씨\u200b발, 그 말 가볍게 들을 생각은 없어. 내가 누구 형인지도 안 까먹었고.'
  ]
 },
 han:{
  like:[
   '응. 아직 좋아해. 3개월 지났다고 3년의 마음이 거짓말처럼 사라지진 않더라.',
   '좋아해. 지금도. 다만 내가 여전히 좋아한다는 게 네가 돌아와야 한다는 뜻은 아니야.',
   '너 좋아해. 너랑 얘기하니까 자꾸 예전처럼 대답하고 싶어지네.',
   '응. 좋아해. 네 마음을 멋대로 짐작할 순 없어도 내 마음까지 모른 척하긴 싫어.'
  ],
  love:[
   '응, 아직 사랑해. 세 달 동안 아니라고 해 보려 했는데, 거짓말이 안 되더라.',
   '사랑해. 지금도. 하지만 그 말 하나로 결혼 준비 때 내가 저지른 잘못이 없어지는 건 아니잖아.',
   '…사랑하지 않는다고는 못 해. 정말 사랑했으니까, 지금도 이렇게 흔들리는 거야.',
   '응, 사랑해. 그렇다고 다시 만나자고 내 마음대로 결론 내리진 않을게.'
  ],
  both:[
   '둘 다. 좋아하고, 아직 사랑해. 우리가 왜 헤어졌는지도 잊지 않았고.',
   '좋아해. 사랑해. 네가 물었으니까 솔직히 말할게. 하지만 네 선택까지 내가 정하려는 건 아니야.'
  ],
  likeAfter:[
   '네가 몇 번 확인해도 답은 같아. 아직 좋아해. 그게 네게 부담이 될까 봐 말을 아낀 거야.',
   '좋아해. 이걸 계획표처럼 정리할 수 있다면 차라리 쉬웠겠지.'
  ],
  loveAfter:[
   '그 말을 다시 듣게 돼도 답은 같아. 사랑해. 그런데 네게 그 말을 믿으라고 강요하진 않을게.',
   '응, 사랑해. 우리가 함께 하려던 결혼 준비가 왜 끝났는지도 알아. 그래서 더 쉽게 말할 수 없었어.'
  ]
 }
};
function dmAffectionQuestionScene(id,meta,signal){
 const state=meta.affection||(meta.affection={like:0,love:0,likePeak:false,lovePeak:false,postLike:0,postLove:0,warning:null,streak:0});
 // A real question interrupts a confession barrage. The number of past confessions persists.
 state.streak=0;state.warning=null;
 const bank=dmAffectionQuestionLines[id];
 const key=signal.both?'both':signal.kind;
 const phase=(signal.kind==='love'&&state.lovePeak)||(signal.kind==='like'&&state.likePeak)?'After':'';
 const answers=bank[signal.both?'both':key+phase]||bank[key];
 const useKey='affectionQuestion:'+key+(signal.both?'':phase);
 const seen=meta.used[useKey]||(meta.used[useKey]=[]);
 // Exhaust question copy rather than returning to an earlier line in a loop.
 // Mention the ex-fiancée / brother connection when it matters, not in every consecutive DM.
 const fresh=answers.filter(x=>!seen.includes(x));
 const recentBrother=id==='yul' && Number.isInteger(meta.yulBrotherMentionTurn) && meta.turn-meta.yulBrotherMentionTurn<=4;
 const next=(recentBrother?fresh.find(x=>!/(동생|전남친|전 약혼자|한이)/.test(x)):null)||fresh[0];
 if(next){
  if(id==='yul'&&/(동생|전남친|전 약혼자|한이)/.test(next))meta.yulBrotherMentionTurn=meta.turn;
  seen.push(next);meta.recent.push(next);meta.recent=meta.recent.slice(-12);return next;
 }
 const endKey='affectionQuestionEnd:'+key+phase;
 if(!meta.exhausted[endKey]){
   meta.exhausted[endKey]=true;
   return id==='yul'?'야, 똑같이 물어도 내 대답은 안 변해. 진짜 달라지면 내가 먼저 말할게.':'내가 했던 말은 진심이야. 같은 질문에 다른 대답을 꾸며 내진 않을게.';
 }
 return null;
}
const dmConfessionLines={
 yul:{
  like:[
   '야, 너 지금 나 좋다고 한 거냐? …내가 누구 형인지 까먹었냐. 씨\u200b발, 말 한번 세게 던지네.',
   '좋아한다는 말 두 번째다. 씨​발, 나 세는 사람 아닌데 왜 세고 있냐.',
  ],
  likePeak:[
   '잠깐. 너 지금 세 번째 좋아한다고 한 거 알고 있냐?',
   '…아 씨​발. 나도 모르게 웃었네. 웃기다고 한 거 아니야. 오해하지 마.',
  ],
  likeAfter:[
   '너 진짜 사람 신경 쓰이게 하는 데 도가 텄다. …나도 장난으로만 듣고 있는 건 아니거든.',
   '야, 자꾸 그렇게 말하면 복도에서 얼굴 보기 더 이상해지잖아. 아니, 싫다는 소린 아니고.',
   '좋아한다는 건 알아들었어. 내 대답까지 네가 정하진 말고. 나도 좀 생각할 테니까.'
  ],
  firstLikeAfterLove:'사랑한다더니 다시 좋아해냐. 수위 조절하는 거야? …씨​발, 내가 왜 긴장하고 있지. ㅋㅋ',
  love:[
   '……뭐? 나한테 사랑한다고? 야, 내가 네 전남친 형인 건 알고 하는 소리지. …씨\u200b발, 웃을 일이 아닌데.',
   '또 사랑한다고? 아 씨​발, 네가 그 말 반복한다고 내가 쉽게 받아칠 수 있는 사이는 아니잖아.',
   '나 지금 네 DM만 몇 번을 다시 읽는 줄 아냐. …웃지 마. 안 웃었으면 됐고.',
  ],
  firstLoveAfterLike:'좋아한다더니 이제 사랑한다고? 야, 단계를 그렇게 훅 뛰면 내가 뭘 어쩌냐. 씨​발.',
  bothFirst:'야, 좋아해에서 사랑해까지 한 줄로 가냐. 내가 누구 형인지 알지? …씨​발, 진짜 간도 크다.',
  lovePeak:[
   {from:'them',text:'…너 그 말 자꾸 보내면 나 진짜 더는 모른 척 못 한다.',deleteAfter:3000,replaceText:'전율님이 메시지를 삭제했습니다.'},
   '아, 씨​발. …이건 DM으로 못 하겠다. 나중에 얼굴 보고 얘기해.'
  ],
  loveAfter:[
   '야. 내가 방금 한 말, 장난 아니야. …너 자꾸 이러면 나도 입만 살아 있는 놈 못 한다.',
   '아 씨​발. 내가 이런 걸로 폰만 쳐다볼 줄 누가 알았겠냐. 네가 책임질 거냐? …아니, 그런 뜻은 아니고.',
   '좋아하는 거랑 사랑하는 거, 나한텐 다르게 들려. 너한테 똑같이 돌려주고 싶진 않아. 지금은.'
  ],
  warn:'야. 다 들었다고. 근데 똑같은 말만 계속 보내면 나도 생각할 틈이 없어. 잠깐 그만해. 계속 울리면 차단한다.',
  block:'아 씨​발. 그만하라니까. …오늘은 여기까지다. 차단할게.'
 },
 han:{
  like:[
   '…좋아해? 오랜만에 네가 그 말을 하네. 잠깐 무슨 말을 해야 할지 모르겠다.',
   '너 그렇게 또 말하면 내가 아무렇지 않은 줄 알아? …나 아직 너 좋아해.'
  ],
  likePeak:[
   '세 번이나 말하니까, 이제 정말 못 들은 척 못 하겠네.',
   '…나도 좋아해. 아직도. 그런데 그게 우리 사이가 저절로 괜찮아졌다는 뜻은 아니잖아.'
  ],
  likeAfter:[
   '네가 좋아한다고 할 때마다 반갑고 겁나. 이젠 내 마음만 믿고 앞서가면 안 된다는 걸 아니까.',
   '고마워. …이 말 하나 꺼내는 게 이렇게 어려운 사람이었나, 나.',
   '나도 좋아해. 그런데 네 마음에 지금 당장 이름을 붙여 달라고 하진 않을게.'
  ],
  firstLikeAfterLove:'사랑한다는 말까지 들었는데도, 네가 좋다고 하면 또 좋네. …나 좀 우습지.',
  love:[
   '…사랑해? 잠깐만. 세 달 만에 그 말을 다시 보니까, 손이 멈췄어.',
   '…나도 사랑해. 헤어지고 나면 이 말도 사라질 줄 알았는데, 그게 안 되더라.',
   '너 이렇게 말하면 나 정말 보고 싶어져. 그래도 또 내 마음부터 밀어붙이진 않을게.'
  ],
  firstLoveAfterLike:'좋아한다고 하더니 이제 사랑한다고까지 하네. …나, 지금 괜찮은 척이 안 돼.',
  bothFirst:'좋아해, 사랑해… 그 말을 한꺼번에 네게서 다시 듣네. 잠깐만. 생각보다 많이 흔들려서.',
  lovePeak:[
   {from:'them',text:'지금 보러 갈게.',deleteAfter:3000,replaceText:'전한님이 메시지를 삭제했습니다.'},
   '…나도 사랑해. 이 말은 안 지울게.'
  ],
  loveAfter:[
   '또 듣네, 그 말. 좋으면서도 미안하다. …이번엔 네 속도를 내가 정하지 않을게.',
   '내가 먼저 연락하고 싶었던 날이 없었던 건 아니야. 그때마다 네 뜻은 모르면서 앞서갈까 봐 멈췄어.',
   '나도 널 사랑해. 그런데 이젠 사랑한다는 말보다 네 말을 실제로 듣는 사람이 되고 싶어.'
  ],
  warn:'네 말은 충분히 들었어. 기쁜 마음도 사실이야. 그런데 우리 잠깐 같은 말만 반복하는 건 멈추자. 조금만 시간을 줘.',
  block:'그만해 달라고 했잖아. 계속되면 더는 대화할 수 없어. 오늘은 여기까지 할게. 차단할게.'
 }
};

// The deleted-message reveal is time-based and not tied to rerenders.
// Edit just the pending bubble so a reply draft and keyboard focus survive the timeout.
function scheduleDMDeleteEvent(id,tempId,noticeText,followups){
 setTimeout(()=>{
  const arr=store.messages[id]||(store.messages[id]=[]);
  const idx=arr.findIndex(m=>m._tempId===tempId);
  if(idx<0)return;
  const extras=(followups||[]).map(m=>typeof m==='string'?{from:'them',text:m}:m);
  // Mutate the underlying conversation even when the SNS or DM window was closed.
  arr.splice(idx,1,{from:'system',text:noticeText},...extras);
  persist();
  if(!(opened&&current?.type==='dm'&&current.id===id))return;
  const messages=root.querySelector('.sim-dm-messages');
  const bubble=messages?.querySelector(`[data-dm-temp="${tempId}"]`);
  if(!bubble){
   // If another code path rebuilt the thread, restore without losing a typed draft.
   const input=root.querySelector('#simDmForm input[name="message"]');
   const draft=input?.value||'';
   const focused=!!input&&document.activeElement===input;
   render();
   const restored=root.querySelector('#simDmForm input[name="message"]');
   if(restored){restored.value=draft;if(focused)restored.focus({preventScroll:true});}
   const sc=root.querySelector('.sim-dm-messages');if(sc)sc.scrollTop=sc.scrollHeight;
   return;
  }
  const nearBottom=messages.scrollHeight-messages.scrollTop-messages.clientHeight<160;
  const notice=document.createElement('div');
  notice.className='sim-dm-notice';notice.setAttribute('role','status');notice.textContent=noticeText;
  bubble.replaceWith(notice);
  let last=notice;
  for(const message of extras){
   const node=document.createElement('div');
   if(message.from==='system'){
    node.className='sim-dm-notice';node.setAttribute('role','status');
   }else node.className='sim-bubble '+(message.from==='you'?'mine':'theirs');
   node.textContent=message.text;
   last.after(node);last=node;
  }
  if(nearBottom)messages.scrollTop=messages.scrollHeight;
 },3000);
}

function dmConfessionScene(id,meta,aff){
 const bank=dmConfessionLines[id];
 const state=meta.affection||(meta.affection={like:0,love:0,likePeak:false,lovePeak:false,postLike:0,postLove:0,warning:null,streak:0});
 state.like+=(aff.likeCount||0);
 state.love+=(aff.loveCount||0);
 state.streak=(state.streak||0)+Math.max(1,aff.likeCount+aff.loveCount);
 const stage=aff.kind;
 const level=state[stage];
 const key=stage==='love'?'lovePeak':'likePeak';
 const postKey=stage==='love'?'postLove':'postLike';
 let lines=[];
 if(state.warning===stage){
   lines=[bank.block];store.blocked[id]=true;
 }else if(!state[key]&&stage==='love'&&level>=3){
   state.lovePeak=true;
   lines=bank.lovePeak;
 }else if(!state[key]&&stage==='like'&&level>=3){
   state.likePeak=true;
   lines=bank.likePeak;
 }else if(state[key]){
   state[postKey]++;
   const follow=bank[stage==='love'?'loveAfter':'likeAfter'];
   lines=state[postKey]<=follow.length?[follow[state[postKey]-1]]:[bank.warn];
   if(state[postKey]>follow.length)state.warning=stage;
 }else if(aff.both&&state.love===1){
   lines=[bank.bothFirst];
 }else if(stage==='love'&&state.like>0&&level===1){
   lines=[bank.firstLoveAfterLike];
 }else if(stage==='like'&&state.love>0&&level===1){
   lines=[bank.firstLikeAfterLove];
 }else{
   lines=[bank[stage][Math.min(level-1,bank[stage].length-1)]];
 }
 return lines.map(m=>typeof m==='string'?{from:'them',text:m}:m);
}

function replyToDM(id,text){
 const arr=store.messages[id]||(store.messages[id]=[]);
 const meta=dmMeta(id);
 const userTurns=arr.filter(x=>x.from==='you');
 const prior=userTurns.slice(0,-1);
 const input=normDM(text);
 const near=prior.slice(-5);
 const same=near.filter(x=>normDM(x.text)===input).length;
 const repeatedConsecutive=near.length>0&&normDM(near.at(-1).text)===input;
 const tiny=input.length<=2;
 const trivialRepeated=tiny&&near.slice(-3).filter(x=>normDM(x.text)===input).length>=2;
 const flood=/([ㅋㅎㅜㅠ.!?])\1{6,}/.test(text);
 const pressing=/(답장해|대답해|읽씹|왜무시|보라고|연락해|당장답|전화받|무조건|왜대답안)/.test(input);
 // Ordinary "왜/응/그래서" in a continuing conversation is not spam.
 const repeating=(!tiny&&same>=2&&repeatedConsecutive)||trivialRepeated||flood;
 meta.turn++;
 // Confessions use their own escalation (including a one-time special event),
 // rather than being mistaken for generic spam at the third identical message.
 const signal=dmAffectionSignal(text);
 if(signal?.mode==='confession'&&!pressing&&!flood){
  meta.pressure=Math.max(0,(meta.pressure||0)-2);
  meta.calm=(meta.calm||0)+1;
  if(meta.calm>=2){meta.warned=false;meta.calm=0}
  const scene=dmConfessionScene(id,meta,signal);
  const stagedIndex=scene.findIndex(m=>m?.deleteAfter);
  const pushAdjusted=(message)=>{
   let m=message;
   const recentBrother=id==='yul'&&Number.isInteger(meta.yulBrotherMentionTurn)&&meta.turn-meta.yulBrotherMentionTurn<=4;
   if(recentBrother&&m.from==='them'){
    if(signal.kind==='like'&&meta.affection?.like===1&&/누구 형/.test(m.text))m={...m,text:'야, 질문으로도 모자라서 이번엔 나 좋다고? …씨\u200b발, 사람 진짜 헷갈리게 하네.'};
    else if(signal.kind==='love'&&meta.affection?.love===1&&/전남친 형/.test(m.text))m={...m,text:'……나한테 사랑한다고? 아까 뭐라고 했는지 듣긴 했냐. 씨\u200b발, 이번엔 더 세게 오네.'};
   }
   if(id==='yul'&&m.from==='them'&&/(동생|전남친|전 약혼자|한이|누구 형)/.test(m.text))meta.yulBrotherMentionTurn=meta.turn;
   arr.push(m);
  };
  if(stagedIndex>=0){
   // Keep the character's actual message visible first; delete it after ~3 seconds.
   scene.slice(0,stagedIndex).forEach(pushAdjusted);
   const pending=scene[stagedIndex];
   const tempId='dm-delete-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
   pushAdjusted({...pending,_tempId:tempId});
   const followups=scene.slice(stagedIndex+1);
   scheduleDMDeleteEvent(id,tempId,pending.replaceText,followups);
  }else scene.forEach(pushAdjusted);
  meta.lastTopic=signal.kind==='love'?'affectionLove':'affectionLike';
  meta.lastInput=input;
  return;
 }
 // Only genuinely consecutive confession messages escalate into an eventual block.
 // Questions and other topics release that pressure without resetting emotional history.
 if(meta.affection){meta.affection.streak=0;meta.affection.warning=null;}
 if(repeating)meta.pressure=Math.min(12,(meta.pressure||0)+2);
 else if(pressing)meta.pressure=Math.min(12,(meta.pressure||0)+1);
 else meta.pressure=Math.max(0,(meta.pressure||0)-2);
 if(!repeating&&!pressing){meta.calm=(meta.calm||0)+1;if(meta.calm>=2){meta.warned=false;meta.calm=0}}
 else meta.calm=0;
 const intent=dmIntent(text,id,meta.lastTopic);
 const lastThem=[...arr].reverse().find(x=>x.from==='them');
 let answer=null;
 if(meta.warned&&meta.pressure>=6&&(repeating||pressing)){
  answer=id==='yul'?'아, 씨​발. 그만 보내라고 했지. 차단한다.':'여기까지 해 달라고 했잖아. 더는 답하지 않을게. 차단할게.';
  store.blocked[id]=true;
 }else if(meta.pressure>=4&&(repeating||pressing)&&!meta.warned){
  meta.warned=true;
  answer=id==='yul'?'야, 똑같은 걸 계속 보내면 차단한다. 장난도 정도껏 해.':'같은 메시지가 계속 와. 그만해 줘. 계속되면 차단할게.';
 }else if(repeating){
  answer=id==='yul'?'아까도 똑같이 보냈잖아. 내가 못 본 게 아니라 할 말이 없는 거야.':'그 메시지는 이미 봤어. 몇 번 더 보낸다고 대답이 바뀌는 건 아니야.';
 }else if(pressing&&meta.pressure>=2){
  answer=id==='yul'?'씨​발, 재촉하지 마. 나도 폰만 보고 사는 사람 아니거든.':'재촉하지 말아 줘. 나도 생각하고 대답하고 있어.';
 }else if(signal?.mode==='question'){
  answer=dmAffectionQuestionScene(id,meta,signal);
  meta.lastTopic='affectionQuestion'+(signal.kind==='love'?'Love':'Like');
 }else if(intent==='followup'&&lastThem?.event==='like'){
  answer=id==='yul'?'왜긴, 내 사진에 네가 하트 눌렀으니까. 좀 의외잖아.':'네가 좋아요를 눌렀잖아. 별뜻 없을 수도 있지만, 네 이름이 떠서 놀랐어.';
 }else if(intent==='followup'&&lastThem?.event==='follow'){
  answer=id==='yul'?'야, 네가 먼저 팔로우한 거잖아. 그냥 반가워서 그랬다. 왜 ㅋㅋ':'왜냐면 우리 헤어진 뒤로 네 이름이 이렇게 뜰 줄 몰랐거든. 3개월 만이잖아.';
 }else if(id==='han'&&prior.length===0&&!lastThem&&['greet','reunion','other','short','daily','ask','followup'].includes(intent)){
  answer=dmFresh(id,'first',meta,input);
 }else if(id==='yul'&&prior.length===0&&!lastThem&&['greet','other','short','ask','followup'].includes(intent)){
  answer=dmFresh(id,'first',meta,input);
 }else if(intent==='followup'||(intent==='short'&&meta.lastTopic&&meta.lastTopic!=='short')){
  const topic=meta.lastTopic||'other';
  answer=dmFresh(id,topic,meta,input,{followup:true})||dmFresh(id,topic,meta,input);
  if(!answer)answer=dmCloseTopic(id,meta,topic);
 }else{
  answer=dmFresh(id,intent,meta,input);
  if(!answer)answer=dmCloseTopic(id,meta,intent);
 }
 if(intent!=='followup'&&intent!=='short'&&signal?.mode!=='question')meta.lastTopic=intent;
 if(intent==='followup'&&!meta.lastTopic)meta.lastTopic='other';
 meta.lastInput=input;
 if(answer){meta.lastResponse=answer;arr.push({from:'them',text:answer})}
}

const commentReplySets={
 'yul-1':{praise:['공구 사진에 칭찬이라니, 독특하네 ㅋㅋ','다음엔 작업하는 것도 한번 올려볼까.','오늘은 가게가 좀 난장판이었거든.'],ask:['뭐가 궁금한데. 부품 관련이면 가게 계정으로 물어봐.','작업 중이어서 답 늦을 수 있어.','렌치 얘기면 나도 좀 찾고 싶다.'],other:['작업 중에 폰 들었다고 또 잔소리 듣겠다.','야, 오늘은 엔진보다 댓글이 더 시끄럽네.','그건 좀 웃겼다 ㅋㅋ']},
 'yul-2':{praise:['이쪽 알아보는 사람 별로 없는데. 보는 눈 있네.','이거 마무리하면 좀 뿌듯하긴 하겠다.'],ask:['엔진 쪽이야. 끝나면 사진 또 올리지 뭐.','일정은 아직 미정. 부품부터 와야 돼.'],other:['그러게. 이 부분만 끝나면 퇴근인데.','야, 이게 생각보다 오래 걸리네.','기계가 말썽 부릴 땐 밤도 짧다.']},
 'yul-3':{praise:['색 괜찮지. 내가 고른 거다.','이건 좀 마음에 들게 나왔어.'],ask:['시승은 점검 끝나고. 아무나 태우진 않아.','세부 사양은 가게 쪽에 올릴 거야.'],other:['끝났다고 바로 타는 건 아니고.','일단 최종 점검부터 해야지.','이런 날엔 꽤 기분 좋긴 하다.']},
 'yul-4':{praise:['사진 하나 올렸다고 반응 왜 이러냐 ㅋㅋ','아, 씨​발. 이런 칭찬은 좀 어색한데.'],ask:['누가 찍었는지는 비밀. 별건 아니고.','그냥 찍혔다니까. 왜 다들 안 믿냐?'],other:['평소랑 다른 거 없다.','야, 사진만 보라고 ㅋㅋ','댓글이 더 웃기네.']},
 'han-1':{praise:['팀이 정말 고생했어. 잘 끝나서 다행이지.','좋게 봐주셔서 감사합니다.'],ask:['행사 관련 정보는 브랜드 공식 채널에 올릴 예정이에요.','현장 세팅은 팀과 함께 진행했어.'],other:['행사 끝나도 정리할 일이 꽤 많네.','결과가 괜찮아서 다행이야.','실제로 보면 디테일이 더 잘 보여.']},
 'han-2':{praise:['이런 평범한 사진도 좋게 봐주는구나.','고마워. 정신없는 하루였어.'],ask:['아직 회사야. 정리할 게 남았거든.','일정은 끝났는데 메일이 남아 있네.'],other:['월요일은 늘 조금 길어지네.','이제 정말 퇴근하려고.','다음엔 더 일찍 끝내고 싶어.']},
 'han-3':{praise:['조명과 동선을 많이 조정했어.','디테일까지 봐줬네. 고마워.'],ask:['디스플레이는 브랜드 팀과 함께 맞췄어.','최종 컨펌까지 시간이 좀 걸렸어.'],other:['마지막에 고칠 곳이 하나 더 보이더라.','이 컷은 현장감이 잘 살아서 마음에 들어.','준비한 만큼 결과가 나와서 다행이야.']},
 'han-4':{praise:['고마워. 오늘은 정말 퇴근하는 중이야.','그렇게 봐줬다면 다행이고.'],ask:['집에 가는 길이야. 오늘 일정은 끝났어.','내일 일정은 오전부터 있어.'],other:['오늘은 이만 끝.','오랜만에 여유가 좀 생겼네.','내일은 조금 덜 바빴으면 좋겠다.']}
};
// Public comments are not private confessions. U is an acquaintance/ex-fiancée, not a random fan.
function commentReplyFor(pid,text,posted){
 const owner=posts[pid]?.author;
 const bank=commentReplySets[pid]||commentReplySets[owner==='yul'?'yul-1':'han-1'];
 const t=normDM(text),asked=/\?|왜|어디|뭐|얼마|언제|가능|알려|궁금|어떤|어떻게|태워|탈수|일정/.test(text);
 const praise=/멋|예쁘|좋다|최고|잘생|대박|예술|완벽|짱|귀여|멋져|굿|존잘|😍|❤️|🔥/.test(text);
 const hadAnyComment=Object.entries(store.comments).some(([key,list])=>posts[key]?.author===owner&&list.some(c=>c.author==='you'&&(key!==pid||c.id!==posted?.id)));
 let candidates=[];
 if(owner==='han'){
   if(/잘지냈|잘지내|근황|오랜만|3개월|삼개월/.test(t))candidates=['응. 오랜만이네. 너는?', '…이렇게 인사하게 될 줄은 몰랐네.', '네 계정 보니까 잠깐 멈칫했어. 잘 지냈어?'];
   else if(/왜|갑자기|당황|놀랐/.test(t))candidates=['네 댓글이 뜨니까 조금 놀랐어. 싫다는 건 아니야.', '아니. 예상 못 했던 것뿐이야.', '…네가 여기에 댓글 달 줄은 몰랐거든.'];
   else if(/미안|잘못|결혼|파혼|헤어/.test(t))candidates=['공개 댓글에서 길게 얘기할 일은 아닌 것 같아. 괜찮으면 따로 얘기하자.', '그 얘기는 가볍게 넘기고 싶지 않아. DM으로 이야기할게.', '…여기서 한 줄로 대답할 수 있는 일은 아니네.'];
   else if(/일|바쁘|퇴근|행사|회사|촬영|런칭/.test(t))candidates=['응. 여전히 바쁘게 지내고 있어. 네가 이걸 보네.', '그날은 꽤 늦게 끝났어. 너랑 이런 얘길 다시 하게 되네.', '이 컷은 내가 골랐어. 네가 알아봐 주니까 좀 묘하네.'];
   else if(praise)candidates=['…고마워. 네가 그런 말을 하니까 좀 다르네.', '이런 댓글은 예상 못 했는데. 고마워.', '네가 좋게 봤다면 나쁘지 않네. …고마워.'];
   else if(asked)candidates=['궁금했어? …그건 따로 얘기해 줄게.', '그날 행사 사진이야. 네가 물어보니 조금 뜻밖이네.', '응, 내가 담당했던 일이야. 잘 끝났어.'];
   else if(!hadAnyComment)candidates=['…네 계정이 여기 뜨니까 조금 놀랐어.', '오랜만이네. 댓글은 생각 못 했어.', '…봐 줬구나. 고마워.'];
   else candidates=['그렇게 말하니까 좀 웃기네. 오랜만이야.', '응. 읽었어. 이렇게 얘기하는 것도 오랜만이네.', '…네 말이 무슨 뜻인지 알겠어.'];
 }else if(owner==='yul'){
   if(/전한|동생|형|결혼|파혼/.test(t))candidates=['야, 동생 얘기를 내 댓글에서 하냐 ㅋㅋ', '그 얘긴 여기서 하지 말자. 나도 안 끼어들고 싶어.', '씨​발, 이젠 내 게시물까지 형제 상담소냐 ㅋㅋ'];
   else if(/여자|데이트|누구랑|누가찍|연락/.test(t))candidates=['왜, 그게 그렇게 궁금하냐? ㅋㅋ', '야, 사진만 봐. 내 사생활 캐지 말고.', '그런 건 DM으로 물어봐. 여기서 떠들 거냐.'];
   else if(/잘생|멋있|귀엽|잘나왔|존잘/.test(t))candidates=['야, 이런 댓글은 좀 의외인데 ㅋㅋ', '내 얼굴 칭찬하면 뭐 나오는 줄 아냐.', '아, 씨​발. 괜히 웃었네. 됐다.'];
   else if(/일|바쁘|퇴근|정비|바이크|엔진|공구/.test(t))candidates=['야, 너도 이런 데 관심 생겼냐 ㅋㅋ', '가게 와서 보면 더 재밌어. 구경만 하고 가라.', '그날은 진짜 존나 바빴다. 사진은 멀쩡하지.'];
   else if(praise)candidates=['오, 너한테 그런 말도 듣네 ㅋㅋ', '야, 갑자기 칭찬하면 수상하거든.', '그래? 내가 좀 잘하긴 하지.'];
   else if(asked)candidates=['뭐가 궁금한데. 가게 일이면 대답해 주지.', '야, 왜. 나한테 댓글로 취조하냐 ㅋㅋ', '그건 직접 보면 알아. 사진엔 다 안 나와.'];
   else candidates=['뭐야. 너까지 댓글 달러 왔냐 ㅋㅋ', '아, 씨​발. 너까지 이러면 내가 뭐가 되냐.', '야, 그건 좀 웃겼다.'];
 }
 const chosen=candidates.length?candidates:bank[asked?'ask':praise?'praise':'other'];
 const used=store.commentReplyUsed||(store.commentReplyUsed={});
 const key=owner+'-user';used[key]??=[];
 const fresh=chosen.filter(x=>!used[key].includes(x));
 const pool=fresh.length?fresh:chosen;
 let hash=pid.length*17+text.length*7;
 for(const ch of text)hash=(Math.imul(hash,31)+ch.charCodeAt(0))>>>0;
 const reply=pool[hash%pool.length].replace(/[.。]+\s*$/g,'');
 used[key].push(reply);
 return '@you '+reply;
}
function scheduleCommentReply(pid,posted){
 if(!['yul','han'].includes(posts[pid]?.author)||store.blocked[posts[pid].author])return;
 const originalId=posted.id;
 setTimeout(()=>{
  const owner=posts[pid].author;
  if(store.blocked[owner]||!store.comments[pid]?.some(x=>x.id===originalId)||store.comments[pid].some(x=>x.parent===originalId&&x.author===owner))return;
  const rootId=posted.parent||originalId;
  const text=commentReplyFor(pid,posted.text,posted);
  store.comments[pid].push({id:'reply-'+originalId,author:owner,text,likes:0,time:'방금',parent:rootId,replies:[]});
  if(opened&&current?.type==='comments'&&current.id===pid){
   current.expanded??=[];
   if(!current.expanded.includes(rootId))current.expanded.push(rootId);
   const original=allComments(pid).find(c=>c.id===rootId);
   const old=root.querySelector('.sim-comments > .sim-comment[data-comment="'+rootId+'"]');
   if(original&&old){
    const pos=root.querySelector('.sim-scroll')?.scrollTop||0;
    old.outerHTML=commentRow(pid,original);
    const sc=root.querySelector('.sim-scroll');if(sc)sc.scrollTop=pos;
   }
  }
  window.MIPIL_NOTICES?.add({text:(owner==='yul'?'전율':'전한')+'님이 댓글에 답글을 남겼습니다',account:owner,kind:'comment',postId:pid});
 },1400+Math.min(1000,posted.text.length*19));
}
function render(){clearTimeout(storyTimer);if(!current)return;let title='',content='';switch(current.type){case 'profile':title=profiles[current.id].handle;content=profileView();break;case 'post':{
 title='게시물';
 const author=posts[current.id]?.author;
 const all=profiles[author]?.posts?.filter(pid=>!!posts[pid])||[current.id];
 content=`<div class="sim-account-posts" aria-label="${esc(profiles[author]?.name||'계정')}의 게시물">${all.map(pid=>postView(pid)).join('')}</div>`;
 break;
}case 'comments':title='댓글';content=commentsView();break;case 'feed':title='피드';content=`<div class="sim-feed">${Object.values(posts).filter(p=>['yul','han'].includes(p.author)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(p=>postView(p.id,true)).join('')}</div>`;break;case 'saved':title='저장됨';content=grid(Object.keys(store.saves).filter(k=>store.saves[k]));break;case 'activity':title='내 활동';content=activityView();break;case 'story':title=profiles[current.id].handle;break;case 'dm':title=profiles[current.id].handle+' · 메시지';content=dmView();break;case 'avatar':title=profiles[current.id].handle;content=`<div class="sim-empty">${av(current.id)}</div>`;break;default:title=current.title||'계정 검색';content=listView();}
root.innerHTML=toolbar(title)+(current.type==='story'?storyView():`<div class="sim-scroll ${current.type==='dm'?'sim-scroll-dm':''}" tabindex="-1">${content}</div>`)+(current.type==='comments'?composer():current.type==='story'?'':bottom());window.MIPIL_NOTICES?.sync();
if(current.type==='story'){storyRemaining=7000;storyStarted=performance.now();if(!current.paused)storyTimer=setTimeout(storyNext,7000)}
}
function redraw(){saveScroll();setScreen(current)}
// The DM trigger must be tied to the specific post, never to the account alone.
// These are unique scripted responses, not an AI chat service.
const likeMessages={
 'yul-1':'야, 내 공구 사진까지 좋아요 누르냐. 뭔 일인데 ㅋㅋ',
 'yul-2':'저 엔진 사진에 하트를? 너 기계에도 관심 있었냐.',
 'yul-3':'그 바이크 네 취향이냐? 직접 보면 더 낫긴 해.',
 'yul-4':'야, 내 사진에 하트는 또 왜 누르는데 ㅋㅋ',
 'han-1':'…행사 사진에 네 이름이 뜨네. 이걸 네가 볼 줄은 몰랐어.',
 'han-2':'내 책상 사진을 봤네. …네가 좋아요 누른 건 예상 못 했어.',
 'han-3':'내가 맡았던 디스플레이야. 네 계정이 뜨니까 잠깐 멈칫했네.',
 'han-4':'…네가 내 사진에 좋아요를 눌렀네. 오랜만이야.'
};
const firstLikeHan={
 'han-1':'…행사 사진을 네가 봤네. 3개월 만에 네 이름이 떠서 좀 놀랐어.',
 'han-2':'내 일상 사진에 네 계정이 뜨네. 3개월 만이라 그런가, 좀 멈칫했어.',
 'han-3':'네가 그 사진을 봤구나. 오랜만이야. 네 이름을 다시 보니까 기분이 묘하네.',
 'han-4':'…퇴근 사진에 네가 하트를 눌렀네. 3개월 만이야. 잘 지냈어?'
};
function hasUserCommented(owner){
 return Object.entries(store.comments).some(([pid,list])=>posts[pid]?.author===owner&&list.some(c=>c.author==='you'));
}
const likeDeliveryAfter={};
function appendIncomingMessage(id,text,eventData={}){
 if(!text||store.blocked[id])return false;
 const messages=store.messages[id]||(store.messages[id]=[]);
 messages.push({from:'them',text,...eventData});
 // Do not replace the DM composer: its focus and draft must stay intact.
 if(opened&&current?.type==='dm'&&current.id===id){
   const panel=root.querySelector('.sim-dm-messages');
   if(panel){
     panel.querySelector('.sim-empty')?.remove();
     const bubble=document.createElement('div');bubble.className='sim-bubble theirs';bubble.textContent=text;panel.appendChild(bubble);
     requestAnimationFrame(()=>{panel.scrollTop=panel.scrollHeight;});
   }
 }
 const name=id==='yul'?'전율':'전한';
 socialNotice(name+'님에게 메시지가 도착했습니다');
 return true;
}
function schedulePostLikeDM(pid){
 const post=posts[pid];const who=post?.author;
 if(!['yul','han'].includes(who)||!store.likes[pid]||store.likeReactions[pid]||likeEvents[pid])return;
 // Realistic feed behavior: an occasional DM, not a DM from every single like.
 const reacted=Object.keys(store.likeReactions).filter(k=>store.likeReactions[k]&&posts[k]?.author===who).length;
 const queued=Object.keys(likeEvents).filter(k=>posts[k]?.author===who).length;
 if(reacted+queued>=3)return;
 // A single unopened DM should not turn every like into another unsolicited message.
 const thread=store.messages[who]||[];
 if(thread.some(m=>m.event==='like')&&!thread.some(m=>m.from==='you'))return;
 const now=Date.now(),base=who==='yul'?5700:7600;
 const delivery=Math.max(now+base,(likeDeliveryAfter[who]||0)+3800);
 likeDeliveryAfter[who]=delivery;
 likeEvents[pid]=setTimeout(()=>{
   delete likeEvents[pid];
   if(!store.likes[pid]||store.likeReactions[pid])return;
   const isFirst=(store.messages[who]||[]).length===0;
   const text=isFirst&&who==='han'&&hasUserCommented('han')
     ?'…댓글 보긴 했어. 좋아요까지 누른 걸 보니까 조금 더 놀랍네.'
     :isFirst&&who==='han'?(firstLikeHan[pid]||likeMessages[pid]):likeMessages[pid];
   if(!text)return;
   store.likeReactions[pid]=true;
   appendIncomingMessage(who,text,{event:'like',postId:pid});
 },delivery-now);
}
function socialNotice(text){
 const account=/전율/.test(text)?'yul':/전한/.test(text)?'han':null;
 const kind=/메시지|DM/.test(text)?'dm':'follow';
 window.MIPIL_NOTICES?.add({text,account,kind});
 let x=document.getElementById('mipilNotice');if(!x){x=document.createElement('div');x.id='mipilNotice';x.setAttribute('role','status');x.style.cssText='position:fixed;top:76px;left:50%;transform:translateX(-50%);z-index:99999;background:#f7eee7;color:#302b31;border:1px solid #d8b99e;border-radius:15px;box-shadow:0 12px 40px #0007;padding:13px 19px;font:600 14px/1.55 system-ui,sans-serif;max-width:calc(100vw - 30px);min-width:220px;text-align:center;cursor:pointer';x.onclick=()=>{x.remove();window.MIPIL_NOTICES?.open()};document.body.append(x)}x.textContent=text;clearTimeout(socialNotice.timer);socialNotice.timer=setTimeout(()=>x.remove(),4000);
}
function toast(text){clearTimeout(toastTimer);root.querySelector('.sim-toast')?.remove();const x=document.createElement('div');x.className='sim-toast';x.setAttribute('role','status');x.textContent=text;root.append(x);toastTimer=setTimeout(()=>x.remove(),2300)}
function storyNext(){const g=profiles[current.id].highlights[current.group||0];if((current.index||0)<g.posts.length-1){current.index=(current.index||0)+1;render()}else back()}
function linkedList(id,title,note=''){navigate({type:'list',id,title,ids:id==='you'?Object.keys(store.follows).filter(k=>store.follows[k]):profiles[id].links,note})}
root.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;const {action,id}=b.dataset;switch(action){
case 'profile':navigate({type:'profile',id});break;case 'dm':navigate({type:'dm',id,scroll:undefined});break;
case 'post':navigate({type:'post',id});break;
case 'comments':navigate({type:'comments',id,expanded:[]});if(b.dataset.focus)root.querySelector('textarea')?.focus({preventScroll:true});break;
case 'back':back();break;case 'close':close();break;case 'notices':e.stopPropagation();window.MIPIL_NOTICES?.toggle();break;case 'music':window.mipilMusicPanel?.();break;
case 'accounts':navigate({type:'list',title:'계정 둘러보기',ids:['yul','han',...Object.keys(profiles).filter(x=>!['yul','han','you'].includes(x))]});break;
case 'search':navigate({type:'search',query:''});break;case 'feed':navigate({type:'feed'});break;case 'saved':navigate({type:'saved'});break;case 'activity':navigate({type:'activity'});break;
case 'followers':linkedList(id,'팔로워','피드에서 만난 계정');break;case 'following':linkedList(id,'팔로잉','연결된 계정');break;case 'connections':linkedList(id,'함께 아는 계정');break;
case 'follow':{
  store.follows[id]=!store.follows[id];
  (followEvents[id]||[]).forEach(clearTimeout);followEvents[id]=[];
  if(!store.follows[id]){store.mutual[id]=false;}
  else if(['yul','han'].includes(id)&&!store.mutual[id]){
    const label=id==='yul'?'전율':'전한';
    const firstDelay=id==='yul'?3600:5800;
    followEvents[id].push(setTimeout(()=>{
      if(!store.follows[id]||store.blocked[id])return;
      store.mutual[id]=true;
      if(opened&&current?.type==='profile'&&current.id==='you')redraw();
      socialNotice(label+'님이 회원님을 팔로우했습니다');
      if(opened&&current?.type==='profile'&&current.id===id)redraw();
    },firstDelay));
    followEvents[id].push(setTimeout(()=>{
      if(!store.follows[id]||!store.mutual[id]||store.followGreetings[id]||store.blocked[id])return;
      const existing=store.messages[id]||[];
      // A reaction to the first reconnection, not a cold greeting to a stranger.
      const commented=hasUserCommented(id);
      const text=id==='yul'
        ?(commented?'야, 댓글 달더니 팔로우까지? 뭐야, 오늘 나한테 관심 많네 ㅋㅋ':existing.length?'맞팔도 해놨다. 야, 내 계정 구경 재밌냐 ㅋㅋ':'야, 네가 먼저 팔로우했냐? 맞팔은 해놨다. 갑자기 웬일인데 ㅋㅋ')
        :(commented?'아까 댓글 봤어. …이제 팔로우까지 했네. 오랜만에 네 이름이 자꾸 뜬다.':existing.length?'맞팔했어. 네 이름이 계속 뜨니까 아직 좀 낯설다.':'…맞팔했어. 네 이름을 3개월 만에 다시 보니까 좀 놀랐어. 잘 지냈어?');
      store.followGreetings[id]=true;
      appendIncomingMessage(id,text,{event:'follow'});
    },firstDelay+(id==='yul'?4400:5200)));
  }
  persist();redraw();break;}

case 'like':{
 store.likes[id]=!store.likes[id];
 if(!store.likes[id]&&likeEvents[id]){clearTimeout(likeEvents[id]);delete likeEvents[id];}
 if(store.likes[id])schedulePostLikeDM(id);
 persist();redraw();break;}
case 'save':store.saves[id]=!store.saves[id];persist();redraw();toast(store.saves[id]?'저장했습니다.':'저장을 취소했습니다.');break;
case 'likers':navigate({type:'list',title:'좋아요',ids:[...new Set(allComments(id).map(c=>c.author)),...(store.likes[id]?['you']:[])],note:'이 게시물에서 만난 계정'});break;
case 'share':{const u=new URL(location.href);u.hash='sns/'+posts[id].author+'/'+id;try{await navigator.clipboard.writeText(u.href);toast('게시물 링크를 복사했습니다.')}catch(_){const a=document.createElement('textarea');a.value=u.href;root.append(a);a.select();const ok=document.execCommand('copy');a.remove();toast(ok?'게시물 링크를 복사했습니다.':'주소창에서 사이트 주소를 복사해 주세요.')}break}
case 'profile-tab':current.tab=b.dataset.tab;redraw();break;
case 'grid-top':root.querySelector('.sim-profile-tabs')?.scrollIntoView({block:'start',behavior:'smooth'});break;
case 'toggle-replies':current.expanded||=[];current.expanded=current.expanded.includes(id)?current.expanded.filter(k=>k!==id):[...current.expanded,id];redraw();break;
case 'comment-like':store.commentLikes[id]=!store.commentLikes[id];persist();redraw();break;
case 'reply':saveScroll();current.replyTo=b.dataset.parent||id;current.replyAuthor=b.dataset.author;setScreen(current);root.querySelector('textarea')?.focus({preventScroll:true});break;
case 'cancel-reply':saveScroll();current.replyTo=null;current.replyAuthor=null;setScreen(current);break;
case 'slide-next':{
 const pid=id||current.id;current.slides??={};
 current.slides[pid]=Math.min((current.slides[pid]||0)+1,posts[pid].images.length-1);
 redraw();break;
}
case 'slide-prev':{
 const pid=id||current.id;current.slides??={};
 current.slides[pid]=Math.max((current.slides[pid]||0)-1,0);
 redraw();break;
}
case 'story':navigate({type:'story',id,group:+b.dataset.group||0,index:0});break;
case 'story-next':storyNext();break;
case 'story-prev':if(current.index>0){current.index--;render()}else back();break;
case 'story-pause':{const st=root.querySelector('.sim-story');current.paused=!current.paused;if(current.paused){clearTimeout(storyTimer);storyRemaining-=performance.now()-storyStarted;st.classList.add('paused')}else{storyStarted=performance.now();storyTimer=setTimeout(storyNext,Math.max(100,storyRemaining));st.classList.remove('paused')}b.innerHTML=icon(current.paused?'play':'pause');b.setAttribute('aria-label',current.paused?'스토리 재생':'스토리 일시정지');break}
case 'avatar':toast('프로필 사진이 없습니다.');break;
}});
root.addEventListener('submit',e=>{if(e.target.id==='simDmForm'){e.preventDefault();const t=e.target.elements.message.value.trim();if(!t||store.blocked[current.id])return;const id=current.id;const arr=store.messages[id]||(store.messages[id]=[]);arr.push({from:'you',text:t});replyToDM(id,t);current.scroll=undefined;render();requestAnimationFrame(()=>{const msgs=root.querySelector('.sim-dm-messages');if(msgs)msgs.scrollTop=msgs.scrollHeight;const input=root.querySelector('#simDmForm input[name=message]');if(input)input.focus({preventScroll:true});});return}if(e.target.id!=='simCompose')return;e.preventDefault();const t=e.target.querySelector('textarea').value.trim();if(!t)return;const pid=current.id;if(store.blocked[posts[pid]?.author])return;const c={id:'local-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),author:'you',text:t,likes:0,time:'방금',parent:current.replyTo||null,replies:[]};store.comments[pid]||=[];store.comments[pid].push(c);persist();scheduleCommentReply(pid,c);current.draft='';if(c.parent){current.expanded||=[];if(!current.expanded.includes(c.parent))current.expanded.push(c.parent)}current.replyTo=null;current.replyAuthor=null;render();requestAnimationFrame(()=>root.querySelector(`[data-comment="${c.id}"]`)?.scrollIntoView({block:'nearest'}));toast(c.parent?'답글을 남겼습니다.':'댓글을 남겼습니다.');});
root.addEventListener('input',e=>{if(e.target.matches('textarea')){current.draft=e.target.value;root.querySelector('#simCompose button[type="submit"]').disabled=!e.target.value.trim()}if(e.target.id==='simSearch'){const pos=e.target.selectionStart;current.query=e.target.value;render();const x=root.querySelector('#simSearch');x.focus({preventScroll:true});try{x.setSelectionRange(pos,pos)}catch(_){}}});
root.addEventListener('dblclick',e=>{const m=e.target.closest('[data-media]');if(!m)return;const pid=m.dataset.media;const wasLiked=!!store.likes[pid];store.likes[pid]=true;if(!wasLiked)schedulePostLikeDM(pid);persist();redraw();const box=root.querySelector(`[data-media="${pid}"]`);if(box){const heart=document.createElement('span');heart.className='sim-media-heart';heart.textContent='♥';box.append(heart);setTimeout(()=>heart.remove(),800)}});
let touchX=null,touchPostId=null;
root.addEventListener('touchstart',e=>{
 const media=e.target.closest('[data-media]');
 touchPostId=media?.dataset.media||null;
 touchX=media?e.touches[0].clientX:null;
},{passive:true});
root.addEventListener('touchend',e=>{
 const pid=touchPostId;
 if(touchX===null||!pid||current.type!=='post')return;
 const dx=e.changedTouches[0].clientX-touchX;touchX=null;touchPostId=null;
 if(Math.abs(dx)>45&&posts[pid].images.length>1){
   current.slides??={};
   current.slides[pid]=Math.max(0,Math.min(posts[pid].images.length-1,(current.slides[pid]||0)+(dx<0?1:-1)));
   redraw();
 }
},{passive:true});
// Prevent a swipe at the top/bottom of an Instagram view from chaining into
// the main page. Horizontal photo swipes still work normally.
let overlayTouchY=null,overlayTouchX=null;
layer.addEventListener('touchstart',e=>{
 if(e.touches.length!==1)return;
 overlayTouchY=e.touches[0].clientY;
 overlayTouchX=e.touches[0].clientX;
},{passive:true});
layer.addEventListener('touchmove',e=>{
 if(!opened||e.touches.length!==1||overlayTouchY===null)return;
 const yy=e.touches[0].clientY,xx=e.touches[0].clientX;
 const dy=yy-overlayTouchY,dx=xx-overlayTouchX;
 overlayTouchY=yy;overlayTouchX=xx;
 if(Math.abs(dx)>Math.abs(dy)*1.1)return;
 let node=e.target;
 while(node&&node!==layer){
  if(node instanceof HTMLElement){
   const overflow=getComputedStyle(node).overflowY;
   if((overflow==='auto'||overflow==='scroll')&&node.scrollHeight>node.clientHeight+1){
    const max=node.scrollHeight-node.clientHeight;
    if((dy>0&&node.scrollTop>1)||(dy<0&&node.scrollTop<max-1))return;
   }
  }
  node=node.parentElement;
 }
 e.preventDefault();
},{passive:false});
layer.addEventListener('touchend',()=>{overlayTouchY=null;overlayTouchX=null},{passive:true});
layer.addEventListener('touchcancel',()=>{overlayTouchY=null;overlayTouchX=null},{passive:true});
layer.addEventListener('click',e=>{if(e.target===layer)close()});
document.querySelectorAll('[data-open-ig]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.openIg)));
document.addEventListener('keydown',e=>{if(!opened)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();back()}if(current?.type==='story'&&!e.target.matches('input,textarea')){if(e.key==='ArrowRight')storyNext();if(e.key==='ArrowLeft'&&current.index>0){current.index--;render()}}if(e.key==='Tab'){const list=[...root.querySelectorAll('button:not([disabled]),input,textarea'),...document.getElementById('musicDrawer').querySelectorAll('button:not([disabled]),input')].filter(n=>n.getClientRects().length);if(!list.length)return;const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}},true);
// Shared URLs open the same local fictional account/post; no external sign-in.
const deep=location.hash.match(/^#sns\/([^/]+)(?:\/([^/]+))?$/);if(deep&&profiles[deep[1]]){open(deep[1]);if(deep[2]&&posts[deep[2]])navigate({type:'post',id:deep[2]})}
window.MipilSocial={open,close};
window.MIPIL_SOCIAL_OPEN_TARGET=(account,kind,postId)=>{open(account||'yul');if(kind==='dm')navigate({type:'dm',id:account||'yul',scroll:undefined});else if(kind==='comment'&&posts[postId])navigate({type:'comments',id:postId,expanded:[]});};
})();
