import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string | null;
  user_type: 'cliente' | 'produtor';
  avatar_url: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  console.log('[AuthProvider] render, loading:', loading, 'session:', !!session);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data) {
      setProfile(data as unknown as Profile);
    }
    // Check admin role
    const { data: hasRole } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    setIsAdmin(!!hasRole);
  };

  useEffect(() => {
    // Safety timeout: never stay loading forever
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) console.warn('[AuthProvider] Loading timeout - forcing ready');
        return false;
      });
    }, 5000);

    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('[AuthProvider] onAuthStateChange', _event, !!session);
        setSession(session);
        if (session?.user) {
          // Defer profile fetch to avoid Supabase deadlock
          setTimeout(() => {
            if (!mounted) return;
            fetchProfile(session.user.id).catch(e => {
              console.error('Error fetching profile:', e);
            }).finally(() => {
              if (mounted) setLoading(false);
            });
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthProvider] getSession result', !!session);
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).catch(e => {
          console.error('Error fetching profile:', e);
        }).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(e => {
      console.error('[AuthProvider] getSession error', e);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
