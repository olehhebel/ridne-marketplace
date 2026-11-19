const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');
const base=path.resolve(__dirname,'..');
const profile={user_id:'11111111-1111-4111-8111-111111111111',marketplace_user_id:'22222222-2222-4222-8222-222222222222',account_type:'buyer',display_name:'Тест',email:'test@example.invalid',category_slugs:[],oblast:'Київська',locality:'Миронівка'};
function setup(page='index.html',logged=false,seller=false,options={}){const errors=[];const calls=[];const dom=new JSDOM(fs.readFileSync(path.join(base,page),'utf8').replace(/<script[\s\S]*?<\/script>/g,''),{url:'https://ridne.store/'+(page==='index.html'?'':page.replace('index.html','')),runScripts:'dangerously',pretendToBeVisual:true});const w=dom.window;
 w.addEventListener('error',e=>errors.push(e.error));w.matchMedia=()=>({matches:false});w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.RIDNE_CONFIG={url:'https://test.invalid',key:'test'};
 const p={...profile,account_type:seller?'seller':'buyer'};const data={products:[],orders:[],requests:[],seller:seller?{id:'33333333-3333-4333-8333-333333333333',display_name:'Пасіка',verification_status:'verified',fulfillment_options:['pickup']}:null};
 w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:logged?{access_token:'test-session',user:{id:p.user_id,email:p.email,user_metadata:{full_name:'Олена'}}}:null}}),signUp:async(args)=>{calls.push({action:'signup',...args});return {data:{session:null},error:null};},signInWithPassword:async(args)=>{calls.push({action:'login',...args});return {error:{code:'invalid_credentials'}};},signInWithOtp:async()=>({error:null}),signOut:async()=>({})},from:(table)=>{const q={select(){return q},eq(){return q},neq(){return q},order(){return q},limit(){return q},maybeSingle:async()=>({data:logged && !options.firstLogin?p:null,error:null}),then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)}};return q;}})};
 w.fetch=async(url,requestOptions)=>{if(url.endsWith('/settings'))return {ok:true,json:async()=>({external:options.providers||{}})};const body=JSON.parse(requestOptions.body);calls.push(body);let result=body.action==='ensure-profile'?{profile:p}:body.action==='dashboard'?data:body.action==='save-product'?{product:{id:'44444444-4444-4444-8444-444444444444'}}:body.action==='create-request'?{request:{id:'55555555-5555-4555-8555-555555555555',product_title:'Мед',quantity:2,unit:'кг',total:440,delivery_method:'pickup',status:'requested'}}:{};return {ok:true,json:async()=>result};};
 for(const file of ['marketplace/market.js','marketplace/flows.js',...(page==='index.html'?['marketplace/showcase.js']:[])]){const script=w.document.createElement('script');script.textContent=fs.readFileSync(path.join(base,file),'utf8');w.document.body.append(script);}
 return {w,dom,errors,calls};}
