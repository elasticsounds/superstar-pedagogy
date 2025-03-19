import { initializeAdminPopup } from "./modules/admin_popup.js";
import {
  changeAudioSpeed,
  initializeAudioSpeed,
  playNextAudio,
  playPreviousAudio,
  togglePlayPause,
  toggleReadAloud,
} from "./modules/audio.js";
import { initializeWordByWordHighlighter } from "./modules/tts_highlighter.js";
import { getCookie } from "./modules/cookies.js";
import {
  handleInitializationError,
  showMainContent,
} from "./modules/error_utils.js";
import { loadAtkinsonFont } from "./modules/font_utils.js";
import {
  initializeLanguageDropdown,
  cacheInterfaceElements,
  getCachedInterface,
  getCachedNavigation,
  initializePlayBar,
  initializeSidebar,
  loadEasyReadMode,
  restoreInterfaceElements,
  switchLanguage,
  toggleEasyReadMode,
  toggleSyllablesMode,
  toggleGlossaryMode,
  highlightGlossaryTerms,
  loadGlossaryTerms,
  togglePlayBarSettings,
  toggleSidebar,
  updatePageNumber,
  formatNavigationItems,
  initializeNavigation,
} from "./modules/interface.js";
import {
  handleKeyboardShortcuts,
  handleNavigation,
  nextPage,
  toggleNav,
  previousPage,
} from "./modules/navigation.js";
import { setState, state } from "./modules/state.js";
import { setupTranslations } from "./modules/translations.js";
import {
  initializeAutoplay,
  loadAutoplayState,
  loadDescribeImagesState,
  loadGlossaryState,
  loadToggleButtonState,
  toggleAutoplay,
  toggleDescribeImages,
  toggleEli5Mode,
  handleEli5Popup,
  initializeAudioElements,
  initializeGlossary,
  initializeTabs,
  initializeReferencePage
} from "./modules/ui_utils.js";

// Constants
const PLACEHOLDER_TITLE = "Accessible Digital Textbook";
const basePath = window.location.pathname.substring(
  0,
  window.location.pathname.lastIndexOf("/") + 1
);

// Initialize the application
document.addEventListener("DOMContentLoaded", async function () {
  try {
    await initializeApp();
  } catch (error) {
    console.error("Error initializing application:", error);
    handleInitializationError();
  }
});

// Store the current page state before leaving
window.addEventListener("beforeunload", () => {
  cacheInterfaceElements();
  saveInterfaceState();
});

async function initializeApp() {
  try {
    showLoadingIndicator();

    // Wait for DOM to be ready
    await waitForDOM();

    // Initialize core functionality
    await initializeCoreFunctionality();

    // Setup event listeners after DOM and core functionality are ready
    setupEventListeners();

    // Initialize UI components
    initializeUIComponents();

    // Initialize Word Highlighting
    initializeWordByWordHighlighter();

    // Final initialization steps
    finalizeInitialization();
  } catch (error) {
    console.error("Error in initialization:", error);
    handleInitializationError(error);
  } finally {
    showMainContent();
    hideLoadingIndicator();
  }
}

function waitForDOM() {
  return new Promise((resolve) => {
    if (document.readyState === "complete") {
      resolve();
    } else {
      window.addEventListener("load", resolve);
    }
  });
}

function showLoadingIndicator() {
  const loader = document.createElement("div");
  loader.id = "app-loader";
  loader.className =
    "fixed top-0 left-0 w-full h-full flex items-center justify-center bg-white z-50";
  loader.innerHTML = `
       <div class="text-center">
           <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
           <p class="mt-4 text-gray-600">Loading...</p>
       </div>
   `;
  document.body.appendChild(loader);
}

function hideLoadingIndicator() {
  const loader = document.getElementById("app-loader");
  if (loader) {
    loader.remove();
  }
}

function restoreNavAndSidebar() {
  const navPopup = document.getElementById("navPopup");
  const sidebar = document.getElementById("sidebar");

  if (navPopup) navPopup.classList.remove("hidden");
  if (sidebar) sidebar.classList.remove("hidden");
}

function hideMainContent() {
  // Instead of adding hidden class, use opacity
  const mainContent = document.body;
  if (mainContent) {
    mainContent.classList.add("opacity-0");
    mainContent.classList.add("z-30");
    // Set a maximum time to stay hidden
    setTimeout(() => {
      mainContent.classList.remove("opacity-0");
    }, 3000); // Failsafe timeout
  }
}

function restoreInterfaceState() {
  const savedState = sessionStorage.getItem("interfaceState");
  if (savedState) {
    const state = JSON.parse(savedState);
    applyInterfaceState(state);
  }
}

