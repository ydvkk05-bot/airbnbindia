/* Rich content for the site generator. */

const AREAS = {
  goa: [
    { n: "Calangute & Baga", d: "The party heart of North Goa — buzzing beach shacks, watersports and nightlife, with pool villas tucked down palm lanes.", q: "Calangute--Goa--India" },
    { n: "Palolem & South Goa", d: "Hippie-chic South Goa with crescent beaches, kayak trips and boutique stays a world away from the crowds.", q: "Palolem--Goa--India" },
    { n: "Vagator & Anjuna", d: "Cliff-top sunsets, trance-era charm and heritage Portuguese homes near the Chapora Fort trail.", q: "Vagator--Goa--India" },
    { n: "Assagao & Siolim", d: "Goa's quiet countryside — farm villas, art cafés and the most romantic private stays inland.", q: "Assagao--Goa--India" }
  ],
  jaipur: [
    { n: "Old Pink City", d: "Stay inside the walled city between Hawa Mahal and City Palace — rooftop breakfasts and bazaars at your door.", q: "Jaipur--Rajasthan--India" },
    { n: "C-Scheme", d: "Jaipur's modern heart with cafés and boutiques, minutes from Amer Fort road.", q: "Jaipur--Rajasthan--India" },
    { n: "Amer & Nahargarh", d: "Village-chic homestays below the Amber Fort with jungle-valley views.", q: "Amer--Jaipur--Rajasthan--India" },
    { n: "Bani Park", d: "Heritage haveli country near the station — grand courtyards and warm hosts.", q: "Bani-Park--Jaipur--Rajasthan--India" }
  ],
  udaipur: [
    { n: "Lake Pichola", d: "The postcard zone — lakefront palaces, ghats and candlelit decks facing the City Palace.", q: "Udaipur--Rajasthan--India" },
    { n: "Old City", d: "Narrow lanes, havelis and rooftop cafés within walking distance of Jagdish Temple.", q: "Udaipur--Rajasthan--India" },
    { n: "Fateh Sagar", d: "A calmer lakefront strip with hillside cottages and sunset cycle paths.", q: "Udaipur--Rajasthan--India" },
    { n: "Badi Lake", d: "Countryside villas for honeymooners wanting total privacy.", q: "Badi-Lake--Udaipur--Rajasthan--India" }
  ],
  manali: [
    { n: "Old Manali", d: "The bohemian heart — riverside cafés, backpacker cabins and apple orchards.", q: "Old-Manali--Himachal-Pradesh--India" },
    { n: "Village Manali", d: "Temple town with apple farms and quiet family guesthouses.", q: "Manali--Himachal-Pradesh--India" },
    { n: "Log Hut & Siyal", d: "Forested hillside stays with snow views and easy access to Solang.", q: "Manali--Himachal-Pradesh--India" },
    { n: "Solang Valley", d: "Adventure base for paragliding, skiing and snow sports.", q: "Solang--Manali--Himachal-Pradesh--India" }
  ],
  kerala: [
    { n: "Alleppey Backwaters", d: "Palm-lined canals and the world's houseboat capital.", q: "Alleppey--Kerala--India" },
    { n: "Munnar Tea Hills", d: "Endless green carpet of tea estates, misty mornings and colonial bungalows.", q: "Munnar--Kerala--India" },
    { n: "Varkala Cliffs", d: "A clifftop village above a black-sand beach — yoga, seafood and sunsets.", q: "Varkala--Kerala--India" },
    { n: "Kochi & Fort Kochi", d: "Dutch-Portuguese heritage homes, galleries and Chinese nets.", q: "Fort-Kochi--Kerala--India" }
  ],
  rishikesh: [
    { n: "Tapovan", d: "The yoga and café hub across the Laxman Jhula — river-view rooms everywhere.", q: "Rishikesh--Uttarakhand--India" },
    { n: "Laxman Jhula & Swarg Ashram", d: "Ashram lane with evening aarti, ghats and budget guesthouses.", q: "Rishikesh--Uttarakhand--India" },
    { n: "Upper Tapovan", d: "Quieter forest cabins with the best Ganga and mountain views.", q: "Rishikesh--Uttarakhand--India" },
    { n: "Shivpuri & Marine Drive", d: "Rafting camps and riverside lodges for adventure lovers.", q: "Rishikesh--Uttarakhand--India" }
  ],
  jaisalmer: [
    { n: "Inside the Fort", d: "Live inside the living fort's sandstone walls in haveli homestays.", q: "Jaisalmer--Rajasthan--India" },
    { n: "Old City", d: "Jaisalmer's bazaar lanes with rooftop views of the golden ramparts.", q: "Jaisalmer--Rajasthan--India" },
    { n: "Sam Sand Dunes", d: "The desert proper — luxury camps, camel safaris and starlit nights.", q: "Sam--Jaisalmer--Rajasthan--India" },
    { n: "Khuri Village", d: "A quieter dune village for authentic desert homestays.", q: "Khuri--Jaisalmer--Rajasthan--India" }
  ],
  shimla: [
    { n: "Mall Road & Ridge", d: "Colonial-era rooms above the Mall with mountain air and cafés.", q: "Shimla--Himachal-Pradesh--India" },
    { n: "Kufri & Fagu", d: "Orchard cottages and snow views outside the town bustle.", q: "Kufri--Shimla--Himachal-Pradesh--India" },
    { n: "Mashobra & Naldehra", d: "Forest cabins near India's oldest golf course, perfect for slow stays.", q: "Mashobra--Shimla--Himachal-Pradesh--India" },
    { n: "Kasauli", d: "A pine-shaded hill town an hour away for a quieter Shimla trip.", q: "Kasauli--Himachal-Pradesh--India" }
  ]
};

