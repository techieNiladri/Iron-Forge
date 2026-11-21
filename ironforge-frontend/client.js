import { createClient } from '@supabase/supabase-js';
const $ = id => document.getElementById(id);
let client, userId = null, epoch = 0, cursor = null, saving = false, authBusy = false, mode = 'signin', pending = null, resetSentAt = 0;
const recoveryHint = new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
let recovering = recoveryHint, passwordUpdated = false;
try { const saved = Number(sessionStorage.getItem('iron-forge:recovery')); recovering ||= saved > 0 && Date.now() - saved < 3600000; } catch {}
function message(id, text) { $(id).textContent = text; }
function clearRecovery() { recovering = false; passwordUpdated = false; try { sessionStorage.removeItem('iron-forge:recovery'); } catch {} }
function setMode(next) {
  mode = next;
  const recovery = next === 'recovery', request = next === 'request';
  $('email-field').classList.toggle('hidden', recovery);
  $('auth-email').required = !recovery;
  $('password-field').classList.toggle('hidden', request);
  $('auth-password').required = !request && !(recovery && passwordUpdated);
  $('auth-password').autocomplete = next === 'signin' ? 'current-password' : 'new-password';
  $('confirm-field').classList.toggle('hidden', !recovery);
  $('confirm-password').required = recovery && !passwordUpdated;
  $('auth-toggle').classList.toggle('hidden', recovery || request);
  $('forgot-password').classList.toggle('hidden', recovery || request);
  $('back-to-signin').classList.toggle('hidden', !recovery && !request);
  $('back-to-signin').textContent = recovery ? 'Cancel and sign out' : 'Back to sign in';
  $('auth-toggle').textContent = next === 'signup' ? 'Already have an account? Sign in' : 'Create an account';
  $('auth-title').textContent = {signin:'Sign in',signup:'Create your account',request:'Reset your password',recovery:'Choose a new password'}[next];
  $('auth-submit').textContent = {signin:'Sign in',signup:'Create account',request:'Send reset link',recovery:'Save new password'}[next];
  if(recovery && passwordUpdated)$('auth-submit').textContent='Finish signing out';
  message('auth-message','');
  $('auth-password').value = '';
  $('confirm-password').value = '';
}
function showSession(session) {
  const nextId = session?.user?.id || null;
  const changed = userId !== nextId;
  if (changed || !nextId || recovering) {
    epoch++;
    $('workout-list').replaceChildren();
    $('workout-form').reset();
    $('load-more').classList.add('hidden');
    $('retry-load').classList.add('hidden');
    message('workout-message',''); pending = null; cursor = null;
  }
  userId = nextId;
  $('tracker').classList.toggle('hidden', !userId || recovering);
  $('auth-panel').classList.toggle('hidden', !!userId && !recovering);
  message('app-message','');
  if (recovering) { if (session) setMode('recovery'); else {clearRecovery();setMode('request');message('auth-message','This reset link expired or was already used. Request a new link.');} }
  else if (userId) { $('account-label').textContent = session.user.email || 'Your private workouts'; if(changed) fetchWorkouts(); }
}
async function api(route, options = {}) {
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('Your session expired. Sign in again.');
  const response = await fetch(route, { ...options, cache:'no-store', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${data.session.access_token}`, ...options.headers }, signal:AbortSignal.timeout(15000) });
  const payload = await response.json().catch(()=>({error:'The server returned an unexpected response.'}));
  if (!response.ok) throw new Error(payload.error || 'Request failed. Please try again.');
  return payload;
}
function renderWorkout(workout) {
  const li = document.createElement('li'); li.dataset.id = workout.id;
  const info = document.createElement('div'); info.className='workout-info';
  const title = document.createElement('strong'); title.className='workout-title'; title.textContent=workout.exercise;
  const details = document.createElement('span'); details.className='workout-details'; details.textContent=`${workout.weight} lbs × ${workout.reps} reps × ${workout.sets} sets`;
  const date = document.createElement('time'); date.className='workout-date'; date.dateTime=workout.created_at; date.textContent=new Date(workout.created_at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
  info.append(title,details,date);
  const remove=document.createElement('button'); remove.type='button'; remove.className='delete-btn'; remove.textContent='×'; remove.setAttribute('aria-label',`Delete ${workout.exercise}`);
  remove.addEventListener('click',async()=>{
    if(remove.disabled || !confirm(`Delete “${workout.exercise}”?`))return;
    const requestEpoch=epoch; remove.disabled=true;
    try{await api(`/api/workouts/${workout.id}`,{method:'DELETE'});if(requestEpoch===epoch){li.remove();if(!$('workout-list').children.length)message('workout-message','No workouts on this page. Add a set or load older workouts.');}}
    catch(error){if(requestEpoch===epoch)message('workout-message',error.message);}
    finally{remove.disabled=false;}
  });
  li.append(info,remove);return li;
}
let loadingEpoch = null, refreshEpoch = null;
async function fetchWorkouts(append=false) {
  if(!userId || recovering)return;
  if(loadingEpoch===epoch){if(!append)refreshEpoch=epoch;return;}
  const requestEpoch=epoch;loadingEpoch=epoch;
  $('load-more').disabled=true;$('retry-load').classList.add('hidden');message('workout-message','Loading workouts…');
  try{
    const data=await api('/api/workouts'+(append&&cursor?`?before=${encodeURIComponent(cursor)}`:''));
    if(requestEpoch!==epoch)return;
    if(!append)$('workout-list').replaceChildren();
    for(const workout of data.workouts)if(!$('workout-list').querySelector(`[data-id="${Number(workout.id)}"]`))$('workout-list').append(renderWorkout(workout));
    cursor=data.nextCursor;$('load-more').classList.toggle('hidden',!cursor);
    message('workout-message',$('workout-list').children.length?'':'No workouts yet. Add your first set.');
  }catch(error){if(requestEpoch===epoch){message('workout-message',error.message);$('retry-load').classList.remove('hidden');}}
  finally{if(loadingEpoch===requestEpoch){loadingEpoch=null;$('load-more').disabled=false;if(refreshEpoch===epoch){refreshEpoch=null;fetchWorkouts();}}}
}
$('workout-form').addEventListener('input',()=>{if(!saving)pending=null;});
$('workout-form').addEventListener('submit',async event=>{
  event.preventDefault();if(saving||!userId)return;
  const body={exercise:$('exercise').value.trim(),weight:Number($('weight').value),reps:Number($('reps').value),sets:Number($('sets').value)};
  const signature=JSON.stringify(body);if(!pending||pending.signature!==signature)pending={signature,id:crypto.randomUUID()};
  const requestEpoch=epoch;saving=true;$('add-btn').disabled=true;$('add-btn').textContent='Saving…';
  document.querySelectorAll('#workout-form input').forEach(input=>{input.disabled=true;});
  try{await api('/api/workouts',{method:'POST',body:JSON.stringify({...body,client_request_id:pending.id})});if(requestEpoch===epoch){$('workout-form').reset();pending=null;await fetchWorkouts();}}
  catch(error){if(requestEpoch===epoch)message('workout-message',error.message);}
  finally{saving=false;$('add-btn').disabled=false;$('add-btn').textContent='Add Set';document.querySelectorAll('#workout-form input').forEach(input=>{input.disabled=false;});}
});
$('retry-load').addEventListener('click',()=>fetchWorkouts());
$('load-more').addEventListener('click',()=>fetchWorkouts(true));
$('auth-toggle').addEventListener('click',()=>{if(!authBusy)setMode(mode==='signup'?'signin':'signup');});
$('forgot-password').addEventListener('click',()=>{if(!authBusy)setMode('request');});
$('back-to-signin').addEventListener('click',async()=>{if(authBusy)return;if(recovering){const {error}=await client.auth.signOut({scope:'local'});if(error){message('auth-message','Could not finish signing out. Try again.');return;}clearRecovery();}setMode('signin');});
$('sign-out').addEventListener('click',async()=>{
  $('sign-out').disabled=true;
  try{const{error}=await client.auth.signOut({scope:'local'});if(error)throw error;setMode('signin');}
  catch{message('workout-message','Could not sign out. Please try again.');}
  finally{$('sign-out').disabled=false;}
});
$('auth-form').addEventListener('submit',async event=>{
  event.preventDefault();if(authBusy)return;
  const email=$('auth-email').value.trim(),password=$('auth-password').value;
  if(mode==='recovery'&&!passwordUpdated&&password!==$('confirm-password').value){message('auth-message','The passwords must match.');return;}
  if(mode==='request'&&Date.now()-resetSentAt<60000){message('auth-message','Please wait a minute before requesting another link.');return;}
  authBusy=true;$('auth-submit').disabled=true;message('auth-message','Please wait…');
  try{
    if(mode==='signin'){
      const{error}=await client.auth.signInWithPassword({email,password});if(error)throw new Error('Could not sign in. Check your details and email confirmation.');
    }else if(mode==='signup'){
      const{data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin}});
      if(error)throw new Error(error.status===429?'Too many attempts. Please wait and try again.':'Could not create an account. Check your details or try signing in.');
      if(!data.session){setMode('signin');message('auth-message','Check your email for a confirmation link, then sign in.');}
    }else if(mode==='request'){
      const{error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin});if(error)throw new Error('Unable to send a reset link right now. Wait and try again.');
      resetSentAt=Date.now();message('auth-message','If an account exists for that address, a reset link will arrive shortly.');
    }else{
      if(!passwordUpdated){
        const{error}=await client.auth.updateUser({password});if(error)throw new Error('Unable to update your password. Check the password requirements or request a new link.');
        passwordUpdated=true;
        $('auth-password').value='';$('confirm-password').value='';
        $('auth-password').required=false;$('confirm-password').required=false;
        $('auth-submit').textContent='Finish signing out';
      }
      // Finish recovery before normal application access is allowed.
      const signedOut=await client.auth.signOut();
      if(signedOut.error)throw new Error('Your password was updated. Select Finish signing out to retry, or Cancel and sign out.');
      clearRecovery();setMode('signin');message('auth-message','Your password was updated. Sign in with your new password.');
    }
  }catch(error){message('auth-message',error.message);}
  finally{authBusy=false;$('auth-submit').disabled=false;}
});
async function initialize(){
  try{
    const response=await fetch('/api/config',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error();
    const config=await response.json();client=createClient(config.supabaseUrl,config.supabasePublishableKey);
    client.auth.onAuthStateChange((event,session)=>{
      if(event==='PASSWORD_RECOVERY'){recovering=true;try{sessionStorage.setItem('iron-forge:recovery',String(Date.now()));}catch{}}
      setTimeout(()=>showSession(session),0);
    });
    const{data,error}=await client.auth.getSession();if(error)throw error;showSession(data.session);
    // Callback tokens were consumed by the SDK; remove them from browser history.
    if(location.hash.includes('access_token')||location.hash.includes('error'))history.replaceState(null,'',location.pathname);
  }catch{message('app-message','Iron Forge could not start. Please refresh and try again.');}
}
initialize();
