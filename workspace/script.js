/* 
  =========================================
  NAUTICAL VOYAGE - SCRIPT.JS
  =========================================
*/

// --- COMPREHENSIVE SHIP DATA REGISTRY ---
const SHIP_DATA = {
  trireme: {
    name: "Ancient Trireme",
    era: "Ancient World",
    length: "37 meters",
    lengthVal: 37, // out of max 460m
    speed: "9 knots (Rowed)",
    speedVal: 27, // out of max 35 knots
    capacity: "40 tons",
    capacityVal: 8, // out of max 100
    crew: "200 rowers & soldiers",
    desc: "An ancient maritime vessel powered by three tiers of oars on each side, designed specifically for high-speed ramming and boarding operations in the Mediterranean."
  },
  galleon: {
    name: "Spanish Galleon",
    era: "Age of Sail",
    length: "45 meters",
    lengthVal: 45,
    speed: "8 knots (Sailing)",
    speedVal: 24,
    capacity: "500 tons",
    capacityVal: 20,
    crew: "120 sailors & marines",
    desc: "The multi-decked sailing ship used by European states as armed cargo carriers and warships from the 16th to 18th centuries, infamous for carrying precious silver fleets."
  },
  victory: {
    name: "HMS Victory",
    era: "Age of Sail",
    length: "69 meters",
    lengthVal: 69,
    speed: "11 knots (Sailing)",
    speedVal: 31,
    capacity: "3,500 tons",
    capacityVal: 35,
    crew: "850 personnel",
    desc: "Lord Nelson's legendary triple-decker flagship at the Battle of Trafalgar. She is the oldest naval vessel still in commission, armed with 104 heavy cast-iron cannons."
  },
  titanic: {
    name: "RMS Titanic",
    era: "Steam & Ocean Liners",
    length: "269 meters",
    lengthVal: 269,
    speed: "23 knots (Steam)",
    speedVal: 65,
    capacity: "46,300 gross tons",
    capacityVal: 65,
    crew: "892 officers & crew",
    desc: "The world's most famous passenger liner. Her tragic collision with an iceberg on her maiden voyage in 1912 revolutionized maritime safety regulations globally."
  },
  enterprise: {
    name: "USS Enterprise (CVN-65)",
    era: "Modern Giants",
    length: "342 meters",
    lengthVal: 342,
    speed: "33+ knots (Nuclear)",
    speedVal: 95,
    capacity: "93,200 tons (Displacement)",
    capacityVal: 80,
    crew: "4,600 crew & air wing",
    desc: "The first nuclear-powered aircraft carrier in history. Dubbed 'The Big E', she served for over 50 years as a mobile airfield capable of running for years without refueling."
  },
  seawise: {
    name: "Seawise Giant",
    era: "Modern Giants",
    length: "458 meters",
    lengthVal: 458, // 100% max length
    speed: "16 knots (Diesel)",
    speedVal: 45,
    capacity: "564,700 tons (Deadweight)",
    capacityVal: 100, // 100% max capacity
    crew: "40 crew members",
    desc: "The longest self-propelled ship ever constructed. This massive supertanker was so gargantuan that she had a turning radius of over 2 miles and required 5 miles of stopping distance."
  }
};

// --- ANATOMY HOTSPOT DEFINITIONS ---
const ANATOMY_DATA = {
  bow: {
    title: "The Bow",
    latin: "Prora",
    desc: "The forwardmost part of a ship's hull. It is shaped to reduce the drag of the water against the ship. In ancient times, it was often reinforced with steel or bronze to act as a formidable ramming weapon, and decorated with elaborate wooden figureheads representing deities or beasts."
  },
  stern: {
    title: "The Stern",
    latin: "Puppis",
    desc: "The back or aftmost part of a ship. Historically, the captain's quarters were situated in high cabins above the stern, allowing them to oversee the entire ship. The rudder and steering mechanism are always connected below or near the stern."
  },
  hull: {
    title: "The Hull",
    latin: "Alveus",
    desc: "The watertight body of the ship. It can be open or covered by a deck. The hull must be designed with buoyancy to displace enough water weight to float, balancing payload, armor, and power system weights."
  },
  mast: {
    title: "The Mast",
    latin: "Malus",
    desc: "A tall vertical spar designed to carry sails, rigging, and flags. On modern ships, masts carry navigation lights, radar arrays, telecommunications equipment, and lookout sensors rather than canvas sail arrangements."
  },
  rudder: {
    title: "The Rudder",
    latin: "Gubernaculum",
    desc: "A flat vertical plate pivoted near the stern of a ship. It is used to steer the vessel by redirecting water flow. On ancient ships, steering oars on the side (starboard side) were used before centerboard rudders were engineered."
  },
  keel: {
    title: "The Keel",
    latin: "Carina",
    desc: "The structural spine of the ship, running down the very center of the vessel's bottom. It provides critical longitudinal strength and acts as a hydrofoil to prevent the wind from blowing the ship sideways. Building a ship always starts with 'laying the keel'."
  }
};

