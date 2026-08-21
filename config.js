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
  heroSlides: [
    {
      image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1800&q=80',
      alt: 'Luxury jewelry collection'
    },
    {
      image: 'https://images.unsplash.com/photo-1515562141203-7a88fb7ce338?auto=format&fit=crop&w=1800&q=80',
      alt: 'Gold earrings editorial'
    },
    {
      image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1800&q=80',
      alt: 'Layered necklaces'
    },
    {
      image: 'https://images.unsplash.com/photo-1601821765780-3bf8d3f6d5d4?auto=format&fit=crop&w=1800&q=80',
      alt: 'Signature rings'
    }
  ],
  shopMenu: [
    {
      label: 'Categories',
      links: [
        { label: 'Rings', href: '#shop', filter: 'rings' },
        { label: 'Earrings', href: '#shop', filter: 'earrings' },
        { label: 'Bracelets', href: '#shop', filter: 'bracelets' },
        { label: 'Necklaces', href: '#shop', filter: 'necklaces' }
      ]
    },
    {
      label: 'Help',
      links: [
        { label: 'Size Guide', href: '#size-guide' },
        { label: 'How To Order', href: '#how-to-order' },
        { label: 'Contact Us', href: '#contact' }
      ]
    }
  ],
  collections: [
    {
      id: 'signature',
      label: 'MOST LOVED',
      title: '"Signature" Collection',
      image: 'https://images.unsplash.com/photo-1601821765780-3bf8d3f6d5d4?auto=format&fit=crop&w=1200&q=80',
      filter: 'rings'
    },
    {
      id: 'new-drop',
      label: 'NEW DROP',
      title: '"Everyday Gold" Edit',
      image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1200&q=80',
      filter: 'all'
    }
  ],
  categoryCards: [
    {
      label: 'Rings',
      filter: 'rings',
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80'
    },
    {
      label: 'Earrings',
      filter: 'earrings',
      image: 'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?auto=format&fit=crop&w=900&q=80'
    },
    {
      label: 'Bracelets',
      filter: 'bracelets',
      image: 'https://images.unsplash.com/photo-1611652028916-3ace4a659eb4?auto=format&fit=crop&w=900&q=80'
    },
    {
      label: 'Necklaces',
      filter: 'necklaces',
      image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=900&q=80'
    }
  ],
  blogs: [
    {
      id: '1',
      title: 'Zora x Local Artisans: Crafted for the culture',
      excerpt: 'In a fusion of heritage craft and modern design, Zora celebrates our latest collaboration with local Filipino artisans, launching a refined capsule of everyday luxury pieces.',
      image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
      date: 'Jan 12, 2026'
    },
    {
      id: '2',
      title: 'Everyday Gold: From the ground up',
      excerpt: 'As we grow our collection at Zora, we are excited to unveil our latest edit — everyday gold pieces designed for modern rituals and quiet luxury.',
      image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80',
      date: 'Dec 8, 2025'
    },
    {
      id: '3',
      title: 'The Edit: A tribute to timeless shine',
      excerpt: 'What started as a passion for sculptural jewelry has evolved into a full collection of pieces made to move from morning light to evening glow.',
      image: 'https://images.unsplash.com/photo-1515562141203-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
      date: 'Oct 3, 2025'
    }
  ],
  social: {
    instagram: 'https://instagram.com/zora.ph_',
    facebook: 'https://www.facebook.com/share/1EtKmbeuGo/?mibextid=wwXIfr',
    tiktok: 'https://www.tiktok.com/@zora.official_ph'
  },
  products: [
    { id: '1', name: 'LUSH APEX', subtitle: 'PREMIUM', category: 'rings', price: 3299, stock: 9, requiresSize: true, sizes: ['6', '7', '8', '9'], colors: ['Gold', 'Silver'], discountActive: false, discountPercent: 0, images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=1000&fit=crop', 'https://images.unsplash.com/photo-1588444837495-c5d469f45715?w=800&h=1000&fit=crop'] },
    { id: '2', name: 'DOT BLING', subtitle: 'CRYSTAL STUD', category: 'earrings', price: 2499, stock: 43, requiresSize: false, sizes: [], colors: ['Gold'], discountActive: true, discountPercent: 15, images: ['https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=800&h=1000&fit=crop', 'https://images.unsplash.com/photo-1617038260897-41a6084a5560?w=800&h=1000&fit=crop'] },
    { id: '3', name: 'ROPE CHAIN', subtitle: '925 SILVER PLATED', category: 'bracelets', price: 3899, stock: 47, requiresSize: true, sizes: ['17CM', '19CM', '21CM'], colors: ['Silver', 'Gold'], discountActive: false, discountPercent: 0, images: ['https://images.unsplash.com/photo-1611652028916-3ace4a659eb4?w=800&h=1000&fit=crop', 'https://images.unsplash.com/photo-1599643477877-5737707064c8?w=800&h=1000&fit=crop'] },
    { id: '4', name: 'GOLD PEARL', subtitle: 'PREMIUM 925 SILVER', category: 'necklaces', price: 4299, stock: 10, requiresSize: true, sizes: ['40CM', '45CM', '50CM'], colors: ['Gold'], discountActive: false, discountPercent: 0, images: ['https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&h=1000&fit=crop', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=1000&fit=crop'] },
    { id: '5', name: 'ASTER RING', subtitle: 'SIGNATURE', category: 'rings', price: 3199, stock: 22, requiresSize: true, sizes: ['6', '7', '8', '9'], colors: ['Gold', 'Rose Gold'], discountActive: false, discountPercent: 0, images: ['https://images.unsplash.com/photo-1601821765780-3bf8d3f6d5d4?w=800&h=1000&fit=crop', 'https://images.unsplash.com/photo-1611591437281-460bfbead0db?w=800&h=1000&fit=crop'] },
    { id: '6', name: 'LUNA HOOPS', subtitle: 'EVERYDAY', category: 'earrings', price: 2199, stock: 35, requiresSize: false, sizes: [], colors: ['Gold', 'Silver'], discountActive: false, discountPercent: 0, images: ['https://images.unsplash.com/photo-1515562141203-7a88fb7ce338?w=800&h=1000&fit=crop', 'https://images.unsplash.com/photo-1603561596112-0a132756a22f?w=800&h=1000&fit=crop'] },
    { id: '7', name: 'SOL CUFF', subtitle: 'NEW DROP', category: 'bracelets', price: 3599, stock: 18, requiresSize: true, sizes: ['17CM', '19CM'], colors: ['Gold'], discountActive: false, discountPercent: 0, images: ['https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800&h=1000&fit=crop', 'https://images.unsplash.com/photo-1611652028916-3ace4a659eb4?w=800&h=1000&fit=crop'] },
    { id: '8', name: 'NOVA CHAIN', subtitle: 'LIMITED', category: 'necklaces', price: 4899, stock: 8, requiresSize: true, sizes: ['40CM', '45CM'], colors: ['Silver'], discountActive: false, discountPercent: 0, images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=1000&fit=crop', 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&h=1000&fit=crop'] },
    { id: '9', name: 'VELVET BAND', subtitle: 'BEST SELLER', category: 'rings', price: 2799, stock: 30, requiresSize: true, sizes: ['6', '7', '8'], colors: ['Rose Gold', 'Gold'], discountActive: false, discountPercent: 0, images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&h=1000&fit=crop', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=1000&fit=crop'] }
  ]
};
