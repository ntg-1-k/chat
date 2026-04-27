/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Hash, 
  Plus, 
  Send, 
  Smile, 
  AtSign, 
  MoreVertical, 
  Zap, 
  Globe, 
  Activity,
  Terminal,
  ShieldCheck,
  Cpu,
  User,
  MessageSquare,
  Lock,
  Loader2,
  ChevronRight,
  Wifi,
  ShieldAlert as ShieldText
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { auth, db, googleProvider } from './lib/firebase.ts';
import { handleFirestoreError, OperationType } from './lib/errorHandlers.ts';
import { cn } from './lib/utils';
import type { Message, Hub, UserProfile } from './types.ts';
import { getOracleResponse } from './services/geminiService.ts';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [input, setInput] = useState('');
  const [activeHub, setActiveHub] = useState<Hub | null>(null);
  const [oracleQuery, setOracleQuery] = useState('');
  const [oracleResponse, setOracleResponse] = useState<string | null>(null);
  const [isOracleLoading, setIsOracleLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync user profile
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            status: 'online',
            lastSeen: Date.now()
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Hubs Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'hubs'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hubList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hub));
      setHubs(hubList);
      
      // Seed default hubs if none exist
      if (hubList.length === 0) {
        const seedHubs = async () => {
          try {
            await addDoc(collection(db, 'hubs'), { 
              name: 'Global-Central', 
              topic: 'Public relay for general discussion and world-building.',
              createdAt: Date.now()
            });
          } catch (e) {
            console.error("Hub Seeding Failed:", e);
          }
        };
        seedHubs();
      }

      if (hubList.length > 0 && !activeHub) {
        setActiveHub(hubList[0]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hubs');
    });
    return () => unsubscribe();
  }, [user, activeHub]);

  // Messages Listener
  useEffect(() => {
    if (!user || !activeHub) return;
    const q = query(
      collection(db, 'hubs', activeHub.id, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `hubs/${activeHub?.id}/messages`);
    });
    return () => unsubscribe();
  }, [user, activeHub]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (user) scrollToBottom();
  }, [messages, user]);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Failed:", error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user || !activeHub) return;
    const messageContent = input.trim();
    setInput('');
    
    try {
      await addDoc(collection(db, 'hubs', activeHub.id, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || 'Unknown User',
        content: messageContent,
        timestamp: Date.now(),
        hubId: activeHub.id
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `hubs/${activeHub.id}/messages`);
    }
  };

  const handleOracleSubmit = async () => {
    if (!oracleQuery.trim()) return;
    setIsOracleLoading(true);
    setOracleResponse(null);
    const result = await getOracleResponse(oracleQuery);
    setOracleResponse(result);
    setIsOracleLoading(false);
  };

  if (!user) {
    return (
      <div className="h-screen w-full bg-[#020617] flex items-center justify-center font-sans p-6 text-slate-300">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-md p-8 glass-panel rounded-lg border border-slate-800 shadow-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-indigo-500/10 pointer-events-none"></div>
          
          <div className="relative text-center space-y-8">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="mx-auto w-24 h-24 border-2 border-dashed border-sky-500/30 rounded-full flex items-center justify-center"
            >
              <div className="w-16 h-16 bg-sky-500/20 rounded-sm flex items-center justify-center text-sky-400 font-bold text-3xl shadow-[0_0_20px_rgba(14,165,233,0.2)]">
                Ω
              </div>
            </motion.div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-slate-100 tracking-tighter uppercase italic">OmniLink</h1>
                <p className="text-[10px] text-slate-500 font-mono tracking-[0.3em] uppercase">Global Neural Network v4.0</p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-[280px] mx-auto italic font-medium">
                Establish a secure uplink to the global relay network. High-density encryption enforced.
              </p>
            </div>

            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(14,165,233,0.2)" }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                disabled={isAuthenticating}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-4 rounded text-xs uppercase tracking-widest transition-all shadow-lg shadow-sky-900/20 flex items-center justify-center gap-3 group"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  <>
                    Sign In with Google
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </motion.button>
              <p className="text-[9px] text-slate-600 uppercase font-bold tracking-tighter opacity-60">Authorized identities only</p>
            </div>

            <div className="flex justify-between items-center text-[9px] font-mono text-slate-600 pt-6 border-t border-slate-800/50">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-sky-500" /> SECURE_LAYER: ON</span>
              <span className="flex items-center gap-1.5 opacity-60 font-medium">HOST: ASIA-SE1</span>
            </div>
          </div>

          {/* Glitch Overlay Effect */}
          {isAuthenticating && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0.2, 0.5, 0] }}
              transition={{ duration: 0.3, repeat: Infinity }}
              className="absolute inset-0 bg-sky-500/10 mix-blend-overlay pointer-events-none"
            />
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-screen w-full bg-slate-950 text-slate-300 font-sans overflow-hidden select-none"
    >
      {/* Top Navigation Bar */}
      <nav className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/90 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 10 }}
            className="w-8 h-8 bg-sky-500 rounded-sm flex items-center justify-center font-bold text-slate-950 shadow-[0_0_15px_rgba(14,165,233,0.4)] cursor-pointer"
          >
            Ω
          </motion.div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-100 uppercase flex items-center">
            OmniLink 
            <span className="text-sky-500 font-mono text-[10px] ml-2 tracking-widest animate-pulse-slow">v4.0.2-alpha</span>
          </h1>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            <span className="text-emerald-400">GLOBAL_NET: ONLINE</span>
          </div>
          <div className="text-slate-500">LATENCY: <span className="text-sky-400">24ms</span></div>
          <div className="flex items-center gap-4 border-l border-slate-800 pl-8">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs overflow-hidden group">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <motion.div whileHover={{ y: -2 }} className="text-sky-400 font-bold uppercase tracking-tighter">
                  {user.displayName?.substring(0, 2).toUpperCase() || 'JD'}
                </motion.div>
              )}
            </div>
            <span className="text-slate-100 uppercase tracking-tighter font-bold">{user.displayName || 'ANON_USER'}</span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar: Server/Chat List */}
        <aside className="w-64 border-r border-slate-800 bg-slate-950/50 flex flex-col hidden lg:flex">
          <div className="p-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold transition-all shadow-[0_0_20px_rgba(2,132,199,0.3)] mb-6 flex items-center justify-center gap-2"
            >
              <Plus className="w-3 h-3" />
              NEW TRANSMISSION
            </motion.button>
            
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-3 flex items-center gap-2">
                <Zap className="w-3 h-3 text-sky-500" /> Active Hubs
              </p>
              {hubs.map(hub => (
                <motion.div 
                  key={hub.id}
                  onClick={() => setActiveHub(hub)}
                  whileHover={{ x: 4 }}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded cursor-pointer transition-all duration-200 group",
                    activeHub?.id === hub.id ? "bg-slate-900/80 border-l-2 border-sky-500 text-sky-400" : "hover:bg-slate-900/50 text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Hash className={cn("w-4 h-4", activeHub?.id === hub.id ? "text-sky-400" : "text-slate-600 group-hover:text-slate-400")} />
                  <span className="text-sm font-medium tracking-tight uppercase tracking-tighter">{hub.name}</span>
                  {hub.unreadCount && (
                    <span className="ml-auto text-[10px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded font-mono font-bold">1200</span>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-8 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-3 flex items-center gap-2">
                <AtSign className="w-3 h-3 text-sky-500" /> Direct Signals
              </p>
              {[
                { name: 'S. Arasaka', status: 'offline', color: 'bg-slate-600' },
                { name: 'Motoko_K', status: 'online', color: 'bg-emerald-500' },
                { name: 'Lain.iwakura', status: 'away', color: 'bg-amber-500' },
              ].map(user => (
                <motion.div 
                  key={user.name}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3 p-2 hover:bg-slate-900/50 rounded cursor-pointer text-slate-400 hover:text-slate-200 group transition-all"
                >
                  <div className={cn("w-2 h-2 rounded-full", user.color, user.status === 'online' && "animate-pulse shadow-[0_0_5px_currentColor]")}></div>
                  <span className={cn("text-xs font-bold tracking-tight", user.status === 'offline' && "italic text-slate-500 font-normal")}>
                    {user.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="mt-auto p-4 border-t border-slate-900 bg-slate-950/80">
            <div className="flex justify-between items-center text-[10px] text-slate-500 mb-2 font-mono">
              <span className="flex items-center gap-1 italic opacity-70"><Cpu className="w-2.5 h-2.5" /> DATA UPLINK</span>
              <span className="font-bold text-sky-800">78.4%</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "78.4%" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]"
              ></motion.div>
            </div>
          </div>
        </aside>

        {/* Central Chat Interface */}
        <main className="flex-1 flex flex-col bg-slate-950/30 relative">
          {/* Chat Header */}
          <div className="h-12 border-b border-slate-800 flex items-center px-6 gap-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="text-sky-400 font-mono flex items-center gap-2">
              <Hash className="w-4 h-4" />
              <span className="tracking-tighter font-bold">[{activeHub?.name.toUpperCase() || 'SELECT_HUB'}]</span>
            </div>
            <div className="h-4 w-[1px] bg-slate-800"></div>
            <div className="text-[11px] text-slate-500 truncate hidden md:block italic font-medium">
              {activeHub?.topic || 'Select a hub to begin transmission'}
            </div>
            <div className="ml-auto flex items-center gap-4">
              <button 
                onClick={() => {
                  const name = prompt('Enter new Hub name:');
                  if (name) {
                    addDoc(collection(db, 'hubs'), { 
                      name, 
                      topic: 'A new discussion hub.',
                      createdAt: Date.now() 
                    });
                  }
                }}
                className="text-slate-500 hover:text-sky-400 transition-colors p-1"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button className="text-slate-500 hover:text-slate-300 transition-colors"><MoreVertical className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.9, x: msg.senderId === user.uid ? 20 : -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ 
                    type: "spring", 
                    damping: 20, 
                    stiffness: 150,
                    delay: Math.min(idx * 0.05, 0.3)
                  }}
                  className={cn(
                    "flex gap-4 group",
                    msg.senderId === user.uid ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-sm border flex items-center justify-center font-mono text-[10px] font-black shrink-0 transition-all group-hover:shadow-[0_0_15px_currentColor]",
                    msg.senderId === user.uid 
                      ? "bg-sky-900/20 border-sky-500/30 text-sky-400 shadow-sky-500/10" 
                      : "bg-indigo-900/20 border-indigo-500/30 text-indigo-400 shadow-indigo-500/10"
                  )}>
                    {msg.senderName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className={cn(
                    "flex flex-col max-w-[80%]",
                    msg.senderId === user.uid ? "items-end text-right" : "items-start"
                  )}>
                    <div className={cn(
                      "flex items-baseline gap-2 mb-1.5",
                      msg.senderId === user.uid ? "flex-row-reverse" : "flex-row"
                    )}>
                      <span className="font-black text-[12px] text-slate-100 uppercase tracking-tighter">{msg.senderName}</span>
                      <span className="text-[9px] text-slate-500 font-mono italic opacity-60">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false })}
                      </span>
                    </div>
                    <motion.div 
                      layout
                      className={cn(
                        "glass-panel p-3.5 px-5 rounded-2xl text-[13px] text-slate-300 leading-relaxed transition-all duration-500 group-hover:bg-white/[0.03]",
                        msg.senderId === user.uid 
                          ? "bg-sky-600/15 border-sky-500/40 rounded-tr-none text-sky-50 shadow-[0_4px_20px_rgba(14,165,233,0.1)]" 
                          : "rounded-tl-none border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                      )}
                    >
                      {msg.content}
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar (Gmail-style) */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800">
            <div className="relative group max-w-5xl mx-auto">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 rounded-lg blur opacity-10 group-hover:opacity-30 transition duration-1000 group-focus-within:opacity-50 group-focus-within:duration-200"></div>
              <div className="relative bg-[#020617] rounded-lg flex items-center p-2.5 gap-3 border border-slate-800">
                <motion.button 
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) alert(`File ready for upload: ${file.name}`);
                    };
                    input.click();
                  }}
                  className="w-9 h-9 rounded-md hover:bg-slate-900 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={activeHub ? `Type a message to world...` : "Select a relay..."} 
                  className="flex-1 bg-transparent border-none outline-none text-sm text-slate-100 placeholder:text-slate-700 font-bold tracking-tight h-10"
                />
                <div className="flex items-center gap-2 pr-2 border-l border-slate-900 pl-4">
                  <div className="relative group/emoji">
                    <button className="p-2 text-slate-600 hover:text-sky-400 transition-all hover:scale-110"><Smile className="w-4 h-4" /></button>
                    <div className="absolute bottom-full right-0 mb-2 p-2 glass-panel border border-slate-800 rounded-lg hidden group-hover/emoji:grid grid-cols-4 gap-1 z-50">
                      {['⚡', '🔥', '🚀', '✨', '👾', '🎮', '🎧', '⛩️'].map(emoji => (
                        <button 
                          key={emoji} 
                          onClick={() => setInput(prev => prev + emoji)}
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="p-2 text-slate-600 hover:text-sky-400 transition-all hover:scale-110"><AtSign className="w-4 h-4" /></button>
                  <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(14,165,233,0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2 rounded-sm text-[11px] font-black uppercase tracking-tighter transition-all flex items-center gap-2 shadow-lg"
                  >
                    SEND <Send className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Info & Support Oracle */}
        <aside className="w-80 border-l border-slate-800 bg-slate-950 p-6 flex flex-col gap-8 hidden xl:flex overflow-y-auto scrollbar-hide">
          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-5 flex items-center gap-2 opacity-80">
              <Activity className="w-3.5 h-3.5 text-sky-500" /> Channel Metrics
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-slate-900/40 p-4 border border-slate-800/60 rounded-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12">
                  <Globe className="w-12 h-12 text-sky-400" />
                </div>
                <div className="text-[9px] text-slate-600 uppercase font-black mb-1.5 flex justify-between items-center">
                  Active Nodes 
                  <span className="text-emerald-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span> Sync
                  </span>
                </div>
                <div className="text-2xl font-mono font-bold text-slate-100 neon-glow tracking-tighter">1,244.02</div>
              </div>
              <div className="bg-slate-900/40 p-4 border border-slate-800/60 rounded-md group">
                <div className="text-[9px] text-slate-600 uppercase font-black mb-3">Relay Health</div>
                <div className="w-full h-8 flex items-end gap-1 px-1">
                  {[40, 70, 45, 90, 65, 30, 85, 55, 95, 40].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: i * 0.05, duration: 1, repeat: Infinity, repeatType: 'reverse' }}
                      className="flex-1 bg-sky-500/20 border-t-2 border-sky-500/50"
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="p-6 border border-dashed border-sky-500/30 rounded-xl bg-sky-950/10 relative group">
            <div className="absolute inset-0 bg-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Support Oracle
            </h3>
            <div className="space-y-4">
              {oracleResponse && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] text-slate-300 leading-relaxed font-medium bg-slate-950/50 p-3 rounded border border-white/5 italic"
                >
                  "{oracleResponse}"
                </motion.div>
              )}
              <div className="relative">
                <textarea 
                  value={oracleQuery}
                  onChange={(e) => setOracleQuery(e.target.value)}
                  placeholder="Need assistance?" 
                  className="w-full bg-[#020617] border border-slate-800 rounded p-3 text-[11px] font-mono text-slate-200 outline-none focus:border-sky-500/50 transition-colors resize-none h-20"
                />
                <button 
                  onClick={handleOracleSubmit}
                  disabled={isOracleLoading}
                  className="absolute bottom-2 right-2 p-2 hover:bg-slate-800 rounded-md text-sky-500 transition-colors disabled:opacity-50"
                >
                  {isOracleLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </section>

          <section className="mt-auto space-y-5">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" /> Core Status
            </h3>
            <div className="space-y-3.5">
              {[
                { label: 'BUFFER_ZONE', status: 'STABLE', color: 'text-emerald-500' },
                { label: 'SYNC_ARRAY', status: 'ACTIVE', color: 'text-emerald-500' },
                { label: 'THREAT_LOG', status: 'ZERO', color: 'text-slate-400' },
              ].map(stat => (
                <div key={stat.label} className="flex justify-between items-center text-[10px] font-mono font-bold">
                  <span className="text-slate-600 tracking-tighter flex items-center gap-2">
                    <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                    {stat.label}
                  </span>
                  <span className={cn(stat.color, "tracking-widest")}>{stat.status}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

      </div>

      {/* Bottom Status Bar */}
      <footer className="h-6 border-t border-slate-800 flex items-center justify-between px-4 bg-slate-950 text-[9px] font-mono text-slate-500">
        <div className="flex items-center gap-6 uppercase tracking-[0.2em] font-black">
          <span className="text-sky-600 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> LINK: ACTIVE</span>
          <span className="hover:text-slate-300 cursor-help transition-colors hidden sm:inline">Channel: #Global</span>
          <span className="hover:text-slate-300 cursor-help transition-colors hidden sm:inline">Uplink: 2.4gbps</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-slate-500 font-bold">EPOCH: {Date.now().toString().slice(0, 8)}</span>
          <span className="text-slate-400 underline underline-offset-2 cursor-pointer hover:text-sky-400 transition-colors uppercase font-black">Protocols</span>
          <span className="text-slate-400 font-bold">© 2077 OMNILINK</span>
        </div>
      </footer>
    </motion.div>
  );
}