// --- CAPTAIN'S TRIVIA QUIZ DATA ---
const QUIZ_QUESTIONS = [
  {
    q: "Which of these parts represents the structural central 'spine' at the bottom of a ship's hull?",
    options: ["The Stern", "The Keel", "The Mast", "The Bow"],
    correct: 1,
    tip: "It is the first structural part laid down during ship construction."
  },
  {
    q: "What is the historical meaning of the nautical direction term 'Starboard'?",
    options: ["Left side, toward the harbor", "Right side, where the steering oar was located", "Front of the ship, looking at the stars", "Underneath the cargo hold"],
    correct: 1,
    tip: "Before center rudders, ancient sailors steered with an oar on the right side (steerboard)."
  },
  {
    q: "Which ship holds the record as the longest self-propelled vessel ever constructed?",
    options: ["RMS Titanic", "USS Enterprise", "Seawise Giant", "HMS Victory"],
    correct: 2,
    tip: "It was a massive ULCC supertanker measuring 458 meters in length."
  },
  {
    q: "Why was the Greek Trireme's hull bow specifically engineered with bronze cladding?",
    options: ["To prevent barnacle growth", "To ram and puncture enemy hulls", "To stabilize sailing in rough storms", "To store precious cargo and bullion"],
    correct: 1,
    tip: "Ancient Mediterranean naval warfare relied on high-speed ramming tactics."
  },
  {
    q: "What scientific principle explains why an extremely heavy steel ship floats on water?",
    options: ["Bernoulli's Principle", "Archimedes' Principle of Buoyancy", "Newton's Third Law", "Centrifugal Dispersion"],
    correct: 0, // Wait, Archimedes' Principle of Buoyancy is option index 1 (0-indexed: Bernoulli is 0, Archimedes is 1). Let me make sure. Yes: Bernoulli's is 0, Archimedes' is 1!
    // Let me set correct: 1
    correct: 1,
    tip: "An object floats when it displaces an amount of water equal to its own total weight."
  }
];

// --- APP STATE ---
let currentQuestionIndex = 0;
let userScore = 0;
let quizAnswered = false;

// --- INITIALIZE ALL COMPONENTS ON DOM LOAD ---
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initFleetFilter();
  initAnatomyHotspots();
  initSpecsComparator();
  initQuiz();
  initContactForm();
});

// 1. NAVIGATION FUNCTIONALITY
function initNavbar() {
  const navbar = document.querySelector(".navbar");
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");

  // Sticky Navbar background on scroll
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  // Mobile Menu slide toggle
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
      
      // Animate hamburger lines
      const spans = menuToggle.querySelectorAll("span");
      if (navLinks.classList.contains("open")) {
        spans[0].style.transform = "rotate(45deg) translate(6px, 6px)";
        spans[1].style.opacity = "0";
        spans[2].style.transform = "rotate(-45deg) translate(6px, -6px)";
      } else {
        spans[0].style.transform = "none";
        spans[1].style.opacity = "1";
        spans[2].style.transform = "none";
      }
    });

    // Close menu on link click
    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        menuToggle.querySelectorAll("span").forEach(s => s.style.transform = "none");
        menuToggle.querySelectorAll("span")[1].style.opacity = "1";
      });
    });
  }
}

// 2. FLEET FILTER GRID
function initFleetFilter() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  const fleetCards = document.querySelectorAll(".fleet-card");

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      // Toggle active button
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const eraFilter = btn.getAttribute("data-filter");

      fleetCards.forEach(card => {
        const cardEra = card.getAttribute("data-era");
        if (eraFilter === "all" || cardEra === eraFilter) {
          card.classList.remove("hidden");
          // Fade-in effect
          card.style.opacity = 0;
          setTimeout(() => {
            card.style.transition = "opacity 0.4s ease";
            card.style.opacity = 1;
          }, 50);
        } else {
          card.classList.add("hidden");
        }
      });
    });
  });
}

