import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import './index.css';import {AuthProvider,useAuth} from './auth';import {CalProvider} from './store';
import Login from './pages/Login';import Calendar from './pages/Calendar';import EventDetails from './pages/EventDetails';
function Guard({children}){const {user,loading}=useAuth();if(loading)return <p className="p-6">Restoring session…</p>;return user?children:<Navigate to="/login" replace/>}
createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><CalProvider><Routes>
<Route path="/login" element={<Login/>}/>
<Route path="/" element={<Guard><Calendar/></Guard>}/>
<Route path="/events/:id" element={<Guard><EventDetails/></Guard>}/>
<Route path="*" element={<Navigate to="/" replace/>}/></Routes></CalProvider></AuthProvider></BrowserRouter>);
