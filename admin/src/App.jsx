import {Navigate,Route,Routes,useLocation,useNavigate} from 'react-router-dom';
import { Login } from './screens/Login.jsx';
import React,{useEffect,useState} from 'react';
import {api,setSession} from './services/api.js';
import {settings} from './services/settings.js';
import {Layout,sections} from './components/Layout.jsx';
import {Notice} from './components/Ui.jsx';
import {Dashboard} from './screens/Dashboard.jsx';
import {Users} from './screens/Users.jsx';
import {AssetMaster} from './screens/AssetMaster.jsx';
import {SurveyBuilder} from './screens/SurveyBuilder.jsx';
import {Excel} from './screens/Excel.jsx';
import {Settings,Audit} from './screens/Settings.jsx';

export default function App(){
  const [user,setUser]=useState(null),[loading,setLoading]=useState(true),[notice,setNotice]=useState('');
  const location=useLocation(),navigate=useNavigate();
  const screen=location.pathname.split('/')[1];
  const [config,setConfig]=useState(null),[configError,setConfigError]=useState('');
  const search=new URLSearchParams(location.search).get('q')||'';
  const logout=()=>{setSession(null);setUser(null);setConfig(null);setNotice('');};
  useEffect(()=>{
    const expired=()=>{logout();setNotice('Session expired. Sign in again.');};
    window.addEventListener('admin-session-expired',expired);
    const controller=new AbortController();
    if(sessionStorage.getItem('tracker.admin.token')){
      api('/me',{signal:controller.signal}).then(me=>{
        if(me.role!=='ADMIN')return expired();
        setUser(me);
      }).catch(()=>{}).finally(()=>setLoading(false));
    }else setLoading(false);
    return ()=>{controller.abort();window.removeEventListener('admin-session-expired',expired);};
  },[]);
  useEffect(()=>{
    if(!user)return;
    const controller=new AbortController();
    setConfigError('');
    settings.load(controller.signal).then(setConfig).catch(error=>{if(!controller.signal.aborted)setConfigError(error.message);});
    return ()=>controller.abort();
  },[user]);
  if(loading)return <main className="login-page" role="status">Loading admin console…</main>;
  if(location.pathname==='/'){
    const legacy=location.hash.slice(1);
    return <Navigate to={sections.some(([id])=>id===legacy)?'/'+legacy:'/dashboard'} replace/>;
  }
  if(!user){
    if(screen!=='login')return <Navigate to="/login" state={{from:location.pathname+location.search}} replace/>;
    return <Login key={notice} initialError={notice} onLogin={employee=>{
      setUser(employee);navigate(location.state?.from||'/dashboard',{replace:true});
    }}/>;
  }
  if(!sections.some(([id])=>id===screen))return <Navigate to="/dashboard" replace/>;
  const dateFormat=config?.dateFormat;
  return <Layout screen={screen} user={user} logout={logout}
    onSearch={value=>navigate({pathname:'/users',search:value.trim()?new URLSearchParams({q:value.trim()}).toString():''})}>
    <Notice error={configError}/>
    <Routes>
      <Route path="/dashboard" element={<Dashboard dateFormat={dateFormat}/>}/>
      <Route path="/users" element={<Users initialSearch={search} dateFormat={dateFormat} currentId={user.id}/>}/>
      <Route path="/surveys" element={<SurveyBuilder dateFormat={dateFormat}/>}/>
      <Route path="/assets" element={<AssetMaster/>}/>
      {['stores','stockists','imports'].map(path=><Route key={path} path={'/'+path}
        element={<Excel key={path} kind={path==='imports'?null:path} dateFormat={dateFormat}/>}/>)}
      <Route path="/audit" element={<Audit dateFormat={dateFormat}/>}/>
      <Route path="/settings" element={config?<Settings config={config} onSaved={setConfig}/>:<p>{configError?'Settings unavailable.':'Loading settings?'}</p>}/>
      <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
    </Routes>
  </Layout>;
}