// 3. ANATOMY INTERACTIVE HOTSPOTS
function initAnatomyHotspots() {
  const hotspots = document.querySelectorAll(".hotspot");
  const defaultMsg = document.getElementById("anatomyDefaultMsg");
  const detailView = document.getElementById("anatomyDetailView");
  const partTitle = document.getElementById("anatomyPartTitle");
  const partLatin = document.getElementById("anatomyPartLatin");
  const partDesc = document.getElementById("anatomyPartDesc");

  hotspots.forEach(spot => {
    const handleActive = () => {
      const partKey = spot.getAttribute("data-part");
      const partData = ANATOMY_DATA[partKey];

      if (partData) {
        // Hide default welcome panel
        if (defaultMsg) defaultMsg.style.display = "none";
        if (detailView) detailView.style.display = "block";

        // Fill detail text
        if (partTitle) partTitle.textContent = partData.title;
        if (partLatin) partLatin.textContent = `Classical Latin Term: ${partData.latin}`;
        if (partDesc) partDesc.textContent = partData.desc;

        // Highlight hotspot active state visually
        hotspots.forEach(h => h.querySelector(".hotspot-dot").style.background = "#d4af37");
        spot.querySelector(".hotspot-dot").style.background = "#fff";
      }
    };

    spot.addEventListener("click", handleActive);
    spot.addEventListener("mouseenter", handleActive);
  });
}

// 4. SHIP SPECS COMPARATOR
function initSpecsComparator() {
  const leftSelect = document.getElementById("shipLeftSelect");
  const rightSelect = document.getElementById("shipRightSelect");

  if (!leftSelect || !rightSelect) return;

  const updateComparison = () => {
    const leftKey = leftSelect.value;
    const rightKey = rightSelect.value;

    const leftData = SHIP_DATA[leftKey];
    const rightData = SHIP_DATA[rightKey];

    if (leftData && rightData) {
      // Left Ship Elements
      document.getElementById("shipLeftName").textContent = leftData.name;
      document.getElementById("shipLeftEra").textContent = leftData.era;
      document.getElementById("shipLeftDesc").textContent = leftData.desc;
      
      document.getElementById("specLeftLengthText").textContent = leftData.length;
      document.getElementById("fillLeftLength").style.width = `${leftData.lengthVal}%`;
      
      document.getElementById("specLeftSpeedText").textContent = leftData.speed;
      document.getElementById("fillLeftSpeed").style.width = `${leftData.speedVal}%`;
      
      document.getElementById("specLeftCapText").textContent = leftData.capacity;
      document.getElementById("fillLeftCap").style.width = `${leftData.capacityVal}%`;

      // Right Ship Elements
      document.getElementById("shipRightName").textContent = rightData.name;
      document.getElementById("shipRightEra").textContent = rightData.era;
      document.getElementById("shipRightDesc").textContent = rightData.desc;
      
      document.getElementById("specRightLengthText").textContent = rightData.length;
      document.getElementById("fillRightLength").style.width = `${rightData.lengthVal}%`;
      
      document.getElementById("specRightSpeedText").textContent = rightData.speed;
      document.getElementById("fillRightSpeed").style.width = `${rightData.speedVal}%`;
      
      document.getElementById("specRightCapText").textContent = rightData.capacity;
      document.getElementById("fillRightCap").style.width = `${rightData.capacityVal}%`;
    }
  };

  // Add listeners to updates
  leftSelect.addEventListener("change", updateComparison);
  rightSelect.addEventListener("change", updateComparison);

  // Trigger initial visual load
  updateComparison();
}

