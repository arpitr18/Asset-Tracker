import React,{useState} from 'react';
import {api,setSession} from '../services/api.js';
import {Brand} from '../components/Layout.jsx';
import {Field,Notice} from '../components/Ui.jsx';

export function Login({onLogin,initialError}){
  const [error,setError]=useState(initialError||''),[busy,setBusy]=useState(false);
  async function login(event){
    event.preventDefault();setError('');setBusy(true);
    try{
      const data=Object.fromEntries(new FormData(event.currentTarget));
      const result=await api('/auth/demo',{method:'POST',data});
      if(result.employee.role!=='ADMIN')throw new Error('Super Admin access is required.');
      setSession(result.token);onLogin(result.employee);
    }catch(failure){setError(failure.message);}finally{setBusy(false);}
  }
  return <main className="login-page"><div className="login-brand"><Brand/></div><form className="panel login-form" onSubmit={login}>
    <h1>Super Admin sign in</h1><Notice error={error}/><Field label="Employee email"><input type="email" name="email" autoComplete="username" required/></Field>
    <Field label="Password"><input type="password" name="password" autoComplete="current-password" required/></Field>
    <button className="button" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
  </form></main>;
}