const DEST_CONTENT = {
  goa: {
    heroLead: "Sun-soaked beaches, colonial villas and the best airbnb in goa for every budget — from ₹800 guesthouses to ₹20,000 pool villas.",
    intro: "Goa is India's original escape — 100 km of coastline split between the party beaches of the north and the palm-lazy coves of the south. The best airbnb in goa is never one thing: it's a beach shack in Palolem for backpackers, a Portuguese villa in Assagao for romantics, and a private pool villa in Baga for groups. Because airbnb-india.com curates only verified, highly-rated stays, every listing below links straight to live prices and instant booking on Airbnb.",
    bestTime: "November to February is peak season (book 2–3 months ahead). June–September is monsoon: quieter, greener and dramatically cheaper stays.",
    howToReach: "Fly into Goa International (GOI) at Dabolim or Manohar airport (Mopa). North Goa stays are 45–90 min by taxi; South Goa 15–60 min. Direct overnight trains from Mumbai and Delhi land you at Madgaon or Thivim."
  },
  jaipur: {
    heroLead: "Pink City palaces, frescoed havelis and the best airbnb in jaipur — royal stays that cost far less than the hotels next door.",
    intro: "Jaipur's walled old city is a UNESCO feast of rose-pink ramparts, bazaars and forts. The best airbnb in jaipur tends to be a restored haveli — a 200-year-old merchant mansion with a courtyard, frescoed arches and a rooftop where breakfast overlooks Hawa Mahal. Heritage homestays here beat comparable hotels on both price and character, which is why they're the smart choice for first-timers and return visitors alike.",
    bestTime: "October to March for comfortable sightseeing. Skip April–June (brutally hot) unless you find a pool villa.",
    howToReach: "Fly into Jaipur International (JAI), 25–40 min from the old city. The Pink City is also a 4.5-hour express train from Delhi and a favourite stop on Rajasthan road trips."
  },
  udaipur: {
    heroLead: "Lake Pichola, marble palaces and the best airbnb in udaipur — lakefront cottages and romantic villas for couples.",
    intro: "Dubbed the Venice of the East, Udaipur is Rajasthan's most romantic city. The best airbnb in udaipur clusters around two things: water and heritage. Lakefront cottages with private ghats, old-city havelis with rooftop lake views, and countryside villas near Badi Lake. Because the city's signature palaces are hotels, savvy travellers book a lakefront airbnb instead — same view, half the price, and a host who'll arrange a private boat ride at sunrise.",
    bestTime: "September to March. A winter honeymoon here is hard to beat.",
    howToReach: "Fly into Maharana Pratap Airport (UDR), ~40 min from the lake. Udaipur also connects by overnight trains and scenic buses from Jaipur, Jodhpur and Ahmedabad."
  },
  manali: {
    heroLead: "Snow peaks, pine forests and the best airbnb in manali — cedar cabins and cosy riverfront stays in the Himalayas.",
    intro: "Manali is the Himalaya's greatest hits: snow-capped peaks in winter, green valley hikes in summer, and Old Manali's legendary cafés year-round. The best airbnb in manali is a log cabin with a wood-burning stove, a balcony facing the Dhauladhar range, and apple orchards outside the door. Prices range from ₹1,200 backpacker rooms in Old Manali to ₹8,000+ luxury villas with private decks — and every listing below links straight to booking on Airbnb.",
    bestTime: "December–February for snow, March–June for greenery and clear treks. Avoid the Diwali break — roads jam.",
    howToReach: "Fly into Kullu–Bhuntar (KUU), 50 km away. Most travellers come overland from Delhi (~12 h) or Chandigarh via the Kullu valley."
  },
  kerala: {
    heroLead: "Backwaters, tea estates and the best airbnb in kerala — houseboats, plantation villas and clifftop homestays.",
    intro: "Kerala is God's own country for a reason: palm-lined backwaters, rolling tea estates and a coast of fishing villages. The best airbnb in kerala shifts with your mood — a private houseboat drifting Alleppey's canals, a colonial bungalow wrapped in Munnar's tea gardens, or a clifftop homestay above Varkala's black-sand beach. All our picks are verified, highly rated and one click from their live Airbnb listing.",
    bestTime: "October to March. Monsoon (June–Sept) is glorious for backwaters and tea hills but not for beaches.",
    howToReach: "Three international airports — Kochi (COK), Trivandrum (TRV) and Kozhikode (CCJ) — with good rail links along the coast."
  },
  rishikesh: {
    heroLead: "The yoga capital of the world — and the best airbnb in rishikesh with Ganga views from ₹1,000 rooms to riverfront retreats.",
    intro: "Rishikesh sits where the Ganges leaves the mountains, and its whole economy runs on calm and adrenaline in equal measure. The best airbnb in rishikesh is a room with a Ganga-facing balcony in Tapovan — close enough to hear the river, with a yoga studio, a juice bar and a rafting pick-up point all on the same lane. It's the rare destination where luxury means quiet, and the cheapest riverside rooms can be the most memorable.",
    bestTime: "September–April. Avoid the monsoon for rafting; winter mornings are crisp and perfect for yoga.",
    howToReach: "Fly into Dehradun's Jolly Grant (DED), 35–40 min away. Delhi–Rishikesh buses and trains via Haridwar are reliable alternatives."
  },
  jaisalmer: {
    heroLead: "The Golden City — and the best airbnb in jaisalmer: desert camps at Sam, haveli homestays inside the living fort.",
    intro: "Jaisalmer rises out of the Thar Desert like a mirage, its fort still home to thousands. The best airbnb in jaisalmer is split between two worlds: a heritage room inside the living fort's sandstone walls, or a luxury Swiss tent at Sam Sand Dunes an hour away. Both are unforgettable — the fort for history, the dunes for camel safaris and a night sky you've never seen this clearly.",
    bestTime: "November to February. Summers in the desert are punishing; winters bring folk festivals.",
    howToReach: "Fly into Jaisalmer Airport (JSA) or Jodhpur (JDH) 5 h away. The Palace on Wheels and overnight trains from Jodhpur are scenic options."
  },
  shimla: {
    heroLead: "Colonial charm, pine forests and the best airbnb in shimla — orchard cottages in Kufri and heritage rooms on the Ridge.",
    intro: "Shimla was the British summer capital, and the city still wears that gentility — the Mall Road, the Ridge, the toy train. The best airbnb in shimla sits a little outside the crowds: a family-run cottage in Kufri with apple orchards and valley balconies, or a wood-panelled estate in Mashobra with a view of snow peaks. It's hill-station travel the way it was meant to be: fireplaces, forest walks and long evenings on a veranda.",
    bestTime: "March–June for pleasant weather, December–January for snow in Kufri.",
    howToReach: "Fly into Chandigarh (IXC) and drive 3.5–4 h through pretty hills, or take the Kalka–Shimla toy train for the full experience."
  }
};

