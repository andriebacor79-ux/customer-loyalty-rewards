export async function api(path:string,body?:unknown,method=body?'POST':'GET'){
 const token=sessionStorage.getItem('perkwise-token');
 const response=await fetch('/api/v1'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json().catch(()=>({message:'Unable to reach the service. Please try again.'}));
 if(!response.ok){if(response.status===401&&path!=='/auth/login'){sessionStorage.removeItem('perkwise-token');window.dispatchEvent(new Event('session-expired'));}throw new Error(data.errors?.length?data.errors.join('. '):data.message||'Request failed');}return data;
}
export const count=(value:unknown)=>Number(value||0).toLocaleString('en-PH');
export const date=(value:string)=>value?new Date(value).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}):'—';