const tick=()=>new Promise(r=>setTimeout(r,30));
test('all 25 showcase slots retain actionable controls after async catalogue render',async()=>{const {w,dom,errors}=setup();await tick();assert.equal(w.document.querySelectorAll('[data-sell-category]').length,25);w.document.querySelector('[data-sell-category="honey"]').click();await tick();assert.ok(w.document.querySelector('#flow-modal').open);assert.match(w.document.querySelector('#flow-title').textContent,/Увійдіть/);const seed=JSON.parse(w.sessionStorage.getItem('ridne-seller-intent'));assert.equal(seed.category_slug,'honey');assert.match(seed.title,/Мед/);assert.deepEqual(errors,[]);dom.window.close();});
test('registered buyer can add honey in same account and submits origin and delivery',async()=>{const {w,dom,calls,errors}=setup('index.html',true);await tick();w.document.querySelector('[data-sell-category="honey"]').click();await tick();const f=w.document.querySelector('#quick-product');assert.ok(f);assert.equal(f.elements.category_slug.value,'honey');assert.equal(f.elements.title.value,'Мед різнотрав’я');f.elements.price_uah.value='220';f.elements.available_quantity.value='5';f.elements.description.value='Мед з власної пасіки';f.elements.storage_requirements.value='Сухе місце';f.querySelector('[value=pickup]').checked=true;f.elements.consent.checked=true;f.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await tick();assert.equal(calls.filter(x=>x.action==='activate-seller').length,1);const saved=calls.find(x=>x.action==='save-product').product;assert.equal(saved.category_slug,'honey');assert.equal(saved.origin_locality,'Миронівка');assert.deepEqual(saved.fulfillment_options,['pickup']);assert.ok(calls.some(x=>x.action==='submit-product'));assert.deepEqual(errors,[]);dom.window.close();});
test('both account roles render requests and editable profile with no runtime errors',async()=>{for(const seller of [false,true]){const {w,dom,errors}=setup('account/index.html',true,seller);await tick();assert.ok(w.document.querySelector('#requests'));assert.ok(w.document.querySelector('#edit-profile'));w.document.querySelector('#edit-profile').click();assert.ok(w.document.querySelector('#profile-form'));assert.deepEqual(errors,[]);dom.window.close();}});
test('guest request uses real product id and displayed calculated total, without authentication',async()=>{const {w,dom,calls,errors}=setup();await tick();w.openPurchase({id:'77777777-7777-4777-8777-777777777777',title:'Мед',price_uah:220,unit:'кг',available_quantity:10,fulfillment_options:['pickup']},'purchase');const f=w.document.querySelector('#purchase-form');f.elements.quantity.value='2';f.elements.quantity.dispatchEvent(new w.Event('input'));assert.match(w.document.querySelector('#request-total').textContent,/440/);f.elements.buyer_name.value='Тест';f.elements.buyer_contact.value='test@example.invalid';f.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await tick();assert.equal(calls[0].action,'create-request');assert.equal(calls[0].request.quantity,'2');assert.match(w.document.querySelector('#flow-title').textContent,/надіслано/);assert.deepEqual(errors,[]);dom.window.close();});

test('a first sign-in provisions a profile, a returning sign-in reuses it', async () => {
  for (const firstLogin of [true,false]) {
    const {w,dom,calls,errors} = setup('account/index.html',true,false,{firstLogin});
    await tick();
    const created = calls.filter(call => call.action === 'ensure-profile');
    assert.equal(created.length,firstLogin ? 1 : 0);
    if (firstLogin) assert.equal(created[0].name,'Олена');
    assert.ok(w.document.querySelector('#requests'));
    assert.deepEqual(errors,[]);
    dom.window.close();
  }
});

test('member registration validates matching passwords and requests a confirmation link', async () => {
  const {w,calls,dom} = setup('signup/index.html');
  const form = w.document.querySelector('.member-form');
  form.elements.full_name.value='Олена';
  form.elements.email.value='member@example.invalid';
  form.elements.password.value='test-password';
  form.elements.repeat.value='wrong-password';
  form.requestSubmit();
  assert.match(form.textContent,/Паролі мають збігатися/);
  assert.equal(calls.length,0);
  form.elements.repeat.value='test-password';
  form.requestSubmit();
  await tick();
  const request = calls.find(call => call.action === 'signup');
  assert.equal(request.options.emailRedirectTo,'https://ridne.store/account/');
  assert.equal(request.options.data.full_name,'Олена');
  assert.match(w.document.querySelector('#member-signup').textContent,/Перевірте пошту/);
  dom.window.close();
});
test('guest account and seller modal offer the same two choices', async () => {
  for (const page of ['account/index.html','index.html']) {
    const {w,dom,calls}=setup(page);
    await tick();
    if (page==='index.html') {w.document.querySelector('.maker-join').click();await tick();}
    assert.equal(w.document.querySelectorAll('.member-choices button').length,2);
    w.document.querySelector('[data-mode="login"]').click();
    const form=w.document.querySelector('.member-form');
    assert.equal(form.querySelectorAll('input').length,2);
    form.elements.email.value='member@example.invalid';form.elements.password.value='old-password';
    form.requestSubmit();await tick();
    assert.ok(calls.some(call=>call.action==='login'));
    w.document.querySelector('.member-back').click();w.document.querySelector('[data-mode="signup"]').click();
    assert.equal(w.document.querySelectorAll('.member-form input').length,4);
    dom.window.close();
  }
});
