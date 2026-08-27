export interface BusinessCategoryDef {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  gradient: string;
  badgeColor: string;
  popularServices?: string[];
}

export const PRESET_BUSINESS_CATEGORIES: BusinessCategoryDef[] = [
  {
    id: "tech-it",
    name: "Technology & Software",
    slug: "technology-software",
    description: "Web development, mobile apps, IT support, cloud computing, cybersecurity & digital solutions.",
    iconName: "Laptop",
    gradient: "from-blue-600 to-indigo-600",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    popularServices: ["Custom Website Development", "Mobile App Design", "Cloud Migration", "IT Support & Maintenance"]
  },
  {
    id: "fashion-luxury",
    name: "Fashion & Luxury",
    slug: "fashion-luxury",
    description: "Bespoke tailoring, traditional wear, footwear, jewelry, luxury accessories & styling.",
    iconName: "Sparkles",
    gradient: "from-amber-500 to-orange-600",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    popularServices: ["Bespoke Native Tailoring", "Ready-To-Wear Collections", "Bridal & Event Styling", "Custom Footwear"]
  },
  {
    id: "creative-media",
    name: "Creative & Media",
    slug: "creative-media",
    description: "Photography, video production, graphic design, branding, content creation & digital marketing.",
    iconName: "Palette",
    gradient: "from-purple-600 to-pink-600",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    popularServices: ["Brand Identity & Logo Design", "Commercial Video Production", "Product Photography", "Social Media Management"]
  },
  {
    id: "finance-legal",
    name: "Finance, Accounting & Legal",
    slug: "finance-accounting-legal",
    description: "Bookkeeping, tax consulting, audit, corporate law, wealth management & business registration.",
    iconName: "ShieldCheck",
    gradient: "from-emerald-600 to-teal-700",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    popularServices: ["CAC Business Registration", "Tax Compliance & Filing", "Bookkeeping & Auditing", "Corporate Legal Advisory"]
  },
  {
    id: "food-hospitality",
    name: "Food, Catering & Events",
    slug: "food-catering-events",
    description: "Restaurants, event catering, bakery, outdoor parties, culinary services & private chefs.",
    iconName: "Utensils",
    gradient: "from-orange-500 to-rose-600",
    badgeColor: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    popularServices: ["Corporate Event Catering", "Custom Celebration Cakes", "Private Chef Services", "Party Drinks & Cocktails"]
  },
  {
    id: "real-estate-construction",
    name: "Real Estate & Construction",
    slug: "real-estate-construction",
    description: "Property sales, rentals, architectural design, interior decor, building & facility management.",
    iconName: "Building2",
    gradient: "from-sky-600 to-blue-800",
    badgeColor: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    popularServices: ["Luxury Property Sales", "Interior Architecture & Decor", "Building Construction", "Shortlet Property Management"]
  },
  {
    id: "health-beauty-wellness",
    name: "Health, Beauty & Wellness",
    slug: "health-beauty-wellness",
    description: "Spa treatments, skincare, barbershops, hair salons, fitness training & wellness consulting.",
    iconName: "HeartPulse",
    gradient: "from-rose-500 to-pink-600",
    badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    popularServices: ["Luxury Spa & Massage", "Bridal Hair & Makeup", "Personal Fitness Training", "Organic Skincare Consultation"]
  },
  {
    id: "logistics-transport",
    name: "Logistics, Haulage & Auto",
    slug: "logistics-haulage-auto",
    description: "Dispatch delivery, freight forwarding, interstate haulage, vehicle maintenance & car rentals.",
    iconName: "Truck",
    gradient: "from-indigo-600 to-violet-700",
    badgeColor: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    popularServices: ["Same-Day Dispatch Delivery", "Interstate Haulage", "Auto Diagnostics & Repairs", "Executive Car Hire"]
  },
  {
    id: "retail-commerce",
    name: "Retail, Wholesale & Solar",
    slug: "retail-wholesale-solar",
    description: "Solar inverter installations, consumer electronics, home appliances & general merchandise.",
    iconName: "Zap",
    gradient: "from-amber-600 to-yellow-600",
    badgeColor: "bg-amber-600/10 text-amber-700 border-amber-600/20",
    popularServices: ["Solar Inverter Setup & Maintenance", "Electronics Wholesale", "Home Automation", "Commercial Equipment Supply"]
  },
  {
    id: "education-training",
    name: "Education, Training & Coaching",
    slug: "education-training-coaching",
    description: "Professional certifications, tech bootcamps, tutoring, language courses & business coaching.",
    iconName: "GraduationCap",
    gradient: "from-teal-600 to-cyan-700",
    badgeColor: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    popularServices: ["Tech Skills Bootcamp", "Executive Leadership Coaching", "Exam Prep & Tutoring", "Corporate Team Training"]
  },
  {
    id: "agriculture-farming",
    name: "Agriculture & Agro-Allied",
    slug: "agriculture-agro-allied",
    description: "Poultry, crop farming, agro-processing, livestock feed, greenhouse setup & export commodities.",
    iconName: "Leaf",
    gradient: "from-emerald-700 to-green-800",
    badgeColor: "bg-emerald-700/10 text-emerald-800 border-emerald-700/20",
    popularServices: ["Farm Setup & Consultation", "Poultry & Livestock Supply", "Agro-Commodity Export", "Organic Fertilizer Supply"]
  }
];

export const MAJOR_CITIES_LOCATIONS = [
  { city: "Ikeja", state: "Lagos State", country: "Nigeria", lat: 6.6018, lng: 3.3515 },
  { city: "Lekki", state: "Lagos State", country: "Nigeria", lat: 6.4698, lng: 3.5852 },
  { city: "Victoria Island", state: "Lagos State", country: "Nigeria", lat: 6.4281, lng: 3.4219 },
  { city: "Lagos Island", state: "Lagos State", country: "Nigeria", lat: 6.4549, lng: 3.3887 },
  { city: "Yaba", state: "Lagos State", country: "Nigeria", lat: 6.5095, lng: 3.3711 },
  { city: "Surulere", state: "Lagos State", country: "Nigeria", lat: 6.4969, lng: 3.3547 },
  { city: "Abuja Central", state: "FCT Abuja", country: "Nigeria", lat: 9.0579, lng: 7.4951 },
  { city: "Garki", state: "FCT Abuja", country: "Nigeria", lat: 9.0305, lng: 7.4820 },
  { city: "Wuse", state: "FCT Abuja", country: "Nigeria", lat: 9.0765, lng: 7.4722 },
  { city: "Maitama", state: "FCT Abuja", country: "Nigeria", lat: 9.0882, lng: 7.4985 },
  { city: "Port Harcourt", state: "Rivers State", country: "Nigeria", lat: 4.8156, lng: 7.0498 },
  { city: "Ibadan", state: "Oyo State", country: "Nigeria", lat: 7.3775, lng: 3.9470 },
  { city: "Benin City", state: "Edo State", country: "Nigeria", lat: 6.3350, lng: 5.6037 },
  { city: "Enugu", state: "Enugu State", country: "Nigeria", lat: 6.4584, lng: 7.5464 },
  { city: "Kano", state: "Kano State", country: "Nigeria", lat: 12.0022, lng: 8.5920 },
  { city: "London", state: "Greater London", country: "United Kingdom", lat: 51.5074, lng: -0.1278 },
  { city: "New York", state: "New York", country: "United States", lat: 40.7128, lng: -74.0060 },
  { city: "Accra", state: "Greater Accra", country: "Ghana", lat: 5.6037, lng: -0.1870 },
  { city: "Dubai", state: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708 },
];
