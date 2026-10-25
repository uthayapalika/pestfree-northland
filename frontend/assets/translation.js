(function () {
  const LANGUAGE_KEY = "pfn-language";
  const translations = {
    "Protect our future": "Tiakina tō tātou anamata",
    "Our mission": "Tā mātou kaupapa",
    "Platform": "Te tūāpapa",
    "Community": "Te hapori",
    "Login": "Takiuru",
    "Get started": "Tīmata",
    "A community-powered mission": "He kaupapa nā te hapori",
    "Protect our land.": "Tiakina tō tātou whenua.",
    "Create a pest-free future.": "Hangaia he anamata kore riha.",
    "Join communities across Northland to monitor pest traps, record catches and help protect our native wildlife.": "Hono atu ki ngā hapori puta noa i Te Tai Tokerau ki te aroturuki i ngā mahanga riha, ki te tuhi i ngā mau me te tiaki i ā tātou kararehe māori.",
    "Trap monitoring made simple": "He māmā te aroturuki mahanga",
    "Every check counts.": "He mea nui ia tirohanga.",
    "Record it in seconds.": "Tuhia i roto i ngā hēkona.",
    "Log trap checks and catches on the go, so your whole crew sees the same picture.": "Tuhia ngā tirohanga mahanga me ngā mau i a koe e haere ana, kia mōhio ai tō tīma katoa ki ngā kōrero.",
    "Northland, New Zealand": "Te Tai Tokerau, Aotearoa",
    "One region.": "Kotahi te rohe.",
    "One shared mission.": "Kotahi te kaupapa ngātahi.",
    "Help protect the forests, birds and coastlines that make Northland special for generations to come.": "Āwhinatia te tiaki i ngā ngahere, ngā manu me ngā takutai e whakahirahira ai a Te Tai Tokerau mō ngā whakatupuranga kei te heke mai.",
    "Join the movement →": "Hono mai ki te kaupapa →",
    "Explore the platform": "Tirohia te tūāpapa",
    "Track": "Aroturuki",
    "Record": "Tuhia",
    "Protect": "Tiakina",
    "Trap monitoring": "Aroturuki mahanga",
    "Record trap activity and keep observations organised.": "Tuhia ngā mahi a ngā mahanga, kia pai te whakariterite i ngā kitenga.",
    "Catch records": "Ngā mau kua tuhia",
    "Log what you find so the whole crew sees the same picture.": "Tuhia ngā mea ka kitea e koe kia mōhio ai tō tīma katoa.",
    "Local action": "Ngā mahi ā-rohe",
    "Support conservation through community participation.": "Āwhinatia te tiaki taiao mā te whai wāhi a te hapori.",
    "The platform": "Te tūāpapa",
    "Small actions.": "He mahi iti.",
    "Lasting impact.": "He pānga toitū.",
    "A central place for community members to record observations, manage trap information and support Northland's conservation efforts.": "He wāhi kotahi mā ngā mema o te hapori hei tuhi kitenga, hei whakahaere kōrero mahanga, hei āwhina hoki i ngā mahi tiaki taiao o Te Tai Tokerau.",
    "Trap management": "Whakahaere mahanga",
    "Keep trap details, locations and monitoring records together in one place.": "Puritia ngā taipitopito mahanga, ngā wāhi me ngā tuhinga aroturuki ki te wāhi kotahi.",
    "Learn more →": "Ako atu →",
    "Location mapping": "Mahere wāhi",
    "See every trap and trap line on a map, and plan your next visit.": "Tirohia ngā mahanga me ngā rārangi mahanga katoa ki te mahere, ka whakarite ai i tō haerenga whai muri.",
    "Reports": "Ngā pūrongo",
    "Turn recorded checks and catches into clear summaries for your team.": "Whakarāpopototia ngā tirohanga me ngā mau kua tuhia hei kōrero mārama mā tō tīma.",
    "Be part of the change": "Whai wāhi ki te panonitanga",
    "Northland's future is in our hands.": "Kei ō tātou ringa te anamata o Te Tai Tokerau.",
    "Create an account to take part in the mission, record observations and support a healthier environment for future generations.": "Hangaia he pūkete kia whai wāhi ai koe ki te kaupapa, ki te tuhi kitenga, ki te tautoko hoki i tētahi taiao hauora ake mō ngā whakatupuranga kei te heke mai.",
    "Get started today": "Tīmata i tēnei rā",
    "Home": "Kāinga",
    "Register": "Rēhita",
    "Pest-Free Tracker — Protect native wildlife": "Pest-Free Tracker — Tiakina ngā kararehe māori",
    "Pest-Free Tracker": "Pest-Free Tracker",
    "Dashboard - Pest-Free Admin": "Papatohu - Pest-Free",
    "Field check - Pest-Free Admin": "Tirohanga ā-mahi - Pest-Free",
    "Map - Pest-Free Admin": "Mahere - Pest-Free",
    "Traps - Pest-Free Admin": "Ngā mahanga - Pest-Free",
    "Trap lines - Pest-Free Admin": "Ngā rārangi mahanga - Pest-Free",
    "Catches - Pest-Free Admin": "Ngā mau - Pest-Free",
    "Reports - Pest-Free Admin": "Ngā pūrongo - Pest-Free",
    "QR codes - Pest-Free Admin": "Ngā waehere QR - Pest-Free",
    "Users - Pest-Free Admin": "Ngā kaiwhakamahi - Pest-Free",
    "Settings - Pest-Free Admin": "Ngā tautuhinga - Pest-Free",
    "Login - Pest-Free Admin": "Takiuru - Pest-Free",
    "Register - Pest-Free Admin": "Rēhita - Pest-Free",
    "Monitor pest traps, record catches and help protect Northland's native wildlife.": "Aroturukihia ngā mahanga riha, tuhia ngā mau, āwhinatia hoki te tiaki i ngā kararehe māori o Te Tai Tokerau.",

    "Dashboard": "Papatohu",
    "Field check": "Tirohanga ā-mahi",
    "Map": "Mahere",
    "Traps": "Ngā mahanga",
    "Trap lines": "Ngā rārangi mahanga",
    "Catches": "Ngā mau",
    "QR codes": "Ngā waehere QR",
    "Users": "Ngā kaiwhakamahi",
    "Settings": "Ngā tautuhinga",
    "Admin panel": "Paewhiri kaiwhakahaere",
    "Log out": "Takiputa",
    "Welcome back": "Nau mai anō",
    "Sign in to manage traps, trap lines and your crew.": "Takiuru ki te whakahaere i ngā mahanga, ngā rārangi mahanga me tō tīma.",
    "Email": "Īmēra",
    "Password": "Kupuhipa",
    "Sign in": "Takiuru",
    "No account?": "Kāore he pūkete?",
    "Demo coordinator: coordinator@example.com / Coord1234": "Pūkete kaiwhakarite whakamātau: coordinator@example.com / Coord1234",
    "Join the crew": "Hono mai ki te tīma",
    "Create a volunteer account to start using the tracker.": "Hangaia he pūkete tūao hei tīmata ki te whakamahi i te pūnaha aroturuki.",
    "Full name": "Ingoa katoa",
    "Confirm password": "Whakaū kupuhipa",
    "Create account": "Hangaia he pūkete",
    "Already registered?": "Kua rēhita kē?",
    "Loading...": "Kei te uta...",
    "No data yet.": "Kāore anō kia whai raraunga.",
    "Charts could not load (are you offline?).": "Kāore i taea te uta ngā kauwhata (kua momotu koe i te ipurangi?).",
    "Up to date": "Kei te pai",
    "Due soon": "Kua tata te wā",
    "Overdue": "Kua hipa te wā",
    "Never checked": "Kāore anō kia tirohia",
    "Needs a visit": "Me toro atu",
    "Line": "Rārangi",
    "Check status": "Tūnga tirohanga",
    "Last result": "Hua whakamutunga",
    "Log check": "Tuhia he tirohanga",
    "Checks": "Ngā tirohanga",
    "Overdue traps": "Ngā mahanga kua hipa te wā",
    "Appearance": "Āhua",
    "Matches the Pest-Free public site. Your choice is saved on this device.": "He ōrite ki te paetukutuku tūmatanui Pest-Free. Ka tiakina tō kōwhiringa ki tēnei pūrere.",
    "Dark": "Pōuri",
    "Light": "Mārama",
    "Account": "Pūkete",
    "Group catches by": "Whakarōpūhia ngā mau mā",
    "Month": "Marama",
    "Export report CSV": "Kaweake pūrongo CSV",
    "Export all traps CSV": "Kaweake ngā mahanga katoa ki CSV",
    "Traps by last status": "Ngā mahanga ā-tūnga whakamutunga",
    "Traps by check status": "Ngā mahanga ā-tūnga tirohanga",
    "not checked yet": "kāore anō kia tirohia",
    "Bait needed / sprung": "Me tāpiri mounu / kua puta te mahanga",
    "All traps are up to date.": "Kei te pai ngā mahanga katoa.",
    "Showing 10 of": "E whakaatu ana i te 10 o",
    "See the Traps page for all.": "Tirohia te whārangi Ngā mahanga mō te katoa.",
    "Catches per month (last 12 months)": "Ngā mau ā-marama (ngā marama 12 kua hipa)",
    "Trap check status": "Tūnga tirohanga mahanga",
    "Catches by species": "Ngā mau ā-momo",
    "Catches by trap line": "Ngā mau ā-rārangi mahanga",
    "Recent checks": "Ngā tirohanga tata",
    "Trap": "Mahanga",
    "Status": "Tūnga",
    "Checked at": "Wā i tirohia",
    "No checks yet": "Kāore anō kia tirohia",
    "Something went wrong": "I puta he hapa",
    "Delete this item?": "Mukua tēnei tūemi?",
    "This cannot be undone.": "Kāore e taea te whakahoki mai.",
    "Yes, delete": "Āe, mukua",
    "Cancel": "Whakakore",
    "Close": "Katia",
    "Choose...": "Kōwhiria...",
    "Save": "Tiaki",
    "Saving...": "Kei te tiaki...",
    "Add": "Tāpiri",
    "Edit": "Whakatika",
    "Delete": "Mukua",
    "Export CSV": "Kaweake CSV",
    "There is nothing to export yet.": "Kāore anō he kōrero hei kaweake.",
    "Added successfully": "Kua tāpirihia",
    "Changes saved": "Kua tiakina ngā huringa",
    "Deleted": "Kua mukua",
    "Sensitive location?": "He wāhi tairongo?",
    "Species caught": "Ngā momo i mau",
    "Notes (optional)": "Ngā tuhipoka (kōwhiringa)",
    "Checked at (optional)": "Wā tirohanga (kōwhiringa)",
    "Can see exact locations?": "Ka taea te kite i ngā wāhi pū?",
    "Trap line": "Rārangi mahanga",
    "Trap code": "Waehere mahanga",
    "Trap type": "Momo mahanga",
    "General area": "Wāhi whānui",
    "Exact lat": "Ahopae pū",
    "Exact lng": "Ahopou pū",
    "Can view exact location": "Ka taea te kite i te wāhi pū",
    "Can view exact locations": "Ka taea te kite i ngā wāhi pū",
    "Role": "Tūranga",
    "Name": "Ingoa",
    "ID": "Tau tautuhi",
    "Code": "Waehere",
    "Species": "Momo",
    "Notes": "Ngā tuhipoka",
    "Recorded at": "Wā i tuhia",
    "Recorded": "Kua tuhia",
    "Total": "Tapeke",
    "Group": "Rōpū",
    "No data": "Kāore he raraunga",
    "All trap lines": "Ngā rārangi mahanga katoa",
    "Only overdue / needs attention": "Ko ngā mea kua hipa te wā / me aro atu",
    "Click the map to add a trap there.": "Pāwhiria te mahere hei tāpiri mahanga ki reira.",
    "Tap a marker for details.": "Pāwhiria tētahi tohu mō ngā taipitopito.",
    "Checked in last": "I tirohia i roto i ngā rā",
    "days ago": "rā ki muri",
    "Click the map": "Pāwhiria te mahere",
    "Last check:": "Tirohanga whakamutunga:",
    "Result:": "Hua:",
    "Log a check": "Tuhia he tirohanga",
    "Add trap": "Tāpiri mahanga",
    "Add trap line": "Tāpiri rārangi mahanga",
    "Add catch": "Tāpiri mau",
    "Add user": "Tāpiri kaiwhakamahi",
    "Edit trap": "Whakatika mahanga",
    "Edit trap line": "Whakatika rārangi mahanga",
    "Edit catch": "Whakatika mau",
    "Edit user": "Whakatika kaiwhakamahi",
    "Trap added": "Kua tāpirihia te mahanga",
    "Check saved": "Kua tiakina te tirohanga",
    "Saved on this device": "Kua tiakina ki tēnei pūrere",
    "No signal right now. It will upload by itself when you are back online.": "Kāore he tohu ipurangi i tēnei wā. Ka tuku aunoa ina hoki mai te ipurangi.",
    "Find nearest traps": "Kimihia ngā mahanga tata",
    "Search by trap code or line": "Rapu mā te waehere, te rārangi mahanga rānei",
    "No trap matches.": "Kāore he mahanga e ōrite ana.",
    "Choose another trap": "Kōwhiria tētahi atu mahanga",
    "What did you find?": "He aha tāu i kite ai?",
    "What was caught?": "He aha i mau?",
    "Empty": "Kāore he mea",
    "Caught": "Kua mau",
    "Bait needed": "Me tāpiri mounu",
    "Sprung": "Kua puta te mahanga",
    "Save check": "Tiakina te tirohanga",
    "Finding you...": "Kei te kimi i a koe...",
    "Your account cannot see exact trap locations. Search by code or scan the trap's QR code instead.": "Kāore e taea e tō pūkete te kite i ngā wāhi pū o ngā mahanga. Rapua mā te waehere, mā te matawai rānei i te waehere QR.",
    "Location is not available right now. Search by trap code instead.": "Kāore tō wāhi i te wātea i tēnei wā. Rapua mā te waehere mahanga.",
    "Location is blocked. Click the location/padlock icon in the address bar, set Location to Allow, then try again. On Windows also check Settings > Privacy & security > Location. On a phone: Settings > Site settings > Location.": "Kua aukatia te wāhi. Pāwhiria te tohu wāhi/maukati i te pae wāhitau, whakaaetia te wāhi, kātahi ka ngana anō. I Windows, tirohia hoki Ngā tautuhinga > Tūmataitinga me te haumarutanga > Wāhi. I te waea: Ngā tautuhinga > Ngā tautuhinga pae > Wāhi.",
    "Finding your location took too long. Move to open sky and try again, or search by trap code.": "Kua roa rawa te kimi i tō wāhi. Nuku ki tētahi wāhi māhorahora ka ngana anō, rapua rānei mā te waehere mahanga.",
    "Your account cannot see exact trap locations.": "Kāore e taea e tō pūkete te kite i ngā wāhi pū o ngā mahanga.",
    "This device has no GPS.": "Kāore he GPS o tēnei pūrere.",
    "By line": "Ā-rārangi",
    "By month": "Ā-marama",
    "Download CSV": "Tikiake CSV",
    "Catches by": "Ngā mau ā",
    "Name:": "Ingoa:",
    "Email:": "Īmēra:",
    "Role:": "Tūranga:",
    "Exact trap locations:": "Ngā wāhi pū o ngā mahanga:",
    "Yes": "Āe",
    "No": "Kāo",
    "API address:": "Wāhitau API:",
    "Overdue rules:": "Ngā ture mō ngā tirohanga kua hipa te wā:",
    "amber after": "ka kōwhai i muri i te",
    "days, red after": "rā, ka whero i muri i te",
    "days (change them in config.js)": "rā (hurihia ki config.js)",
    "Waiting to upload:": "Kei te tatari kia tuku:",
    "Sync now": "Tukutahi ināianei",
    "Nothing to upload": "Kāore he mea hei tuku",
    "Install app on this device": "Tāutahia te taupānga ki tēnei pūrere",
    "Address the codes open (must work on a phone, e.g. https://traps.example.nz/)": "Wāhitau ka huakina e ngā waehere (me mahi ki te waea, hei tauira https://traps.example.nz/)",
    "Print labels": "Tāngia ngā tapanga",
    "Print many at once on the QR codes page.": "Tāngia te maha i te wā kotahi ki te whārangi waehere QR.",
    "No traps yet.": "Kāore anō he mahanga.",
    "Rat": "Kiore",
    "rat": "kiore",
    "Possum": "Paihamu",
    "possum": "paihamu",
    "Stoat": "Toriura",
    "stoat": "toriura",
    "Mouse": "Kiore ririki",
    "mouse": "kiore ririki",
    "Hedgehog": "Tepara",
    "hedgehog": "tepara",
    "Other": "Ētahi atu",
    "other": "ētahi atu",
    "caught": "kua mau",
    "empty": "kāore he mea",
    "bait_needed": "me tāpiri mounu",
    "sprung": "kua puta te mahanga",
    "volunteer": "tūao",
    "coordinator": "kaiwhakarite",
    "trap id": "tau tautuhi mahanga",
    "trap line id": "tau tautuhi rārangi mahanga",
    "check id": "tau tautuhi tirohanga",
    "last checked at": "wā i tirohia whakamutunga",
    "last status": "tūnga whakamutunga",
    "check state": "tūnga tirohanga",
    "can_view_exact_location": "ka taea te kite i te wāhi pū",
    "Volunteer": "Tūao",
    "Coordinator": "Kaiwhakarite",
    "QR code": "Waehere QR",
    "All": "Katoa",
    "Next": "Whai muri",
    "Previous": "I mua",
    "Search:": "Rapu:",
    "Show": "Whakaatu",
    "entries": "ngā tūemi",
    "Showing _START_ to _END_ of _TOTAL_ entries": "E whakaatu ana i te _START_ ki te _END_ o ngā tūemi _TOTAL_",
    "No matching records found": "Kāore he raraunga e ōrite ana",
    "No data available in table": "Kāore he raraunga i te tēpu",
    "First": "Tuatahi",
    "Last": "Mutunga",
    "Processing...": "Kei te tukatuka...",
    "today": "i tēnei rā",
    "yesterday": "inanahi",
    "Account created! Redirecting to sign in...": "Kua hangaia te pūkete! Kei te hoki ki te takiuru...",
    "Please fill in every field.": "Whakakīia ngā wāhi katoa.",
    "Passwords do not match.": "Kāore ngā kupuhipa i te ōrite.",
    "You are offline": "Kua momotu koe i te ipurangi.",
    "Coordinators only": "Mā ngā kaiwhakarite anake",
    "Your volunteer account cannot open this page.": "Kāore e taea e tō pūkete tūao te huaki i tēnei whārangi.",
    "Back to the dashboard": "Hoki ki te paewhiri",
    "Light / dark": "Mārama / pōuri",
    "Open menu": "Whakatuwheratia te tahua",
    "Toggle light or dark mode": "Whakakāngia te aratau mārama, pōuri rānei",
    "Start": "Tīmata",
    "User": "Kaiwhakamahi",
    "Trap line name": "Ingoa rārangi mahanga",
    "Suggested bait:": "Mounu e taunakitia ana:",
    "No account? Register": "Kāore he pūkete? Rēhita",
    "English": "English",
    "Māori": "Māori",
    "Te reo Māori": "Te reo Māori",
    "Choose language": "Kōwhiria te reo",
    "Display page in English": "Whakaatu i te whārangi ki te reo Pākehā",
    "Display page in Māori": "Whakaatu i te whārangi ki te reo Māori"
  };
  const normalizedTranslations = Object.fromEntries(
    Object.entries(translations).map(([english, maori]) => [english.toLowerCase(), maori])
  );

  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  const translatableAttributes = ["title", "aria-label", "placeholder", "alt", "content", "data-kicker", "data-title", "data-accent", "data-text"];
  let language = localStorage.getItem(LANGUAGE_KEY) === "mi" ? "mi" : "en";

  function translated(value) {
    const trimmed = value.trim();
    if (!trimmed) return value;
    let result = translations[trimmed] || normalizedTranslations[trimmed.toLowerCase()];
    if (!result) {
      let match = trimmed.match(/^Showing (\d+) to (\d+) of (\d+) entries$/);
      if (match) result = `E whakaatu ana i te ${match[1]} ki te ${match[2]} o ngā tūemi ${match[3]}`;
      match = trimmed.match(/^(\d+) checks? waiting to upload$/);
      if (!result && match) result = `${match[1]} ngā tirohanga kei te tatari kia tukuna`;
      match = trimmed.match(/^(\d+) uploaded$/);
      if (!result && match) result = `Kua tukuna te ${match[1]}`;
      match = trimmed.match(/^(Overdue|Due soon|Up to date) · (\d+)d$/);
      if (!result && match) {
        const state = translations[match[1]];
        result = `${state} · ${match[2]} rā`;
      }
      match = trimmed.match(/^Checked in last (\d+) days$/);
      if (!result && match) result = `I tirohia i roto i ngā rā ${match[1]} kua hipa`;
      match = trimmed.match(/^(\d+)-(\d+) days ago$/);
      if (!result && match) result = `i ngā rā ${match[1]} ki te ${match[2]} kua hipa`;
      match = trimmed.match(/^(\d+)\+ days ago$/);
      if (!result && match) result = `neke atu i te ${match[1]} rā ki muri`;
      match = trimmed.match(/^(\d+) days ago$/);
      if (!result && match) result = `${match[1]} rā ki muri`;
      match = trimmed.match(/^amber after (\d+) days, red after (\d+) days \(change them in config\.js\)$/);
      if (!result && match) result = `ka kōwhai i muri i te ${match[1]} rā, ka whero i muri i te ${match[2]} rā (hurihia ki config.js)`;
      match = trimmed.match(/^Showing 10 of (\d+)\. See the Traps page for all\.$/);
      if (!result && match) result = `E whakaatu ana i te 10 o te ${match[1]}. Tirohia te whārangi Ngā mahanga mō te katoa.`;
    }
    if (!result) return value;
    const leading = value.match(/^\s*/)[0];
    const trailing = value.match(/\s*$/)[0];
    return leading + result + trailing;
  }
  window.pfnTranslate = translated;

  function translateNode(node) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    const original = originalText.get(node);
    const value = language === "mi" ? translated(original) : original;
    if (node.nodeValue !== value) node.nodeValue = value;
  }

  function translateAttributes(element) {
    if (!originalAttributes.has(element)) originalAttributes.set(element, {});
    const originals = originalAttributes.get(element);
    translatableAttributes.forEach((name) => {
      if (!element.hasAttribute(name)) return;
      if (!(name in originals)) originals[name] = element.getAttribute(name);
      const original = originals[name];
      const value = language === "mi" ? translated(original) : original;
      if (element.getAttribute(name) !== value) element.setAttribute(name, value);
    });
  }

  function translateTree(root) {
    if (!root || root.closest?.("#language-switch")) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root !== document) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement?.closest("#language-switch,script,style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    let node;
    while ((node = walker.nextNode())) translateNode(node);
    root.querySelectorAll?.("*").forEach(translateAttributes);
  }

  function updateSwitch() {
    const switcher = document.getElementById("language-switch");
    if (!switcher) return;
    switcher.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.language === language;
      button.setAttribute("aria-pressed", String(active));
      button.style.background = active ? "#baff63" : "transparent";
      button.style.color = active ? "#08110f" : "inherit";
      button.style.fontWeight = active ? "700" : "500";
    });
  }

  function setLanguage(next) {
    language = next;
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    translateTree(document);
    updateSwitch();
    document.dispatchEvent(new CustomEvent("pfn-language-change", { detail: { language } }));
  }

  function positionSwitch(switcher) {
    const host = switcher.parentElement;
    if (host.classList.contains("au")) {
      Object.assign(switcher.style, { position: "absolute", top: "20px", right: "72px", zIndex: "10" });
    } else if (host.classList.contains("nav-right") && window.matchMedia("(max-width: 520px)").matches) {
      Object.assign(switcher.style, { position: "fixed", top: "78px", right: "5%", zIndex: "60" });
    } else {
      Object.assign(switcher.style, { position: "", top: "", right: "", zIndex: "" });
    }
  }

  function mountSwitch() {
    if (document.getElementById("language-switch")) return;
    const host = document.querySelector(".nav-right, .top-actions, .au");
    if (!host) return;
    const switcher = document.createElement("div");
    switcher.id = "language-switch";
    switcher.setAttribute("role", "group");
    switcher.setAttribute("aria-label", "Choose language");
    switcher.style.cssText = "display:flex;align-items:center;gap:2px;padding:3px;border:1px solid rgba(161,180,169,.35);border-radius:10px;background:rgba(8,17,15,.92);font:600 12px 'DM Sans',sans-serif;white-space:nowrap";
    [["en", "English"], ["mi", "Māori"]].forEach(([code, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.language = code;
      button.textContent = label;
      button.setAttribute("aria-label", `Display page in ${label}`);
      button.style.cssText = "border:0;border-radius:7px;padding:6px 9px;background:transparent;color:inherit;cursor:pointer";
      button.addEventListener("click", () => setLanguage(code));
      switcher.appendChild(button);
    });
    host.appendChild(switcher);
    positionSwitch(switcher);
    window.addEventListener("resize", () => positionSwitch(switcher));
    updateSwitch();
  }

  document.documentElement.lang = language;
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === "childList") record.addedNodes.forEach((node) => translateTree(node));
      else if (record.type === "characterData") translateNode(record.target);
      else if (record.type === "attributes") translateAttributes(record.target);
    });
    mountSwitch();
  });

  function start() {
    translateTree(document);
    mountSwitch();
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: translatableAttributes });
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