// 5. CAPTAIN'S TRIVIA QUIZ
function initQuiz() {
  const questionNumText = document.getElementById("questionNum");
  const totalQuestionsText = document.getElementById("totalQuestions");
  const quizProgressBar = document.getElementById("quizProgressBar");
  const questionTitle = document.getElementById("quizQuestion");
  const optionsContainer = document.getElementById("quizAnswers");
  const nextBtn = document.getElementById("quizNextBtn");
  const quizBox = document.getElementById("quizBox");
  const resultsBox = document.getElementById("quizResultsBox");

  if (!questionTitle || !optionsContainer || !nextBtn) return;

  // Set total text length
  totalQuestionsText.textContent = QUIZ_QUESTIONS.length;

  const loadQuestion = () => {
    quizAnswered = false;
    nextBtn.style.display = "none";
    optionsContainer.innerHTML = "";

    const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex];
    questionNumText.textContent = currentQuestionIndex + 1;
    questionTitle.textContent = currentQuestion.q;

    // Calculate progression bar percentage
    const progPercent = ((currentQuestionIndex + 1) / QUIZ_QUESTIONS.length) * 100;
    quizProgressBar.style.width = `${progPercent}%`;

    // Render answers
    currentQuestion.options.forEach((opt, idx) => {
      const button = document.createElement("button");
      button.className = "quiz-option";
      button.textContent = opt;
      button.addEventListener("click", () => selectOption(button, idx));
      optionsContainer.appendChild(button);
    });
  };

  const selectOption = (selectedBtn, selectedIdx) => {
    if (quizAnswered) return;
    quizAnswered = true;

    const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex];
    const options = optionsContainer.querySelectorAll(".quiz-option");

    if (selectedIdx === currentQuestion.correct) {
      selectedBtn.classList.add("correct");
      userScore++;
    } else {
      selectedBtn.classList.add("incorrect");
      // Highlight correct one as well
      options[currentQuestion.correct].classList.add("correct");
    }

    // Disable all options
    options.forEach(opt => opt.style.pointerEvents = "none");
    nextBtn.style.display = "block";
    
    // Change button text on last question
    if (currentQuestionIndex === QUIZ_QUESTIONS.length - 1) {
      nextBtn.textContent = "See Final Rank";
    } else {
      nextBtn.textContent = "Next Voyage";
    }
  };

  const showResults = () => {
    quizBox.style.display = "none";
    resultsBox.style.display = "block";

    const scorePct = (userScore / QUIZ_QUESTIONS.length) * 100;
    document.getElementById("quizFinalScore").textContent = `${userScore} / ${QUIZ_QUESTIONS.length}`;

    let rank = "";
    let message = "";

    if (scorePct === 100) {
      rank = "Grand Fleet Admiral";
      message = "Absolutely legendary! You possess master-level command over ship histories, hydrodynamic physics, and classical naval structures.";
    } else if (scorePct >= 80) {
      rank = "Vessel Commander";
      message = "First class! Your navigational senses are highly developed. You are ready to pilot any sailing or modern behemoth across deep blue waters.";
    } else if (scorePct >= 60) {
      rank = "Able-Bodied Seaman";
      message = "Steady sailing. You know your way around the deck and hull, but study up on historical structures to secure your promotion.";
    } else {
      rank = "Fresh Landlubber";
      message = "The sea is vast and treacherous for the uninitiated! Check our interactive anatomy blueprints above, study the vessel stats, and try sailing again.";
    }

    document.getElementById("quizRank").textContent = rank;
    document.getElementById("quizMsg").textContent = message;
  };

  nextBtn.addEventListener("click", () => {
    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      currentQuestionIndex++;
      loadQuestion();
    } else {
      showResults();
    }
  });

  // Restart quiz action
  document.getElementById("quizRetryBtn").addEventListener("click", () => {
    currentQuestionIndex = 0;
    userScore = 0;
    quizAnswered = false;
    resultsBox.style.display = "none";
    quizBox.style.display = "block";
    nextBtn.textContent = "Next Voyage";
    loadQuestion();
  });

  // Load first question on load
  loadQuestion();
}

// 6. CONTACT FORM / CHARTER VOYAGE
function initContactForm() {
  const form = document.getElementById("charterForm");
  const successBox = document.getElementById("charterSuccess");

  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Disable button to prevent double action
    const submitBtn = form.querySelector("button[type='submit']");
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = "Logging Logbook...";
    submitBtn.disabled = true;

    // Simulate submission delay
    setTimeout(() => {
      form.reset();
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      
      if (successBox) {
        successBox.style.display = "block";
        // Hide after 5 seconds
        setTimeout(() => {
          successBox.style.display = "none";
        }, 6000);
      }
    }, 1200);
  });
}
