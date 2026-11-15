export function publicPdfUrl(value){const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw new Error('Use an HTTP or HTTPS PDF link.');return u.href;}
export function isPdfUrl(value){try{return /\.pdf$/i.test(new URL(publicPdfUrl(value)).pathname);}catch{return false;}}
export function fieldContext(a,page,items=[],widgets=[]){
 const [left,bottom,right,top]=a.rect||[0,0,0,0];
 const candidates=items.filter(item=>{
  if(!item.str?.trim()||!item.transform)return false;
  const x=item.transform[4],y=item.transform[5];
  if(widgets.some(w=>w.rect&&x>=w.rect[0]&&x<=w.rect[2]&&y>=w.rect[1]&&y<=w.rect[3]))return false;
  return x>=left-4&&x<right&&y>=top&&y<=top+22;
 }).sort((x,y)=>Math.abs(x.transform[5]-top)-Math.abs(y.transform[5]-top)||x.transform[4]-y.transform[4]);
 const baseline=candidates[0]?.transform[5];
 const nearby=candidates.filter(x=>Math.abs(x.transform[5]-baseline)<3).sort((x,y)=>x.transform[4]-y.transform[4]).map(x=>x.str).join(' ');
 return {id:String(a.id),label:String(a.alternativeText||nearby||'Field on page '+page).slice(0,160),page};
}
