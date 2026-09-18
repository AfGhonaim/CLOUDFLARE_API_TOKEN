/* Cairo FACE — faculty profiles.
   PLACEHOLDER CONTENT: sessions, courses and past activity below are
   assumed sample data so the page can be reviewed. Swap the DOCTORS
   entries for the real programme when the agenda is confirmed. */
(function () {
  "use strict";

  var DOCTORS = {
    "foad-nahai": {
      name: "Foad Nahai", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/c8363adc-bf2c-4c84-9ca8-fc93d675a843.png",
      role: "International faculty · Aesthetic plastic surgery",
      bio: "A leading authority in aesthetic plastic surgery and a past president of ISAPS, joining Cairo FACE to lead facelift technique sessions.",
      meta: ["Atlanta, USA", "Deep plane facelift", "Live surgery"],
      upcoming: [
        ["Day 1 · 10:00", "Live surgery — deep plane facelift", "Main auditorium"],
        ["Day 2 · 14:30", "Masterclass — managing the ageing midface", "Hall B"],
        ["Day 3 · 11:00", "Panel — the future of facial rejuvenation", "Main auditorium"]
      ],
      courses: [
        ["Pre-Summit", "Cadaveric course — facelift anatomy", "Limited to 20 seats"],
        ["Day 2", "Hands-on workshop — suture suspension techniques", "Limited to 30 seats"]
      ],
      past: [
        ["Cairo FACE 2026", "Keynote — evolution of the facelift"],
        ["Cairo FACE 2025", "Live surgery — secondary rhytidectomy"]
      ]
    },
    "neil-gordon": {
      name: "Neil Gordon", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/53159be3-f238-4aee-8f68-16e5e0340222.webp",
      role: "International faculty · Facial plastic surgery",
      bio: "Facial plastic surgeon known for structural rhinoplasty and a long-standing contributor to Cairo FACE's surgical programme.",
      meta: ["Connecticut, USA", "Rhinoplasty", "Masterclass"],
      upcoming: [
        ["Day 1 · 13:00", "Live surgery — structural rhinoplasty", "Main auditorium"],
        ["Day 2 · 09:30", "Masterclass — the difficult nasal tip", "Hall A"]
      ],
      courses: [
        ["Pre-Summit", "Cadaveric course — nasal framework anatomy", "Limited to 20 seats"]
      ],
      past: [
        ["Cairo FACE 2026", "Masterclass — revision rhinoplasty"]
      ]
    },
    "steven-dayan": {
      name: "Steven Dayan", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/80d6fdfe-aecb-4a6f-b88a-70093b1bf424.png",
      role: "International faculty · Facial plastic surgery",
      bio: "Clinical researcher and facial plastic surgeon focused on non-surgical rejuvenation and patient-reported outcomes.",
      meta: ["Chicago, USA", "Non-surgical", "Injectables"],
      upcoming: [
        ["Day 2 · 11:00", "Live demonstration — full-face injectable strategy", "Hall A"],
        ["Day 3 · 15:00", "Session — measuring outcomes in aesthetics", "Hall B"]
      ],
      courses: [
        ["Day 1", "Hands-on workshop — advanced filler techniques", "Limited to 30 seats"]
      ],
      past: [
        ["Cairo FACE 2026", "Live demonstration — non-surgical lift"],
        ["Cairo FACE 2024", "Panel — the psychology of aesthetics"]
      ]
    },
    "firas-hamdan": {
      name: "Firas Hamdan", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/497411fa-0c74-433f-a64b-251055f3d168.png",
      role: "International faculty · Aesthetic medicine",
      bio: "Aesthetic physician specialising in regenerative approaches and combination protocols for facial rejuvenation.",
      meta: ["Beirut, Lebanon", "Regenerative", "Workshops"],
      upcoming: [
        ["Day 1 · 16:00", "Session — regenerative medicine in facial aesthetics", "Hall B"],
        ["Day 3 · 10:00", "Live demonstration — biostimulator protocols", "Hall A"]
      ],
      courses: [
        ["Day 2", "Hands-on workshop — combination therapy planning", "Limited to 25 seats"]
      ],
      past: [
        ["Cairo FACE 2026", "Workshop — regenerative injectables"]
      ]
    },
    "dean-toriumi": {
      name: "Dean Toriumi", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/005df837-3052-480a-82fa-85fd96274819.png",
      role: "International faculty · Rhinoplasty",
      bio: "Internationally recognised rhinoplasty surgeon and author, teaching structural grafting at Cairo FACE.",
      meta: ["Chicago, USA", "Rhinoplasty", "Cadaveric course"],
      upcoming: [
        ["Day 2 · 08:30", "Live surgery — dorsal preservation rhinoplasty", "Main auditorium"],
        ["Day 3 · 13:30", "Masterclass — costal cartilage grafting", "Hall A"]
      ],
      courses: [
        ["Pre-Summit", "Cadaveric course — advanced nasal grafting", "Limited to 20 seats"]
      ],
      past: [
        ["Cairo FACE 2026", "Live surgery — revision rhinoplasty"],
        ["Cairo FACE 2025", "Masterclass — the ethnic nose"]
      ]
    },
    "khaled-omar": {
      name: "Khaled Omar", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/94e9d71a-5703-47c9-9d0a-8734820688e1.png",
      role: "National faculty · Facial plastic surgery",
      bio: "Cairo-based facial plastic surgeon and Cairo FACE faculty member, leading the hands-on training track.",
      meta: ["Cairo, Egypt", "Facial surgery", "Hands-on training"],
      upcoming: [
        ["Day 1 · 09:00", "Opening session — welcome and programme overview", "Main auditorium"],
        ["Day 2 · 16:30", "Panel — building an aesthetic practice in the region", "Hall B"]
      ],
      courses: [
        ["Pre-Summit", "Hands-on course — facial anatomy essentials", "Limited to 30 seats"],
        ["Day 3", "Workshop — thread lifting techniques", "Limited to 25 seats"]
      ],
      past: [
        ["Cairo FACE 2026", "Session — regional practice trends"],
        ["Cairo FACE 2025", "Hands-on course — injectable anatomy"]
      ]
    },
    "ayman-jaber": {
      name: "Ayman Jaber", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/ba955172-23a4-43fc-ac22-2953f6d51b78.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "mario-ferraz": {
      name: "Mario Ferraz", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/a7fd1668-a1ff-489e-b04b-01dc196d3858.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "ahmed-al-ali": {
      name: "Ahmed Al Ali", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/2081121c-aae2-4513-96b2-81486c40f8f0.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "mariam-tsvitsvadze": {
      name: "Mariam Tsvitsvadze", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/c140a1a3-874f-4300-9bec-eecfa97103af.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "mahmoud-elkholy": {
      name: "Mahmoud Elkholy", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/b05c5269-5ff0-4635-862e-cde07e69e0d2.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "andres-rodriguez": {
      name: "Andres Rodriguez", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/3d3b97ee-bed0-497a-b597-e825263863a7.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "omar-fouda": {
      name: "Omar Fouda", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/bb2da3b8-1602-40a3-ba6f-aab15c27a1c9.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "saleem-zaro": {
      name: "Saleem Zaro", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/b982ae83-9e10-4d4f-870d-c9b9c52846d1.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "hemin-sherif": {
      name: "Hemin Sherif", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/53267595-c3d1-40a3-a764-41a3efccf280.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "tamari-lolua": {
      name: "Tamari Lolua", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/f8d8b700-b580-4b73-9458-0005f7acc9bd.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "shailesh-vdodoria": {
      name: "Shailesh Vdodoria", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/3811f7cd-af23-495d-83bd-d01330557868.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "sheher-bano-khan": {
      name: "Sheher Bano Khan", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/6f63ad8a-3374-4990-9770-272fa27f32e3.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "rafael-loucas": {
      name: "Rafael Loucas", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/bcbd05fa-dc79-4b6e-81d5-f6da0dab2dcf.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "pablo-sanchez-saizar": {
      name: "Pablo Sánchez Saizar", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/cefbf1d6-f80b-4bf7-b963-23196145ec25.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "murat-tsintsadze": {
      name: "Murat Tsintsadze", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/3b93ceb3-726b-4756-b4bb-141aa00523b4.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "muhammed-sheraz": {
      name: "Muhammed Sheraz", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/5dd2ffee-f0bd-4f3c-8d34-427b9035a375.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "mehmet-comert": {
      name: "Mehmet Comert", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/e103f119-0041-4797-81be-51f3c2e218c2.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "maurizio-cavallini": {
      name: "Maurizio Cavallini", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/d7a694d8-b930-4ec7-a4d1-7bf10f656694.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "marios-loucas": {
      name: "Marios Loucas", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/839e309d-4a26-4648-be0f-2108e75e4a61.jpeg",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "yahia-hashish": {
      name: "Yahia Hashish", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/455c4c9b-9b91-4a9d-8f3c-0f8f8971d191.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "george-christopoulos": {
      name: "George Christopoulos", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/11ad4d13-c62a-4438-9826-891486c672c7.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "islam-gawish": {
      name: "Islam Gawish", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/936d8405-4a27-4ab1-a6f3-c060a7c8577c.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "sara-el-toukhy": {
      name: "Sara El Toukhy", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/46dbd3a6-0391-4a04-9f4f-75eb41aa6913.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "ahmed-mansour": {
      name: "Ahmed Mansour", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/8e0d0b10-a2c9-4446-bfb2-29df335bd289.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "dina-hassan": {
      name: "Dina Hassan", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/707593de-1720-475f-9ce0-f4226e80927d.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "ahmed-yehia": {
      name: "Ahmed Yehia", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/b62b69ad-f5d3-424a-a6f1-07f66c6411a5.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "ruben-kannan": {
      name: "Ruben Kannan", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/e032333e-ae80-4666-8e3b-2f7e2ef3a22b.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "olivas-menayo": {
      name: "Olivas Menayo", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/89e4612c-3c53-42b8-abb9-aa90bb93c9c5.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "nancy-labib": {
      name: "Nancy labib", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/f236d482-843c-410d-9218-4807bc810e52.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "lukas-prantl": {
      name: "Lukas Prantl", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/77b815be-c67b-483a-af69-5db42bf431e3.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "demetris-savva": {
      name: "Demetris Savva", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/8187eb9d-c319-49fd-91f5-a30ce6e1b62d.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "anita-altmayer": {
      name: "Anita Altmayer", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/17f4d0b0-842d-4ac9-a6d0-33e6a21bd7c4.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "vania-dalmedo": {
      name: "Vania Dalmedo", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/1682c598-3f8e-42e0-9384-721546fd4343.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "andrej-testen": {
      name: "Andrej Testen", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/454b827f-31a0-4f22-9051-25847a55b8d0.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "saad-hajeri": {
      name: "Saad Hajeri", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/a7f1eca4-945f-4e97-8ec1-fd3b8a1c4f10.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "salma-elhouly": {
      name: "Salma Elhouly", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/2de0f234-696c-4f3c-8589-9966902a2829.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "ahmed-abdelaziz": {
      name: "Ahmed Abdelaziz", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/4de57f5d-6e84-4347-8f1c-dac9b5b9d562.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "thuha-jabbar": {
      name: "Thuha Jabbar", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/d865db63-7bff-4a67-8829-e13550870bc7.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "sabreyah-al-saleh": {
      name: "Sabreyah Al Saleh", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/e4ceabea-3d05-4e75-a384-9dbfdafdaa33.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "mahmoud-daoud": {
      name: "Mahmoud Daoud", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/d3685017-d132-4994-957c-12894714aae4.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "amin-kalaaji": {
      name: "Amin Kalaaji", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/da0e0a10-6ff4-45d7-8bb5-f77010bed162.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "fadi-hamdani": {
      name: "Fadi Hamdani", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/079f3c17-bdb2-45f7-ad97-ea0ade899aa3.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "hisham-seify": {
      name: "Hisham Seify", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/23f3a2fb-747c-4d68-b0ac-f3cb8e4f5154.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "patrick-treacy": {
      name: "Patrick Treacy", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/ef0bf796-ed7f-4b23-87eb-7095a4c77372.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "luiz-carlos-ishida": {
      name: "Luiz Carlos Ishida", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/562f9b5f-2a04-4d4b-a7ac-4457f650eb4e.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "akhmed-rakhimov": {
      name: "Akhmed Rakhimov", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/e2e5a560-7d36-4872-9a1e-e8cc0b382543.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "zekeriya-kul": {
      name: "Zekeriya KUL", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/d3a5e3f1-2557-4256-a99e-9d97f972a55a.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "serdar-eren": {
      name: "Serdar Eren", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/e800c6df-4e99-4e7f-b5cd-059afd93d90a.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "deniz-demiryurek": {
      name: "Deniz Demiryürek", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/86cd7c04-df0a-4618-b7de-153e2acaaaa9.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "olivier-gerbault": {
      name: "Olivier Gerbault", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/a31a9dcd-2b1b-4ebe-bf20-935c4587c725.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "froilan-paez": {
      name: "Froilan Paez", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/3a9d2384-b375-4229-8152-c5f88280e93d.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "muhammed-zia": {
      name: "Muhammed Zia", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/9b6128ca-fcea-44d1-b16a-939ec8cd65e8.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "ahmet-alp": {
      name: "Ahmet Alp", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/9d27dc17-1b8b-4f3c-bee3-4bacf5e165ba.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "ramtin-kassir": {
      name: "Ramtin Kassir", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/80faa01d-a1e9-47e5-a461-87b3fb214fbd.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "sercan-gode": {
      name: "Sercan GÖDE", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/1a77ba3c-becf-4353-b942-571eedb1d792.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "tiago-baptista-fernandes": {
      name: "Tiago Baptista Fernandes", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/f26532c7-2f29-401d-ab7f-dafbb6760682.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "emre-ilhan": {
      name: "Emre İLHAN", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/b75f928c-02b3-4c61-95f7-645ba663b00d.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "ali-ghanem": {
      name: "Ali Ghanem", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/23eaf8f9-439d-4594-9de0-54f8c2f52815.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "hossam-foda": {
      name: "Hossam Foda", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/aa277796-0feb-45e4-8f4e-f9575478c12f.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "kevin-sadati": {
      name: "Kevin Sadati", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/17f2eba1-4ddc-4693-bf2f-7d2ba2ff10dd.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "michele-pascali": {
      name: "Michele Pascali", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/0290ce48-23b6-4850-a47e-60e89719d7e8.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "tiago-lyrio": {
      name: "Tiago Lyrio", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/d3868f5d-5d12-4896-b964-90490e7fac16.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "fahad-mirza": {
      name: "Fahad Mirza", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/bb0844b8-6993-411a-a183-c08e3c9fcbc7.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "jordan-jacobs": {
      name: "Jordan Jacobs", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/38fc7f12-a0fd-4d3a-ace9-6f058264c8fe.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "javier-beut": {
      name: "Javier Beut", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/642eab76-0d72-4080-b320-756f578be243.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "jasmina-pavlovska": {
      name: "Jasmina Pavlovska", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/1e40622d-d811-4a1d-b238-06b54a14e265.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "ivan-rasic": {
      name: "Ivan Rašić", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/43474123-9b85-4abd-b997-2589d6601ee5.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "hatim-droussi": {
      name: "Hatim Droussi", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/6292f17b-9c89-43fc-9d77-c5d2940aba48.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "hamed-tarban": {
      name: "Hamed Tarban", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/785921db-2a43-4c20-807e-754b08420f7c.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "georgios-vlackakis": {
      name: "Georgios Vlackakis", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/f2c7a81c-01f5-46bd-8cf8-aa6f1cc06459.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "fernando-felice": {
      name: "Fernando Felice", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/20e7560e-2a95-4c25-9b67-69adbbe641cd.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "fas-arshad": {
      name: "Fas Arshad", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/c9539672-31a5-4220-83d6-6e1d579b9b6e.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "basel-sharaf": {
      name: "Basel Sharaf", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/d0f1f3a4-1697-445b-9961-45ab01227fc1.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "kamaluddin-khan": {
      name: "Kamaluddin Khan", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/3a5ef41c-b600-497b-9938-1ee5c583cec4.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "daniel-saleh": {
      name: "Daniel Saleh", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/eecf9742-d37e-4dad-983d-7c236d32965e.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "amira-najar": {
      name: "Amira Najar", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/15fd3d9f-6680-43bd-a86f-e8a28de5ef88.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "almukhtar-n-alden": {
      name: "Almukhtar N.Alden", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/27443d0d-62a6-470b-8935-56a066b2ac7b.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "adriano-santorelli": {
      name: "Adriano Santorelli", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/fe19a21f-3acc-4dea-a358-8a827765056a.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "zainab-almukhtar": {
      name: "Zainab Almukhtar", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/d14414b5-965b-41e5-a57e-6ad8c5d123c5.svg",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "yusra-almukhtar": {
      name: "Yusra Almukhtar", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/d53433ed-7258-44da-bd05-597a9acf88b6.svg",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "samir-ghoraba": {
      name: "Samir Ghoraba", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/7ff497f9-072e-4c42-a649-1939370afb7a.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "natalia-manturova": {
      name: "Natalia Manturova", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/ae4c74b6-f24d-4fda-8946-c6acaab0cedf.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "khalid-alsbeih": {
      name: "Khalid Alsbeih", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Speakers/79de9dd8-1dac-48db-b4dd-d074f5a4a193.png",
      role: "Speaker",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "samir-ghoraba-committee": {
      name: "Samir Ghoraba", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/a5ac6bcd-568e-4035-b19c-08865c543be8.png",
      role: "Founder & President",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "hani-nabil-committee": {
      name: "Hani Nabil", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/32919ae8-ff6c-43cc-8d6c-200cddc6cf82.png",
      role: "Honorary President",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "khaled-sami-committee": {
      name: "Khaled Sami", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/a9ab8b25-9546-4591-b5eb-c961edeef1ec.png",
      role: "Founding Member",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "mohamed-abdelkader-committee": {
      name: "Mohamed Abdelkader", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/b1659806-f67e-4b91-98fd-995544703aef.png",
      role: "Founding Member",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "sherif-wasief-committee": {
      name: "Sherif Wasief", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/1ceae4a9-d8bb-4365-a80e-c53bc63896a2.png",
      role: "Founding Member",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "tarek-zahra-committee": {
      name: "Tarek Zahra", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/9d72a161-96a7-483f-80e4-772b4aac1a5f.png",
      role: "Founding Member",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "ahmed-mansour-committee": {
      name: "Ahmed Mansour", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/b7c81b64-1037-4e1e-b6b1-33e114d7b54c.png",
      role: "Executive Board",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "islam-gawish-committee": {
      name: "Islam Gawish", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/49925a74-9e3e-485d-b4fc-b002746e0cac.png",
      role: "Executive Board",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "reem-nouman-committee": {
      name: "Reem Nouman", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/0279f0da-f8fc-43eb-9bee-a2ebaf64b505.png",
      role: "Executive Board",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "ahmed-abdelaziz-committee": {
      name: "Ahmed Abdelaziz", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/c336121a-6ac6-4a8e-b388-d8ccf27a5c19.png",
      role: "Scientific Committee",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "mariam-tsivtsivadze-committee": {
      name: "Mariam Tsivtsivadze", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/83d15ef3-a011-4ced-87ec-f13c46ff2964.png",
      role: "Scientific Committee",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "moataz-nossier-committee": {
      name: "Moataz Nossier", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/45d6db90-b97d-440a-8e25-09e7940de83f.png",
      role: "Scientific Committee",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "sara-eltoukhy-committee": {
      name: "Sara Eltoukhy", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/0320ffd7-c710-4889-a5a9-83ece990363b.png",
      role: "Scientific Committee",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "shailesh-vadodaria-committee": {
      name: "Shailesh Vadodaria", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/4f5d0271-3c82-4f15-ade3-65cc579a4b54.png",
      role: "Scientific Committee",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "sheher-bano-khan-committee": {
      name: "Sheher Bano Khan", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/a513137b-1e0c-4583-b95e-000c2de698c5.png",
      role: "Scientific Committee",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "yahia-hashish-committee": {
      name: "Yahia Hashish", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/1e6e79ac-14f4-45d4-ae54-9d3d5c05a4dd.png",
      role: "Scientific Committee",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "riham-ashoush-committee": {
      name: "Riham Ashoush", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/365c6146-1085-4e3d-ab13-2577b566fcf2.png",
      role: "Scientific Committee",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "akhmed-rakhimov-committee": {
      name: "Akhmed Rakhimov", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/b48e0dc4-9533-432c-87ba-fddbaf7a4453.png",
      role: "Scientific Committee",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "mahmoud-elkhouly-committee": {
      name: "Mahmoud Elkhouly", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/5742f0b6-04d7-43b3-a7b5-536a6ad664fe.png",
      role: "Scientific Committee",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "may-shoeib-committee": {
      name: "May Shoeib", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/75e284e0-cdd7-45e8-965a-869b7522ea9d.png",
      role: "Scientific Committee",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "natalia-manturova-committee": {
      name: "Natalia Manturova", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/5d18ead0-b62c-4143-a96f-f9009303927e.png",
      role: "Scientific Committee",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "hossam-foda-committee": {
      name: "Hossam Foda", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/898672e1-d26f-4893-a51a-ce17728cbb6a.png",
      role: "International Coordinator",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    },
    "may-elsamahy-committee": {
      name: "May Elsamahy", photo: "https://cairoface.s3.eu-central-1.amazonaws.com/Home/ff9aeb82-fb6b-4233-a75b-2dafcb57daf7.jpeg",
      role: "Advisory Board",
      bio: "",
      meta: [],
      upcoming: [],
      courses: [],
      past: []
    }
  };

  window.CF_DOCTORS = DOCTORS;   /* read by js/person-modal.js */

  /* index.html and speakers.html load this file only for the data the pop-up
     needs — the profile-page rendering below would throw on their markup. */
  if (!document.getElementById("docName")) return;

  function esc(v) { var d = document.createElement("div"); d.textContent = v; return d.innerHTML; }
  function rows(list, ul) {
    if (!ul) return;
    if (!list || !list.length) { ul.innerHTML = '<li class="docitem docitem--empty"><span class="body">To be announced.</span></li>'; return; }
    ul.innerHTML = list.map(function (r) {
      return '<li class="docitem">' +
        '<span class="docitem__when label label--dim">' + esc(r[0]) + "</span>" +
        '<span class="docitem__what heading">' + esc(r[1]) + "</span>" +
        (r[2] ? '<span class="docitem__where body">' + esc(r[2]) + "</span>" : "") +
        "</li>";
    }).join("");
  }

  var id = new URLSearchParams(location.search).get("id") || "";
  var d = Object.prototype.hasOwnProperty.call(DOCTORS, id) ? DOCTORS[id] : null;

  if (!d) {
    document.getElementById("docName").textContent = "Faculty member not found";
    document.getElementById("docBio").textContent =
      "This profile is not available yet. Browse the full faculty instead.";
    document.getElementById("docPhoto").parentElement.remove();
    ["docUpcoming", "docCourses", "docPast"].forEach(function (k) { rows(null, document.getElementById(k)); });
    return;
  }

  document.title = d.name + " — Cairo FACE World Summit 2027";
  var img = document.getElementById("docPhoto");
  img.src = d.photo; img.alt = d.name;
  document.getElementById("docName").textContent = d.name;
  document.getElementById("docRole").textContent = d.role;
  document.getElementById("docBio").textContent = d.bio;
  document.getElementById("docMeta").innerHTML =
    (d.meta || []).map(function (m) { return '<span class="docchip">' + esc(m) + "</span>"; }).join("");
  rows(d.upcoming, document.getElementById("docUpcoming"));
  rows(d.courses, document.getElementById("docCourses"));
  rows(d.past, document.getElementById("docPast"));
})();