const FAQ_DEST = {
  goa: [
    { q: "What's the best area to book an Airbnb in Goa?", a: "Party crowd? Calangute–Baga. Hippie beach life? Palolem. Sunsets and nightlife with calm stays? Vagator–Anjuna. Romantic privacy? Assagao–Siolim inland, or any South Goa beach." },
    { q: "How much does a good Airbnb in Goa cost?", a: "Budget rooms from ₹800–₹1,500, comfortable beach bungalows ₹1,800–₹3,500, and private pool villas ₹4,000–₹15,000 per night. December prices can run 40–70% higher." },
    { q: "Is it better to book an Airbnb than a hotel in Goa?", a: "For groups and beach-lovers, yes — you get a kitchen, privacy and a pool for less than a comparable hotel suite. Our listed stays all link to live Airbnb pricing." },
    { q: "Do I need to rent a scooter in Goa?", a: "Strongly recommended — it's how Goans move. Most hosts have scooter partners; arrange it before arrival and always wear a helmet." }
  ],
  jaipur: [
    { q: "Where should I stay for a first visit to Jaipur?", a: "Old Pink City or Bani Park — both put you near Hawa Mahal, City Palace and the bazaars, and both are full of heritage haveli airbnbs." },
    { q: "Are heritage haveli stays expensive?", a: "No — this is the trick. A restored haveli with rooftop breakfast typically costs ₹2,000–₹4,000, far less than palace hotels with comparable character." },
    { q: "Is one day enough for Jaipur?", a: "Barely. Give yourself 2–3 days for Amber Fort, City Palace, Hawa Mahal and the bazaars without rushing." },
    { q: "When is the best time for a Jaipur trip?", a: "October–March. Carry light layers for winter evenings." }
  ],
  udaipur: [
    { q: "Which part of Udaipur has the best lake views?", a: "Lake Pichola's eastern shore and the Old City rooftops. For the full postcard, look for a lakefront cottage with its own ghat." },
    { q: "Is Udaipur good for honeymoons?", a: "One of India's best. Lakefront stays, boat rides, candlelit dinners — our luxury tier lists the most romantic options." },
    { q: "How many days do I need in Udaipur?", a: "Two full days for the city plus one for Kumbhalgarh and Chittorgarh side trips." },
    { q: "Does Udaipur get crowded?", a: "December–February and around festivals, yes. Book 6–8 weeks ahead for the best lakefront homes." }
  ],
  manali: [
    { q: "Old Manali or New Manali — which is better?", a: "Old Manali for cafés, cabins and character; New Manali (Village area) for convenience and bigger hotels. Budget travellers usually pick Old Manali." },
    { q: "Do Manali airbnbs have heating?", a: "Most good ones do (heaters, kangri-style bukhari stoves). Always check amenities before booking a winter stay." },
    { q: "Is Manali safe for solo travellers?", a: "Yes — it's one of India's most solo-friendly mountain towns, with easy transport and plenty of hostels and homestays." },
    { q: "When should I book for snow?", a: "December–January. Book at least a month ahead; Solang Valley prices surge during Christmas." }
  ],
  kerala: [
    { q: "Houseboat or lakefront villa — which is better?", a: "Houseboat if you want the classic drifting backwater experience for a night or two; villa if you want a base with AC and WiFi. Both are incredible." },
    { q: "Which Kerala destination is the most beautiful?", a: "Subjective — Munnar's tea hills and Alleppey's backwaters are the top two; Varkala is the most underrated." },
    { q: "Is Kerala expensive for travel?", a: "Mid-range compared with Goa. Budget homestays ₹1,200–₹2,000, plantation villas ₹3,500–₹6,000, private houseboats ₹6,000+." },
    { q: "What should I pack for Kerala?", a: "Light cottons, mosquito repellent, a rain jacket (monsoon) and something warm for Munnar mornings." }
  ],
  rishikesh: [
    { q: "Tapovan or Swarg Ashram for a first visit?", a: "Tapovan — better cafés, views and yoga studios, and still walkable to the ghats for evening aarti." },
    { q: "Is Rishikesh vegan-friendly?", a: "Extremely — it's famous for its cafés and most guesthouses serve vegetarian food by default." },
    { q: "Do I need to book rafting in advance?", a: "March–May and October are peak; book a day ahead with your host for the best rates." },
    { q: "Can I do yoga + rafting in the same trip?", a: "Absolutely — that's the standard itinerary: sunrise yoga in Tapovan, rafting by afternoon." }
  ],
  jaisalmer: [
    { q: "Fort stay or desert camp?", a: "Do both — two nights inside the fort for the heritage, one night at Sam dunes for the desert." },
    { q: "Is a night in the desert worth it?", a: "Unmissable. Camel safari at sunset, folk music, dinner under the stars — the defining Jaisalmer experience." },
    { q: "How far are Sam Sand Dunes from Jaisalmer?", a: "About 45 km — 1 hour by car. Camps usually include transport." },
    { q: "When is Jaisalmer best?", a: "November–February. The Desert Festival in February is spectacular but books out early." }
  ],
  shimla: [
    { q: "Shimla or Kufri for a stay?", a: "Shimla town for heritage and walks; Kufri/Fagu for snow views and quiet cottages. Many travellers combine both." },
    { q: "How cold does Shimla get?", a: "December–January can drop below freezing with snow in Kufri; March–June is pleasantly cool." },
    { q: "Is the toy train worth it?", a: "Yes — the Kalka–Shimla line is a UNESCO World Heritage route and the most scenic way to arrive." },
    { q: "Is Shimla good for a weekend trip?", a: "Perfect for it. A 2–3 night trip covers the Ridge, Mall Road and a Kufri day trip." }
  ]
};

