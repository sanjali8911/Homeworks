/**
 * CampusCoin Supabase Integration Module (V8.0)
 * Handles client initialization, Supabase Auth (Sign Up, Sign In, Sign Out, Session Persistence),
 * and user-scoped PostgreSQL persistence with Row Level Security (RLS).
 */

(function () {
  const DEFAULT_TABLE = 'campuscoin_state';

  let supabaseClient = null;
  let connectionStatus = 'initializing'; // 'initializing' | 'connected' | 'connecting' | 'unconfigured' | 'error'
  let currentUser = null;
  let currentSession = null;
  let statusListeners = [];
  let authListeners = [];
  let credentials = {
    url: '',
    anonKey: ''
  };

  /**
   * Helper to notify all registered UI listeners about connection status changes
   */
  function notifyStatus(status, message = '', details = null) {
    connectionStatus = status;
    statusListeners.forEach(fn => {
      try {
        fn({
          status,
          message,
          details,
          isConfigured: isConfigured(),
          user: currentUser
        });
      } catch (err) {
        console.error('Supabase status listener error:', err);
      }
    });
  }

  /**
   * Helper to notify registered auth listeners about login/logout/session changes
   */
  function notifyAuth(event, session) {
    currentSession = session;
    currentUser = session?.user || null;
    authListeners.forEach(fn => {
      try {
        fn(event, session, currentUser);
      } catch (err) {
        console.error('Supabase auth listener error:', err);
      }
    });
  }

  /**
   * Check if credentials look configured (non-placeholder)
   */
  function isConfigured() {
    return Boolean(
      credentials.url &&
      credentials.anonKey &&
      !credentials.url.includes('your-project-id') &&
      !credentials.anonKey.includes('your-supabase-anon-key') &&
      credentials.url.startsWith('http')
    );
  }

  /**
   * Parses environment variable text (.env / .env.local format)
   */
  function parseEnvText(text) {
    const env = {};
    if (!text || typeof text !== 'string') return env;

    text.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    });
    return env;
  }

  /**
   * Asynchronously load environment variables from multiple sources:
   * 1. localStorage overrides (if any)
   * 2. window.CAMPUS_CONFIG / window.ENV / window.NEXT_PUBLIC_*
   * 3. process.env (Node / SSR / Test runner)
   * 4. .env.local / .env fetch or fs read
   * 5. Built-in default credentials fallback
   */
  async function loadCredentials() {
    let url = '';
    let key = '';

    // 1. Check localStorage override first
    if (typeof localStorage !== 'undefined') {
      const storedUrl = localStorage.getItem('campuscoin_supabase_url');
      const storedKey = localStorage.getItem('campuscoin_supabase_key');
      if (storedUrl && storedKey) {
        url = storedUrl;
        key = storedKey;
      }
    }

    // 2. Check window / config variables
    if ((!url || !key) && typeof window !== 'undefined') {
      if (window.CAMPUS_CONFIG && window.CAMPUS_CONFIG.NEXT_PUBLIC_SUPABASE_URL && window.CAMPUS_CONFIG.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        url = window.CAMPUS_CONFIG.NEXT_PUBLIC_SUPABASE_URL;
        key = window.CAMPUS_CONFIG.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      } else if (window.NEXT_PUBLIC_SUPABASE_URL && window.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        url = window.NEXT_PUBLIC_SUPABASE_URL;
        key = window.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      } else if (window.ENV) {
        url = window.ENV.NEXT_PUBLIC_SUPABASE_URL || '';
        key = window.ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      }
    }

    // 3. Check process.env (Node.js or test runners)
    if ((!url || !key) && typeof process !== 'undefined' && process.env) {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      } else if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        url = process.env.SUPABASE_URL;
        key = process.env.SUPABASE_ANON_KEY;
      }
    }

    // 4. In Node.js, attempt to read .env.local from disk directly if not in process.env
    if ((!url || !key) && typeof require !== 'undefined' && typeof process !== 'undefined' && !process.browser) {
      try {
        const fs = require('fs');
        const path = require('path');
        const envLocalPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envLocalPath)) {
          const content = fs.readFileSync(envLocalPath, 'utf8');
          const parsed = parseEnvText(content);
          if (parsed.NEXT_PUBLIC_SUPABASE_URL && parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            url = parsed.NEXT_PUBLIC_SUPABASE_URL;
            key = parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          }
        }
      } catch (e) {
        // Ignore file system read errors in non-node environments
      }
    }

    // 5. In Browser, attempt to fetch .env.local from server root
    if ((!url || !key) && typeof fetch === 'function' && typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
      const tryFetchEnv = async (file) => {
        try {
          const res = await fetch(file, { cache: 'no-store' });
          if (res.ok) {
            const text = await res.text();
            return parseEnvText(text);
          }
        } catch (e) {
          // Network fetch error for .env file
        }
        return {};
      };

      const envLocal = await tryFetchEnv('.env.local');
      if (envLocal.NEXT_PUBLIC_SUPABASE_URL && envLocal.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        url = envLocal.NEXT_PUBLIC_SUPABASE_URL;
        key = envLocal.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      } else {
        const envRoot = await tryFetchEnv('.env');
        if (envRoot.NEXT_PUBLIC_SUPABASE_URL && envRoot.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          url = envRoot.NEXT_PUBLIC_SUPABASE_URL;
          key = envRoot.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        }
      }
    }

    // 6. Central fallback project defaults
    if (!url || !key) {
      url = 'https://fanrgjutotrgejbpxzxp.supabase.co';
      key = 'sb_publishable_B8FTQUZYWuNLcChsTenYmw_6fTkZFx-';
    }

    credentials = { url: (url || '').trim(), anonKey: (key || '').trim() };
    return credentials;
  }

  /**
   * Initializes or recreates the Supabase client with Auth Session Persistence
   */
  async function initClient(customUrl = null, customKey = null) {
    if (customUrl && customKey) {
      credentials = { url: customUrl.trim(), anonKey: customKey.trim() };
    } else {
      await loadCredentials();
    }

    if (!isConfigured()) {
      notifyStatus('unconfigured', 'Supabase credentials missing or set to placeholder in .env.local');
      return null;
    }

    try {
      notifyStatus('connecting', 'Connecting to Supabase...');

      // Find createClient constructor
      let createClientFn = null;
      if (typeof window !== 'undefined') {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          createClientFn = window.supabase.createClient;
        } else if (typeof window.createClient === 'function') {
          createClientFn = window.createClient;
        }
      }
      if (!createClientFn && typeof require !== 'undefined') {
        try {
          const supabaseModule = require('@supabase/supabase-js');
          createClientFn = supabaseModule.createClient;
        } catch (e) {
          // Module require fallback
        }
      }

      if (!createClientFn) {
        throw new Error('Supabase client library (@supabase/supabase-js) is not loaded.');
      }

      // Initialize Supabase Client with Auth Session Persistence enabled
      supabaseClient = createClientFn(credentials.url, credentials.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      // Get initial auth session if available
      try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        currentSession = sessionData?.session || null;
        currentUser = currentSession?.user || null;
      } catch (authErr) {
        console.warn('Initial session check warning:', authErr);
      }

      // Subscribe to Supabase Auth state changes
      if (supabaseClient.auth && typeof supabaseClient.auth.onAuthStateChange === 'function') {
        supabaseClient.auth.onAuthStateChange((event, session) => {
          currentSession = session;
          currentUser = session?.user || null;
          notifyAuth(event, session);
        });
      }

      notifyStatus('connected', 'Connected to Supabase Cloud Database');
      return supabaseClient;
    } catch (err) {
      notifyStatus('error', err.message || 'Failed to initialize Supabase client', err);
      console.error('Supabase init error:', err);
      return null;
    }
  }

  /**
   * Supabase Auth: Register new user with Email + Password
   */
  async function signUp(email, password) {
    if (!supabaseClient) await initClient();
    if (!supabaseClient) throw new Error('Supabase client is not initialized.');

    const { data, error } = await supabaseClient.auth.signUp({
      email: email.trim(),
      password: password
    });

    if (error) throw error;
    if (data.session) {
      currentSession = data.session;
      currentUser = data.user;
      notifyAuth('SIGNED_IN', currentSession);
    }
    return data;
  }

  /**
   * Supabase Auth: Sign In with Email + Password
   */
  async function signIn(email, password) {
    if (!supabaseClient) await initClient();
    if (!supabaseClient) throw new Error('Supabase client is not initialized.');

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (error) throw error;
    currentSession = data.session;
    currentUser = data.user;
    notifyAuth('SIGNED_IN', currentSession);
    return data;
  }

  /**
   * Supabase Auth: Sign In with Magic Link (OTP)
   */
  async function signInWithOtp(email) {
    if (!supabaseClient) await initClient();
    if (!supabaseClient) throw new Error('Supabase client is not initialized.');

    const redirectTo = (typeof window !== 'undefined' && window.location) ? window.location.origin : undefined;
    const { data, error } = await supabaseClient.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * Supabase Auth: Sign Out current user
   */
  async function signOut() {
    if (!supabaseClient) return;

    try {
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      currentSession = null;
      currentUser = null;
      notifyAuth('SIGNED_OUT', null);
    }
  }

  /**
   * Test database connectivity and verify table existence
   */
  async function testConnection() {
    if (!supabaseClient) {
      await initClient();
    }
    if (!supabaseClient) {
      return { success: false, message: 'Supabase client is not initialized.' };
    }

    try {
      const startTime = Date.now();
      
      // If user is authenticated, query their row; otherwise query schema
      let query;
      if (currentUser && currentUser.id) {
        query = supabaseClient
          .from(DEFAULT_TABLE)
          .select('id, updated_at')
          .eq('id', currentUser.id)
          .maybeSingle();
      } else {
        query = supabaseClient
          .from(DEFAULT_TABLE)
          .select('id', { count: 'exact', head: true });
      }

      const { data, error } = await query;
      const duration = Date.now() - startTime;

      if (error) {
        return {
          success: false,
          message: error.message,
          error
        };
      }

      return {
        success: true,
        message: `Successfully connected to Supabase (${duration}ms response time).`,
        data,
        authenticated: Boolean(currentUser)
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Connection test failed',
        error: err
      };
    }
  }

  /**
   * Set custom credentials (used for dev or automated tests)
   */
  async function setCredentials(url, anonKey, persist = false) {
    if (persist && typeof localStorage !== 'undefined') {
      localStorage.setItem('campuscoin_supabase_url', url);
      localStorage.setItem('campuscoin_supabase_key', anonKey);
    }
    return await initClient(url, anonKey);
  }

  /**
   * Public Supabase API for CampusCoin
   */
  const CampusSupabase = {
    TABLE_NAME: DEFAULT_TABLE,

    init: initClient,
    getClient: () => supabaseClient,
    getCredentials: () => ({ ...credentials }),
    getStatus: () => ({
      status: connectionStatus,
      isConfigured: isConfigured(),
      url: credentials.url,
      user: currentUser
    }),
    isConfigured,
    testConnection,
    setCredentials,

    // Auth methods
    signUp,
    signIn,
    signInWithOtp,
    signOut,
    getCurrentUser: () => currentUser,
    getCurrentUserId: () => currentUser?.id || null,
    getSession: () => currentSession,

    onAuthStateChange: (listener) => {
      authListeners.push(listener);
      // Immediately notify listener of current state
      listener(currentUser ? 'INITIAL_SESSION' : 'NO_SESSION', currentSession, currentUser);
      return () => {
        authListeners = authListeners.filter(l => l !== listener);
      };
    },

    onStatusChange: (listener) => {
      statusListeners.push(listener);
      listener({
        status: connectionStatus,
        isConfigured: isConfigured(),
        url: credentials.url,
        user: currentUser
      });
      return () => {
        statusListeners = statusListeners.filter(l => l !== listener);
      };
    }
  };

  // Export globally and for CommonJS
  if (typeof window !== 'undefined') {
    window.CampusSupabase = CampusSupabase;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CampusSupabase;
  }
  if (typeof global !== 'undefined') {
    global.CampusSupabase = CampusSupabase;
  }
})();