function applyInterfaceState(state) {
  const sidebar = document.getElementById("sidebar");
  const mainTag = document.querySelector("main");
  const navPopup = document.getElementById("navPopup");

  if (sidebar && state.sidebarOpen) {
    sidebar.classList.remove("translate-x-full");
    if (mainTag) {
      mainTag.classList.add("lg:ml-32");
      mainTag.classList.remove("lg:mx-auto");
    }
  }

  if (navPopup && state.navOpen) {
    navPopup.classList.remove("-translate-x-full");
    navPopup.classList.add("left-2");
  }

  setTimeout(() => {
    window.scrollTo(0, state.scrollPosition);
    const navList = document.querySelector(".nav__list");
    if (navList) {
      navList.scrollTop = state.navScrollPosition;
    }
  }, 100);
}

async function initializeCoreFunctionality() {
  try {
    // First ensure the DOM is fully loaded
    if (document.readyState !== "complete") {
      await new Promise((resolve) => {
        window.addEventListener("load", resolve);
      });
    }

    // Initialize language before other components
    initializeLanguage();
    loadAtkinsonFont();

    // Initialize components after HTML is definitely loaded
    await fetchAndInjectComponents();

    // Try to initialize language dropdown
    const dropdownInitialized = await initializeLanguageDropdown();
    if (!dropdownInitialized) {
      console.warn(
        "Language dropdown initialization failed, continuing with other components"
      );
    }

    formatNavigationItems();
    // Initialize page numbering
    updatePageNumber();
    await setupTranslations();
    
    return true;
  } catch (error) {
    console.error("Error in core initialization:", error);
    return false;
  }
}

async function updateDropdownTranslations() {
  const dropdown = document.getElementById("language-dropdown");
  if (!dropdown || !state.translations) return;

  Array.from(dropdown.options).forEach((option) => {
    const langName = state.translations[`language-name-${option.value}`];
    if (langName) {
      option.textContent = langName;
    }
  });
}

function initializeLanguage() {
  let languageCookie = getCookie("currentLanguage");
  setState(
    "currentLanguage",
    languageCookie ||
      document.getElementsByTagName("html")[0].getAttribute("lang")
  );
}

const handleResponse = async (response) => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
};

async function fetchAndInjectComponents() {
  try {
    const responses = await Promise.all([
      fetch("./assets/interface.html").then(handleResponse),
      fetch("./assets/nav.html").then(handleResponse),
      fetch("./assets/activity.js").then(handleResponse),
      fetch("./assets/config.html").then(handleResponse),
    ]);

    const [interfaceHTML, navHTML, activityJS, configHTML] = await Promise.all(
      responses.map((response) => response.text())
    );

    await injectComponents(interfaceHTML, navHTML, configHTML);
    injectActivityScript(activityJS);
  } catch (error) {
    console.error("Error fetching components:", error);
    throw new Error("Failed to fetch components: " + error.message);
  }
};

async function injectComponents(interfaceHTML, navHTML, configHTML) {
  try {
    const cachedInterface = getCachedInterface();
    const cachedNavigation = getCachedNavigation();

    if (cachedInterface && cachedNavigation) {
      const restored = restoreInterfaceElements();
      if (!restored) {
        throw new Error("Failed to restore cached interface elements");
      }
    } else {
      const interfaceContainer = document.getElementById("interface-container");
      const navContainer = document.getElementById("nav-container");

      if (!interfaceContainer || !navContainer) {
        throw new Error("Required containers not found");
      }

      interfaceContainer.innerHTML = interfaceHTML;
      navContainer.innerHTML = navHTML;
      cacheInterfaceElements();
    }

    setupConfig(configHTML);
  } catch (error) {
    console.error("Error injecting components:", error);
    throw new Error("Failed to inject components: " + error.message);
  }
}

function setupConfig(configHTML) {
  const parser = new DOMParser();
  const configDoc = parser.parseFromString(configHTML, "text/html");
  const newTitle = configDoc.querySelector("title").textContent;
  const newAvailableLanguages = configDoc
    .querySelector('meta[name="available-languages"]')
    .getAttribute("content");

  updateDocumentMeta(newTitle, newAvailableLanguages);
}

function updateDocumentMeta(newTitle, newAvailableLanguages) {
  if (newTitle !== PLACEHOLDER_TITLE) {
    document.title = newTitle;
  }

  const availableLanguages = document.createElement("meta");
  availableLanguages.name = "available-languages";
  availableLanguages.content = newAvailableLanguages;
  document.head.appendChild(availableLanguages);
}

function injectActivityScript(activityJS) {
  const script = document.createElement("script");
  script.type = "module";
  script.text = activityJS;
  document.body.appendChild(script);
}