const LISTING_DETAIL = {
  "casa-verde-goa": {
    airbnb: "https://www.airbnb.com/s/Calangute--Goa--India/homes",
    gallery: ["living", "bedroom", "kitchen", "resort-pool"],
    amenities: ["Private pool", "Air conditioning", "Free parking", "Kitchen", "Garden", "Sun terrace", "WiFi", "TV", "Washing machine", "Home-chef on request"],
    nearby: ["Calangute Beach — 6 min walk", "Baga Beach & Tito's — 10 min", "Mapusa Market — 20 min", "Anjuna Flea Market — 25 min"],
    desc: ["Tucked down a palm-lined lane between Calangute and Baga, Casa Verde is a four-bedroom villa built for slow mornings and long evenings. The shaded pool is the centre of gravity — surrounded by sun loungers, a tropical garden and a covered patio where breakfast is served.", "Interiors mix Goan-Portuguese touches — exposed brick, vintage cane chairs, bold tiles — with modern comforts like AC in every bedroom, a full kitchen and high-speed WiFi. A resident cook is available on request for thali spreads and seafood grills.", "With its own gates and parking, the villa suits couples, families and friend groups equally well. The host team (based in Calangute) arranges scooters, airport pickups and boat trips, so you can arrive with zero planning."],
    host: "Hosted by the De Souza family — Calangute hosts for 8 years, 4.9★ average across 212 stays"
  },
  "sunrise-beach-bungalow-gokarna": {
    airbnb: "https://www.airbnb.com/s/Gokarna--Karnataka--India/homes",
    gallery: ["bedroom", "terrace", "beach-hammock", "garden"],
    amenities: ["200 m to beach", "Free WiFi", "Garden", "Hammocks", "Café on site", "Hot water", "Fan", "Scooter rental", "Yoga classes", "Bonfire nights"],
    nearby: ["Om Beach — 8 min walk", "Gokarna Main Beach — 12 min", "Kudle Beach — 20 min", "Half Moon Beach — 25 min"],
    desc: ["A shack-chic bungalow wrapped in coconut palms, 200 metres from the sand at Gokarna's edge. The open veranda faces east, which means you wake up to sunrise over the water with coffee from the on-site café.", "Each bungalow keeps it simple on purpose: a firm bed with good linen, a fan for the breeze, an outdoor shower, and a hammock for the afternoon. This is beach time — phones get put away, evenings end around a bonfire.", "Gokarna is quieter and cheaper than Goa — a favourite of travellers who want real beaches without the scene. The host can arrange surf lessons, kayaks and the classic trek from Om to Half Moon Beach."],
    host: "Hosted by Akash & his surf crew — Gokarna locals, 4.8★ average across 156 stays"
  },
  "royal-haveli-jaipur": {
    airbnb: "https://www.airbnb.com/s/Jaipur--Rajasthan--India/homes",
    gallery: ["courtyard", "bedroom", "terrace", "living"],
    amenities: ["Rooftop dining", "Free breakfast", "Air conditioning", "Heritage architecture", "Free parking", "WiFi", "City Palace views", "Housekeeping", "Airport pickup", "Guided walks"],
    nearby: ["Hawa Mahal — 5 min walk", "City Palace — 8 min", "Jantar Mantar — 10 min", "Johari Bazaar — 12 min"],
    desc: ["Built in 1828 by a royal treasury family, this haveli in the heart of the Pink City has been run as a home-stay by the same family for four generations. Frescoed arches, mirrored jharokhas and a central courtyard fountain set the scene the moment you step through the carved doorway.", "The suite keeps original features — painted ceilings, marble inlay, antique brass — alongside a plush king bed and modern bathroom. Mornings start on the rooftop with a Rajasthani breakfast while Hawa Mahal glows pink in the distance.", "Hosts arrange the classic trio: an Amer Fort sunrise tour, a tuk-tuk bazaar crawl, and a heritage-walk guide who knows the old city's secrets. It's the highest-rated heritage stay on our Jaipur list for a reason."],
    host: "Hosted by the Rathore family — heritage hosts in the Pink City, 4.9★ across 189 stays"
  },
  "fort-view-haveli-jodhpur": {
    airbnb: "https://www.airbnb.com/s/Jodhpur--Rajasthan--India/homes",
    gallery: ["terrace", "bedroom", "living", "rooftop"],
    amenities: ["Mehrangarh Fort view", "Rooftop café", "Air conditioning", "Free breakfast", "WiFi", "Laundry", "Heritage rooms", "Chai service", "Bicycle rental", "Station pickup"],
    nearby: ["Mehrangarh Fort — 15 min walk", "Clock Tower Market — 8 min", "Jaswant Thada — 20 min", "Toorji's Stepwell — 10 min"],
    desc: ["In the indigo maze of Jodhpur's old town, this 150-year-old haveli climbs four storeys of painted balconies. The terrace — where breakfast is served — faces Mehrangarh Fort across the blue city, and it's the view travellers photograph most.", "Rooms pair restored jharokha windows and hand-painted murals with crisp bedding and modern bathrooms. The family keep the haveli's traditions alive: masala chai in the courtyard, a home-cooked dal-baati for dinner on request, and honest recommendations over tourist scripts.", "Blue City is walkable, chaotic and wonderful — the fort, clock tower and stepwell are all close. The host can arrange an early-morning fort entry to beat the crowds."],
    host: "Hosted by the Bishnoi family — Jodhpur old-town hosts, 4.7★ across 141 stays"
  },
  "lakeview-cottage-udaipur": {
    airbnb: "https://www.airbnb.com/s/Udaipur--Rajasthan--India/homes",
    gallery: ["lake-cottage", "terrace", "bedroom", "garden"],
    amenities: ["Private lake ghat", "Lake Pichola view", "Breakfast on deck", "Air conditioning", "WiFi", "Boat trips arranged", "Candlelit dinners", "Free parking", "Room service", "City Palace views"],
    nearby: ["Lake Pichola — on the waterfront", "City Palace — 15 min walk", "Jagdish Temple — 12 min", "Saheliyon-ki-Bari — 25 min"],
    desc: ["A whitewashed cottage on Pichola's waterfront with its own stone ghat — the kind of place that sells the dream of Udaipur in one sunrise. From the private deck, the Lake Palace floats across the water and the City Palace towers behind you.", "Inside: an airy bedroom with lake-facing windows, a sitting room with local art, and a veranda made for long breakfasts. The family next door runs the ghat-side kitchen and will send dinner down on a tray.", "The host's boatman takes guests out at dawn for the famous lake view from water level. It's easily the most romantic stay on our Udaipur list — and a fraction of the cost of the palace hotels across the lake."],
    host: "Hosted by the Mehta family — Pichola waterfront hosts, 4.9★ across 173 stays"
  },
  "pine-valley-manali": {
    airbnb: "https://www.airbnb.com/s/Manali--Himachal-Pradesh--India/homes",
    gallery: ["cabin", "bedroom", "hima-valley", "terrace"],
    amenities: ["Wood-burning stove", "Mountain view", "Balcony", "Free breakfast", "WiFi", "Hot water", "Parking", "Trekking guides", "Bonfire area", "Heaters"],
    nearby: ["Old Manali cafés — 15 min walk", "Hadimba Temple — 20 min", "Vashisht Hot Springs — 25 min", "Solang Valley — 30 min drive"],
    desc: ["A cedar-log cabin on the forested slope above Old Manali, set in its own clearing of pines. The window wall frames the Dhauladhar range, and the wood-burning stove turns snow-season nights into the coziest thing in the Himalayas.", "The cabin sleeps four across a bedroom and a mezzanine loft, with a kitchen for slow breakfasts and a balcony for the views that change every hour. Breakfast is included and comes from the family café down the lane.", "You're 15 minutes' walk from Old Manali's café strip and 30 from Solang Valley. The host organises day treks, rafting and the winter ski trips — just tell them your plans and they'll handle the rest."],
    host: "Hosted by Tashi & family — Old Manali mountain hosts, 4.8★ across 164 stays"
  },
  "himalayan-homestay-shimla": {
    airbnb: "https://www.airbnb.com/s/Shimla--Himachal-Pradesh--India/homes",
    gallery: ["cabin-2", "bedroom", "garden", "hima-valley"],
    amenities: ["Valley balcony", "Apple orchard", "Home-cooked meals", "Free breakfast", "Fireplace", "Hot water", "WiFi", "Parking", "Bonfire nights", "Trekking maps"],
    nearby: ["Kufri Fun World — 10 min drive", "Himalayan Nature Park — 15 min", "Shimla Mall Road — 40 min", "Mashobra — 25 min"],
    desc: ["A family-run stone cottage on the Kufri ridge, wrapped by its own apple orchard. The balconies face a valley that fills with mist by late afternoon, and in winter the fruit trees carry snow.", "The rooms are wood-panelled and warm, with heavy quilts for mountain nights. Meals are the real draw: pahadi rajma, siddu, and fresh chutneys made by the family, served in front of a crackling fire.", "Guests borrow orchard ladders in apple season, take forest walks to Mashobra, and drive 40 minutes down to the Mall Road when they want a town day. It's the highest-rated family homestay on our Shimla list."],
    host: "Hosted by the Chauhan family — Kufri ridge hosts, 4.9★ across 128 stays"
  },
  "tea-estate-villa-munnar": {
    airbnb: "https://www.airbnb.com/s/Munnar--Kerala--India/homes",
    gallery: ["tea-2", "bedroom", "garden", "living"],
    amenities: ["Tea garden views", "Estate walks", "Free breakfast", "Fireplace", "Hot water", "WiFi", "Parking", "Guided treks", "Library", "Board games"],
    nearby: ["Kolukkumalai viewpoint — 25 min", "Eravikulam National Park — 30 min", "Mattupetty Dam — 35 min", "Tea Museum — 20 min"],
    desc: ["An English-style plantation bungalow at the head of a working tea estate, with lawn chairs facing rolling green hills that disappear into mist. The colonial bones are intact — verandas, high ceilings, a fireplace — but the comfort is modern.", "Mornings start foggy and cold: coffee on the deck, then a walk through the tea bushes with the estate manager. Breakfast is Kerala-style (appam, stew, banana fritters) and absolutely worth waking up for.", "Munnar's sights — Eravikulam's nilgiri tahr, the Kolukkumalai sunrise, the tea museum — are all within half an hour. This villa is our top pick for honeymoons and slow couples' trips in Kerala."],
    host: "Hosted by the Nair family — tea-plantation hosts, 4.9★ across 201 stays"
  },
  "backwater-houseboat-alleppey": {
    airbnb: "https://www.airbnb.com/s/Alleppey--Kerala--India/homes",
    gallery: ["houseboat-2", "bedroom", "terrace", "kerala-palms"],
    amenities: ["Private houseboat", "Onboard chef", "Open sundeck", "AC bedrooms", "Kerala meals", "Cruise included", "Kayaks on request", "Pickup arranged", "Fishing", "Sunset cruise"],
    nearby: ["Alleppey Canal network — you're on it", "Alleppey Beach — 25 min by tuk-tuk", "Marari Beach — 45 min", "Kumarakom — 1 h"],
    desc: ["A private kettuvallam (rice-barge) houseboat that spends the day gliding through Alleppey's palm-lined canals. Your crew of three — captain, chef and deckhand — handle everything while you watch village life slide past: toddy-tappers, coir workers, temple processions.", "Two AC bedrooms open onto a covered deck with loungers, and the rooftop sundeck is the place to be at golden hour. Meals are the best part — fresh Kerala fish curry, prawn roast and appam, cooked onboard and served as you drift.", "This is a classic overnight cruise (day cruise + overnight + breakfast included). For the full experience our host suggests pairing it with one night in a lakefront villa — see our Kerala luxury guide."],
    host: "Hosted by Joy's boat crew — Alleppey backwater hosts, 4.8★ across 226 stays"
  },
  "clifftop-coconut-varkala": {
    airbnb: "https://www.airbnb.com/s/Varkala--Kerala--India/homes",
    gallery: ["sea-aerial", "bedroom", "beach-hammock", "terrace"],
    amenities: ["Cliff view", "Black-sand beach access", "Free breakfast", "WiFi", "Yoga classes", "Hot water", "Scooter rental", "Café downstairs", "Laundry", "Bonfire on beach"],
    nearby: ["Varkala Cliff walk — on your doorstep", "Papanasam Beach — 3 min", "Janardhana Temple — 10 min", "Kappil Beach — 20 min"],
    desc: ["A coconut-grove homestay a few steps from Varkala's famous red-cliff walk, with the black-sand beach just below. The upper balcony catches the full sunset — the reason most guests book, and the reason they extend.", "Rooms are simple and spotless with breezy balconies, good WiFi and the best breakfast south of Alleppey. Downstairs, the family café serves seafood caught that morning.", "Varkala is Kerala's most laid-back coast: morning yoga, afternoon cliff cafés, evening swims. The host arranges yoga classes, Ayurvedic massages and scooters, and knows every hidden beach from Kappil to Odayam."],
    host: "Hosted by the Menon family — Varkala cliff hosts, 4.7★ across 118 stays"
  },
  "chai-garden-darjeeling": {
    airbnb: "https://www.airbnb.com/s/Darjeeling--West-Bengal--India/homes",
    gallery: ["tea-1", "bedroom", "garden", "terrace"],
    amenities: ["Kanchenjunga view", "Tea estate access", "Free breakfast", "Hot water", "WiFi", "Bonfire", "Trekking routes", "Estate tours", "Warm quilts", "Packaged picnics"],
    nearby: ["Darjeeling Mall — 25 min drive", "Tiger Hill — 1 h", "Batasia Loop — 30 min", "Rock Garden — 40 min"],
    desc: ["A tea-garden bungalow perched above Darjeeling town with a straight-on view of Kanchenjunga — the world's third-highest peak and the reason guests set alarms for 4 am, then forget their plans on the deck.", "Rooms are cosy with heavy quilts, and the kitchen pours endless fresh Darjeeling first-flush. The family runs a small estate tour through the terraced gardens, and can pack a thermos-and-sandwich breakfast for Tiger Hill sunrises.", "It's a 25-minute drive down to the Darjeeling Mall, which keeps the bungalow quiet while the town crowds. For snow views, winter mornings are extraordinary."],
    host: "Hosted by the Tamang family — tea-garden hosts, 4.8★ across 134 stays"
  },
  "ganges-serenity-rishikesh": {
    airbnb: "https://www.airbnb.com/s/Rishikesh--Uttarakhand--India/homes",
    gallery: ["river", "bedroom", "yoga", "terrace"],
    amenities: ["Ganga-facing balcony", "Yoga mats", "Free breakfast", "WiFi", "Hot water", "Aarti view", "Rafting pickup", "Café access", "Library", "Parking"],
    nearby: ["Laxman Jhula — 8 min walk", "Parmarth Niketan aarti — 10 min", "Beatles Ashram — 15 min", "Shivpuri rafting — 20 min drive"],
    desc: ["A calm riverfront cabin in Tapovan with a balcony directly over the Ganga — close enough that the evening aarti floats up to you from the ghat below. It's the sound-of-the-river experience Rishikesh is famous for.", "Rooms are minimal and clean with good beds, a hot shower after cold mornings, and a window seat made for reading. Yoga mats are in every room; a studio and a juice bar are on the lane.", "Everything is walkable: Laxman Jhula, Parmarth's aarti, the Beatles Ashram. Rafting pickups come right to the door. Our pick for the best-value riverfront stay in Rishikesh."],
    host: "Hosted by Rohan — Tapovan riverfront host, 4.8★ across 147 stays"
  },
  "desert-camp-jaisalmer": {
    airbnb: "https://www.airbnb.com/s/Jaisalmer--Rajasthan--India/homes",
    gallery: ["desert-campfire", "bedroom", "desert-dunes", "terrace"],
    amenities: ["Swiss-style tent", "Camel safari", "Folk music & dance", "Dinner under stars", "Bonfire", "Heater (winter)", "Solar lights", "En-suite bath", "Pickup from city", "Sand-sledding"],
    nearby: ["Sam Sand Dunes — you're at the camp", "Jaisalmer Fort — 45 km", "Khuri village — 15 km", "Tanot Mata Temple — 100 km"],
    desc: ["A luxury Swiss tent at Sam Sand Dunes, the golden heart of the Thar. Camp life runs on a fixed rhythm: sunset camel safari, folk music around the bonfire, a Rajasthani dinner served under an impossibly starry sky, then sleep on a proper bed inside your own private tent.", "Each tent has an en-suite bathroom, thick rugs, a veranda with low chairs and, in winter, a heater. It's camping in name only — the comfort is real.", "The camp organises jeep safaris, sand-sledding and village visits. Jaisalmer Fort is an hour away, which is why most guests pair two fort nights with one dune night."],
    host: "Hosted by the Rathore camp crew — Sam dunes hosts, 4.7★ across 176 stays"
  },
  "lakeside-pine-nainital": {
    airbnb: "https://www.airbnb.com/s/Nainital--Uttarakhand--India/homes",
    gallery: ["lake-cottage", "bedroom", "cabin", "garden"],
    amenities: ["Lake view", "Fireplace", "Free breakfast", "Hot water", "WiFi", "Garden", "Parking", "Boat rides arranged", "Bonfire", "Sightseeing taxi"],
    nearby: ["Naini Lake — 8 min walk", "Mall Road — 10 min", "Naina Devi Temple — 12 min", "Tiffin Top — 30 min trek"],
    desc: ["A pine-shaded cottage above Nainital's Mall Road, a short walk from Naini Lake. The garden catches the morning sun, the fireplace handles winter evenings, and the lake glints through the pines from the upper deck.", "Rooms are warm and traditional with brass lamps and big windows. Breakfast is served in the garden when weather allows — parathas, omelettes and Nainital's famous tea.", "Boat rides on Naini Lake at sunrise, a lazy Mall Road afternoon, and the Tiffin Top trek if you're feeling energetic. One of the friendliest family stays in the Kumaon hills."],
    host: "Hosted by the Joshi family — Nainital hosts, 4.7★ across 121 stays"
  }
};

