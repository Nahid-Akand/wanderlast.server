import 'dotenv/config'
import { MongoClient } from 'mongodb';

const DESTINATIONS = [
  {
    name: "Bali Paradise",
    country: "Indonesia",
    category: "Beach",
    price: 1299,
    rating: 4.9,
    reviews: 234,
    duration: "7 Days/6 Nights",
    departureDate: "2026-11-15",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80",
    description:
      "Discover the magic of Bali with pristine beaches, ancient temples, and vibrant culture. Experience luxury resorts, tropical landscapes, and unforgettable sunsets.",
    highlights: [
      "Luxury beachfront accommodation",
      "Traditional Balinese spa treatment",
      "Sunrise trek to Mount Batur",
      "Visit Uluwatu Temple at sunset",
      "Private beach dinner experience",
    ],
  },
  {
    name: "Amalfi Coast Getaway",
    country: "Italy",
    category: "Family",
    price: 1890,
    rating: 4.7,
    reviews: 186,
    duration: "6 Days/5 Nights",
    departureDate: "2026-12-01",
    imageUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1600&q=80",
    description:
      "Pastel cliffside villages, limoncello tastings, and slow coastal drives along the Tyrrhenian Sea — the Amalfi Coast is la dolce vita at its finest.",
    highlights: [
      "Boat trip to the Emerald Grotto",
      "Limoncello tasting in Sorrento",
      "Path of the Gods coastal hike",
      "Positano beach club afternoon",
      "Family pasta-making class",
    ],
  },
  {
    name: "Santorini Sunset Escape",
    country: "Greece",
    category: "Luxury",
    price: 2350,
    rating: 4.8,
    reviews: 312,
    duration: "5 Days/4 Nights",
    departureDate: "2026-12-10",
    imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1600&q=80",
    description:
      "Whitewashed cave suites, infinity pools carved into cliffs, and caldera views over the world's most famous sunset.",
    highlights: [
      "Private caldera catamaran cruise",
      "Candlelit dinner in Oia",
      "Assyrtiko wine tasting tour",
      "Ancient Akrotiri ruins visit",
      "Cliffside infinity pool suite",
    ],
  },
  {
    name: "Machu Picchu Trek",
    country: "Peru",
    category: "Adventure",
    price: 1320,
    rating: 4.9,
    reviews: 401,
    duration: "5 Days/4 Nights",
    departureDate: "2027-01-12",
    imageUrl: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1600&q=80",
    description:
      "Hike the legendary Inca trail through cloud forest and stone staircases to watch the sun rise over the lost citadel.",
    highlights: [
      "Sun Gate sunrise at Machu Picchu",
      "Four-day guided Inca trail trek",
      "Camp under Andean star fields",
      "Sacred Valley market visit",
      "Cusco historic center walking tour",
    ],
  },
  {
    name: "Kyoto Cultural Tour",
    country: "Japan",
    category: "Cultural",
    price: 2150,
    rating: 4.8,
    reviews: 267,
    duration: "8 Days/7 Nights",
    departureDate: "2027-02-20",
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&q=80",
    description:
      "Torii gates, tea ceremonies, and quiet temples in Japan's old imperial capital — wear kimono, meet artisans, and slow down.",
    highlights: [
      "Fushimi Inari shrine at dawn",
      "Private tea ceremony in Gion",
      "Kimono fitting and stroll",
      "Arashiyama bamboo grove walk",
      "Zen garden meditation session",
    ],
  },
  {
    name: "Swiss Alps Explorer",
    country: "Switzerland",
    category: "Mountain",
    price: 1990,
    rating: 4.7,
    reviews: 158,
    duration: "6 Days/5 Nights",
    departureDate: "2027-01-25",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80",
    description:
      "Alpine lakes, panoramic trains, and jagged peaks under snow — Switzerland's mountains from Zermatt to Lucerne.",
    highlights: [
      "Gornergrat railway to Matterhorn views",
      "Glacier express panoramic ride",
      "Lucerne lake cruise",
      "Swiss chocolate factory visit",
      "Alpine spa evening in Zermatt",
    ],
  },
  {
    name: "Serengeti Safari Expedition",
    country: "Tanzania",
    category: "Adventure",
    price: 3200,
    rating: 4.9,
    reviews: 523,
    duration: "7 Days/6 Nights",
    departureDate: "2027-02-05",
    imageUrl: "https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=1600&q=80",
    description:
      "Game drives at golden hour across the great wildebeest migration, with bush camps under acacia trees.",
    highlights: [
      "Hot air balloon over the Serengeti",
      "Big Five game drives with ranger",
      "Ngorongoro Crater full-day safari",
      "Maasai village cultural visit",
      "Bush camp sundowners",
    ],
  },
  {
    name: "Northern Lights Chase",
    country: "Iceland",
    category: "Adventure",
    price: 1750,
    rating: 4.6,
    reviews: 142,
    duration: "4 Days/3 Nights",
    departureDate: "2026-12-18",
    imageUrl: "https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=1600&q=80",
    description:
      "Aurora hunting, glacier lagoons, and geothermal pools under arctic skies — Iceland in its winter mood.",
    highlights: [
      "Guided aurora hunting nights",
      "Blue Lagoon geothermal soak",
      "Jökulsárlón glacier lagoon cruise",
      "Golden Circle waterfall tour",
      "Ice cave exploration",
    ],
  },
  {
    name: "Norwegian Fjords Cruise",
    country: "Norway",
    category: "Family",
    price: 2850,
    rating: 4.7,
    reviews: 208,
    duration: "6 Days/5 Nights",
    departureDate: "2027-03-08",
    imageUrl: "https://images.unsplash.com/photo-1520769945061-0a448c463865?w=1600&q=80",
    description:
      "Deep blue fjords, thundering waterfalls, and storybook villages along the Norwegian coast.",
    highlights: [
      "Geirangerfjord scenic cruise",
      "Flåm mountain railway",
      "Kayak between fjord villages",
      "Bryggen wharf heritage walk",
      "Northern seafood tasting dinner",
    ],
  },
  {
    name: "Dubai Skyline Retreat",
    country: "UAE",
    category: "Luxury",
    price: 1980,
    rating: 4.6,
    reviews: 176,
    duration: "5 Days/4 Nights",
    departureDate: "2027-01-05",
    imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80",
    description:
      "Desert dunes, rooftop dining, and world-record architecture on the Gulf — Dubai after dark is a different city.",
    highlights: [
      "Burj Khalifa observation deck",
      "Desert safari with BBQ dinner",
      "Dubai Marina yacht evening",
      "Gold and spice souk tour",
      "Fountain show front-row seats",
    ],
  },
];

const client = new MongoClient(process.env.MONGODB_URI);

try {
  await client.connect();
  const collection = client.db("wanderlast").collection("destinations");

  const { deletedCount } = await collection.deleteMany({});
  const { insertedCount } = await collection.insertMany(DESTINATIONS);

  console.log(`Replaced collection: deleted ${deletedCount}, inserted ${insertedCount}`);
} finally {
  await client.close();
}
