window.ZORA_CONFIG = {
  useSupabase: true,
  supabaseUrl: 'https://eulhdzltttehxbyrdqxa.supabase.co',
  supabaseAnonKey: 'sb_publishable_6RtZL2B_Yt8CaSqxcN4Tzg_6tUK90Op',
  storeEmail: 'zoraofficial005@gmail.com',
  web3formsKey: '',
  /* Paste PayMongo Public Key (pk_test_... or pk_live_...). Secret key goes in Supabase Edge Function secrets only. */
  paymongoPublicKey: '',
  adminPassword: 'zora2024',
  brand: {
    name: 'ZORA',
    tagline: 'Wear every day. Shine every moment.',
    email: 'zoraofficial005@gmail.com',
    phone: '+63 917 123 4567'
  },
  heroSlides: [{ image: '', alt: 'ZORA' }],
  shopMenu: [
    {
      label: 'Categories',
      links: [
        { label: 'Rings', href: '#shop/rings', filter: 'rings' },
        { label: 'Earrings', href: '#shop/earrings', filter: 'earrings' },
        { label: 'Bracelets', href: '#shop/bracelets', filter: 'bracelets' },
        { label: 'Necklaces', href: '#shop/necklaces', filter: 'necklaces' }
      ]
    },
    {
      label: 'Help',
      links: [
        { label: 'How To Order', href: '#how-to-order' },
        { label: 'Contact Us', href: '#contact' }
      ]
    }
  ],
  collections: [
    { id: 'signature', label: 'MOST LOVED', title: '"Signature" Collection', image: '', filter: 'rings' },
    { id: 'new-drop', label: 'NEW DROP', title: '"Everyday Gold" Edit', image: '', filter: 'all' }
  ],
  categoryCards: [
    { label: 'Rings', filter: 'rings', image: '' },
    { label: 'Earrings', filter: 'earrings', image: '' },
    { label: 'Bracelets', filter: 'bracelets', image: '' },
    { label: 'Necklaces', filter: 'necklaces', image: '' }
  ],
  blogs: [],
  social: {
    instagram: 'https://instagram.com/zora.ph_',
    facebook: 'https://www.facebook.com/share/1EtKmbeuGo/?mibextid=wwXIfr',
    tiktok: 'https://www.tiktok.com/@zora.official_ph'
  },
  products: []
};
