/* Overmaster: site settings.
   Fill in the two Supabase values to turn on accounts, cloud saves and feedback.
   Leave them empty and the game still works: saves stay in each player's browser.
   Both values are safe to publish: the key is the public one, and the database rules
   in supabase/schema.sql decide what each player can read and write. */
window.BTS_CONFIG = {
  // Supabase -> Project Settings -> Data API: Project URL, e.g. 'https://abcdefghijkl.supabase.co'
  supabaseUrl: '',
  // Supabase -> Project Settings -> API Keys: the publishable key (sb_publishable_...) or the legacy "anon public" key
  supabaseAnonKey: '',
  // Set to true after you turn on Google in Supabase -> Authentication -> Sign In / Providers
  googleSignIn: false,
  // Optional: shown to testers if the feedback form can't reach Supabase
  feedbackEmail: '',
  // Set to true once Stripe and the two shop functions are set up (site/README.md, "The shop").
  // While false, every villain is unlocked and there's no Shop.
  store: false
};
