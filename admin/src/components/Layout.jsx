import {NavLink} from 'react-router-dom';
import React,{useState} from 'react';
import {Icon,Badge} from './Ui.jsx';
export const sections=[
  ['dashboard','Dashboard'],['users','User Management'],['stores','Store Master'],
  ['surveys','Survey Builder'],['assets','Asset Master'],['stockists','Distributor / Locate RD'],['imports','Excel Imports'],
  ['audit','Audit Activity'],['settings','Settings'],
];
export function Brand(){return <div className="brand"><strong>Mondelēz</strong><small>International</small><em>Cadbury</em><span>Visi Cooler<br/>Store Tracker</span><b>Super Admin Panel</b></div>;}
export function Layout({screen,user,logout,onSearch,children}){
  const [search,setSearch]=useState(''),[open,setOpen]=useState(false);
  return <div className="shell">
    <aside className={open?'sidebar open':'sidebar'}><Brand/><nav aria-label="Administration">{sections.map(([id,label])=><NavLink aria-current={id===screen?'page':undefined} key={id} to={'/'+id} end onClick={()=>setOpen(false)}><Icon name={id}/>{label}</NavLink>)}</nav></aside>
    <div className="workspace">
      <header className="topbar">
        <button className="mobile-menu ghost" onClick={()=>setOpen(!open)} aria-label="Toggle navigation">☰</button>
        <h1>{screen==='dashboard'?'Super Admin Dashboard':sections.find(([id])=>id===screen)?.[1]}</h1>
        <form className="global-search" onSubmit={event=>{event.preventDefault();onSearch(search);}}><Icon name="search"/><input aria-label="Search users by name or email" placeholder="Search users by name or email…" value={search} onChange={event=>setSearch(event.target.value)}/></form>
        <div className="account"><span className="avatar">{user.name.trim().slice(0,2).toUpperCase()}</span><strong>{user.name}</strong><Badge>Super Admin</Badge><button className="ghost" onClick={logout}>Sign out</button></div>
      </header>
      <main>{children}</main>
    </div>
  </div>;
}