const TIER_PLANS = {
  best: {
    label: "Best", icon: "star", h2: "Top-Rated Airbnb in", sub: "Our highest-rated, most-loved stays",
    body: "These picks are the highest-rated stays in the area — judged on guest reviews, host response, location and repeat-bookings. They're the safe, spectacular choices most travellers should start with.",
    tip: "Best-tier stays book out 3–6 weeks ahead in peak season. Set an Airbnb search alert and book the moment your dates open up."
  },
  cheap: {
    label: "Cheap", icon: "wallet", h2: "Cheap Airbnb in", sub: "Great stays under the budget threshold",
    body: "Cheap doesn't mean rough. These budget Airbnbs keep the essentials — clean beds, hot water, good hosts, decent WiFi — and skip the extras you don't need. Perfect for backpackers, digital nomads and students.",
    tip: "Budget stays fill fast on weekends. Mid-week bookings are typically 20–30% cheaper, and most hosts offer discounts for 7+ night stays."
  },
  luxury: {
    label: "Luxury", icon: "diamond", h2: "Luxury Airbnb in", sub: "Private, indulgent, unforgettable",
    body: "These are the stays you'll tell people about — private pools, onboard chefs, lakefront ghats and panoramic decks. Each is hand-verified for quality, cleanliness and that extra wow factor.",
    tip: "For luxury stays, message the host before booking — many offer welcome hampers, airport pickups and early check-in to VIP guests who ask nicely."
  }
};

module.exports = { AREAS, DEST_CONTENT, FAQ_DEST, LISTING_DETAIL, TIER_PLANS };