function setupEventListeners() {
  const elements = {
    openSidebar: document.getElementById("open-sidebar"),
    closeSidebar: document.getElementById("close-sidebar"),
    toggleEli5: document.getElementById("toggle-eli5"),
    toggleSyllables: document.getElementById("toggle-syllables"),
    toggleAutoplay: document.getElementById("toggle-autoplay"),
    toggleDescribeImages: document.getElementById("toggle-describe-images"),
    languageDropdown: document.getElementById("language-dropdown"),
    toggleEasy: document.getElementById("toggle-easy-read-button"),
    backButton: document.getElementById("back-button"),
    forwardButton: document.getElementById("forward-button"),
    navPopup: document.getElementById("nav-popup"),
    navClose: document.getElementById("nav-close"),
    toggleGlossary: document.getElementById("toggle-glossary"),
    purpleLinks: document.querySelectorAll('.fa-link'),
    clearFilter: document.querySelectorAll('#clear-filter'),
  };

  // Check if required elements exist before adding listeners
  if (elements.openSidebar) {
    elements.openSidebar.addEventListener("click", toggleSidebar);
  }
  if (elements.closeSidebar) {
    elements.closeSidebar.addEventListener("click", toggleSidebar);
  }
  if (elements.toggleEli5) {
    elements.toggleEli5.addEventListener("click", toggleEli5Mode);
  }
  if (elements.languageDropdown) {
    elements.languageDropdown.addEventListener("change", switchLanguage);
  }
  if (elements.toggleEasy) {
    elements.toggleEasy.addEventListener("click", toggleEasyReadMode);
  }
  if (elements.toggleSyllables) {
    elements.toggleSyllables.addEventListener("click", toggleSyllablesMode);
  }
  if (elements.toggleGlossary) {
    elements.toggleGlossary.addEventListener("click", toggleGlossaryMode);
  }
  if (elements.toggleAutoplay) {
    elements.toggleAutoplay.addEventListener("click", toggleAutoplay);
  }
  if (elements.toggleDescribeImages) {
    elements.toggleDescribeImages.addEventListener("click", toggleDescribeImages);
  }

  // Navigation listeners
  if (elements.backButton) {
    elements.backButton.addEventListener("click", previousPage);
  }
  if (elements.forwardButton) {
    elements.forwardButton.addEventListener("click", nextPage);
  }
  if (elements.navPopup) {
    elements.navPopup.addEventListener("click", toggleNav);
  }
  if (elements.navClose) {
    elements.navClose.addEventListener("click", toggleNav);
  }

  // Global listeners
  document.addEventListener("click", handleNavigation);
  document.addEventListener("keydown", handleKeyboardShortcuts);
  elements.purpleLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Store the current page URL before navigating
      localStorage.setItem('originatingPage', window.location.href);
      console.log("Storing originating page:", currentUrl);

    });
  });

  initializeAudioElements();
}

function setupAudioListeners() {
  const audioControls = [
    ["play-pause-button", togglePlayPause],
    ["toggle-read-aloud", toggleReadAloud],
    ["audio-previous", playPreviousAudio],
    ["audio-next", playNextAudio],
    ["read-aloud-speed", togglePlayBarSettings],
  ];

  audioControls.forEach(([id, handler]) => {
    document.getElementById(id).addEventListener("click", handler);
  });

  document.querySelectorAll(".read-aloud-change-speed").forEach((button) => {
    button.addEventListener("click", changeAudioSpeed);
  });
}

function initializeUIComponents() {
  try {
      // Initialize basic components
      initializeSidebar();
      initializeTabs();
      initializePlayBar();
      initializeAudioSpeed();
      loadToggleButtonState();
      loadEasyReadMode();
      loadAutoplayState();
      loadDescribeImagesState();
      //loadSyllablesState();
      loadGlossaryState();
      handleEli5Popup();
      initializeGlossary();

      // Set up audio controls explicitly
      setupAudioListeners();

      // Check if TTS was enabled
      const readAloudMode = getCookie("readAloudMode") === "true";
      if (readAloudMode) {
          const playBar = document.getElementById("play-bar");
          if (playBar) {
              playBar.classList.remove("hidden");
          }
      }
  } catch (error) {
      console.error('Error initializing UI components:', error);
  }
}

const finalizeInitialization = () => {
  const navPopup = document.getElementById("navPopup");

  setTimeout(() => {
    // Show navigation and sidebar
    navPopup?.classList.remove("hidden");
    document.getElementById("sidebar")?.classList.remove("hidden");

    // Initialize autoplay if needed
    if (state.readAloudMode && state.autoplayMode) {
      initializeAutoplay();
    }
    initializeNavigation();

    // Initialize reference page functionality
    initializeReferencePage();

    // If glossaryMode is enabled, load and highlight glossary terms automatically
    if (state.glossaryMode) {
      loadGlossaryTerms().then(() => {
        highlightGlossaryTerms();
      });
    };

    // Initialize math rendering
    if (window.MathJax) {
      window.MathJax.typeset();
    }
  }, 100);
};

// Export necessary functions
export {
  changeAudioSpeed,
  handleKeyboardShortcuts,
  initializeAutoplay,
  loadAutoplayState,
  loadDescribeImagesState,
  playNextAudio,
  playPreviousAudio,
  toggleEli5Mode,
  togglePlayPause,
  toggleReadAloud,
};
