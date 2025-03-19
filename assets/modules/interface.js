import { playPreviousAudio, playNextAudio, togglePlayPause, stopAudio } from './audio.js';
import { getCookie, setCookie } from "./cookies.js";
import { showErrorToast } from "./error_utils.js";
import { setState, state } from "./state.js";
import { fetchTranslations, translateText } from "./translations.js";
import { toggleButtonState } from "./utils.js";
import { setNavState } from "./navigation.js";
import { populateGlossaryTerms } from './ui_utils.js';

let glossaryTerms = {};
let interfaceCache = {
  interface: null,
  navigation: null,
  sidebarState: null,
};

export const getCachedInterface = () => interfaceCache.interface;
export const getCachedNavigation = () => interfaceCache.navigation;

export const initializeSidebar = () => {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  // Load saved sidebar state
  const savedState = getCookie("sidebarState");
  const isOpen = savedState === "open";

  // Apply initial state
  if (isOpen) {
    sidebar.classList.remove("translate-x-full");
    sidebar.setAttribute("aria-expanded", "true");
    sidebar.removeAttribute("inert");
    document.querySelector("body > .container")?.classList.add("lg:ml-32");
    document.querySelector("body > .container")?.classList.remove("lg:mx-auto");
  } else {
    sidebar.setAttribute("aria-expanded", "false");
    sidebar.setAttribute("inert", "");
  }

  // Save current state
  interfaceCache.sidebarState = isOpen;

  // Ensure proper styling
  sidebar.classList.add(
    "fixed",
    "right-0",
    "top-0",
    "w-80",
    "bg-white",
    "shadow-lg",
    "z-70",
    "transform",
    "transition-transform",
    "duration-300",
    "ease-in-out",
    "overflow-y-auto"
  );

  //initializeLanguageDropdown();
  initializeToggleStates();
  attachSidebarListeners();
};

export const initializeNavigation = () => {
  const navPopup = document.getElementById("navPopup");
  if (!navPopup) return;

  // Load saved sidebar state
  const savedState = getCookie("navState");
  const isOpen = savedState === "open";

  // Apply initial state
  if (isOpen) {
    navPopup.setAttribute("aria-expanded", "true");
    navPopup.removeAttribute("inert");
  } else {
    navPopup.setAttribute("aria-expanded", "false");
    navPopup.setAttribute("inert", "");
  }

  // Save current state
  interfaceCache.navigation = isOpen;

  // Ensure proper styling
  setNavState(isOpen);
};

const attachSidebarListeners = () => {
  // Save sidebar state before page unload
  window.addEventListener("beforeunload", () => {
    const sidebarState = interfaceCache.sidebarState ? "open" : "closed";
    setCookie("sidebarState", sidebarState, 7);
  });
};

export const initializeLanguageDropdown = async () => {
  try {
    // Maximum retry attempts
    const MAX_RETRIES = 3;
    let retryCount = 0;

    const tryInitialize = async () => {
      const dropdown = document.getElementById("language-dropdown");
      if (!dropdown) {
        if (retryCount >= MAX_RETRIES) {
          throw new Error("Language dropdown not found after maximum retries");
        }
        retryCount++;
        console.log(`Language dropdown not found, attempt ${retryCount} of ${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, 200));
        return tryInitialize();
      }

      // Once found, clear existing options
      dropdown.innerHTML = '';

      // Get languages from meta tag
      const metaTag = document.querySelector('meta[name="available-languages"]');
      const languages = metaTag ? metaTag.getAttribute("content")?.split(",") : ["es", "en"];

      // Add options for each language
      languages.forEach(lang => {
        const option = document.createElement("option");
        option.value = lang;
        option.textContent = lang.toUpperCase();
        dropdown.appendChild(option);
      });

      // Set current language
      const currentLang = state.currentLanguage ||
        getCookie("currentLanguage") ||
        document.documentElement.lang ||
        "es";

      dropdown.value = currentLang;
      setState("currentLanguage", currentLang);

      // Ensure visibility of dropdown and container
      dropdown.classList.remove('hidden');
      const container = dropdown.closest('.flex.items-center');
      if (container) {
        container.classList.remove('hidden');
        container.style.display = 'flex';
        // Add necessary Tailwind classes
        container.classList.add(
          'flex',
          'items-center',
          'space-x-4',
          'ml-auto',
          'mr-4'
        );
      }

      // Style the dropdown
      dropdown.classList.add(
        'ml-4',
        'p-2',
        'border',
        'border-gray-300',
        'rounded-md',
        'bg-white',
        'text-gray-700'
      );

      return true;
    };

    return await tryInitialize();

  } catch (error) {
    console.error("Error initializing language dropdown:", error);
    return false; // Return false instead of throwing to prevent cascading failures
  }
};

const populateDropdown = (dropdown, languages) => {
  languages.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang;
    option.textContent = lang; // We'll update this with translations later
    dropdown.appendChild(option);
  });
};

export const updatePageNumber = () => {
  const pageSectionMetaTag = document.querySelector('meta[name="page-section-id"]');
  const pageElement = document.getElementById('page-section-id');

  if (!pageElement) return;

  // Default to page 0 if no meta tag is found
  if (!pageSectionMetaTag) {
    pageElement.innerHTML = '<span data-id="page"></span> 0';
    return;
  }

  const pageSectionContent = pageSectionMetaTag.getAttribute('content');
  if (!pageSectionContent) {
    pageElement.innerHTML = '<span data-id="page"></span> 0';
    return;
  }

  const parts = pageSectionContent.split('_').map(Number);
  let humanReadablePage;

  // Handle special case of page 0
  if (parts[0] === 0 && (!parts[1] || parts[1] === 0)) {
    humanReadablePage = '<span data-id="page"></span> 0';
  } 
  // For pages with sections
  else if (parts.length === 2 && parts[1] !== undefined) {
    // If this is the first section (section 0), just show the page number
    if (parts[1] === 0) {
      humanReadablePage = `<span data-id="page"></span> ${parts[0] - 1}`;
    }
    // For subsequent sections, show page.section format
    else {
      humanReadablePage = `<span data-id="page"></span> ${parts[0] - 1}.${parts[1]}`;
    }
  } 
  // For pages with no section information
  else {
    humanReadablePage = `<span data-id="page"></span> ${parts[0] - 1}`;
  }

  pageElement.innerHTML = humanReadablePage;
};

export const toggleSidebar = () => {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.querySelector("body > .container");
  const openSidebarBtn = document.getElementById("open-sidebar");

  if (!sidebar || !mainContent || !openSidebarBtn) return;

  const isOpen = !sidebar.classList.contains("translate-x-full");

  // Toggle sidebar
  sidebar.classList.toggle("translate-x-full");
  mainContent.classList.toggle("lg:ml-32", !isOpen);
  mainContent.classList.toggle("lg:mx-auto", isOpen);

  // Update state
  interfaceCache.sidebarState = !isOpen;

  // Update accessibility
  sidebar.setAttribute("aria-expanded", (!isOpen).toString());
  if (isOpen) {
    sidebar.setAttribute("inert", "");
  } else {
    sidebar.removeAttribute("inert");
  }

  // Save state
  setCookie("sidebarState", !isOpen ? "open" : "closed", 7);
};

export const cacheInterfaceElements = () => {
  try {
    const sidebar = document.getElementById("sidebar");
    const navPopup = document.getElementById("navPopup");

    if (sidebar) {
      interfaceCache.interface = sidebar.outerHTML;
    }
    if (navPopup) {
      interfaceCache.navigation = navPopup.outerHTML;
    }
  } catch (error) {
    console.error("Error caching interface elements:", error);
  }
};

export const restoreInterfaceElements = () => {
  try {
    if (interfaceCache.interface) {
      const interfaceContainer = document.getElementById("interface-container");
      if (interfaceContainer) {
        interfaceContainer.innerHTML = interfaceCache.interface;
      }
    }
    if (interfaceCache.navigation) {
      const navContainer = document.getElementById("nav-container");
      if (navContainer) {
        navContainer.innerHTML = interfaceCache.navigation;
      }
    }
    return true;
  } catch (error) {
    console.error("Error restoring interface elements:", error);
    return false;
  }
};

const handleSidebarAccessibility = (openSidebar, languageDropdown) => {
  const elements = ["close-sidebar", "language-dropdown", "sidebar"];

  elements.forEach((id) => {
    const element = document.getElementById(id);
    if (state.sideBarActive) {
      element.setAttribute("aria-hidden", "false");
      element.removeAttribute("tabindex");
      openSidebar.setAttribute("aria-expanded", "true");

      setTimeout(() => {
        languageDropdown.focus();
      }, 500);
    } else {
      element.setAttribute("aria-hidden", "true");
      element.setAttribute("tabindex", "-1");
      openSidebar.setAttribute("aria-expanded", "false");
    }
  });
};

export const switchLanguage = async () => {
  try {
    const dropdown = document.getElementById("language-dropdown");
    if (!dropdown) return;

    // Disable dropdown during switch
    dropdown.disabled = true;

    // Stop any audio playing
    stopAudio();

    // Update language state
    setState("currentLanguage", dropdown.value);

    // Save to cookie
    const basePath = window.location.pathname.substring(
      0,
      window.location.pathname.lastIndexOf("/") + 1
    );
    setCookie("currentLanguage", state.currentLanguage, 7, basePath);

    // Update HTML lang attribute
    document.documentElement.lang = state.currentLanguage;

    // Fetch and apply new translations
    await fetchTranslations();

    populateGlossaryTerms();

    // If glossary mode is on, update the highlights
    if (state.glossaryMode) {
      highlightGlossaryTerms();
    }

    // Re-enable dropdown
    dropdown.disabled = false;

  } catch (error) {
    console.error("Error switching language:", error);
    showErrorToast("Error changing language");
  }
};

export const toggleEasyReadMode = async () => {
  setState("easyReadMode", !state.easyReadMode);
  setCookie("easyReadMode", state.easyReadMode, 7);
  toggleButtonState("toggle-easy-read-button", state.easyReadMode);

  stopAudio();
  setState(
    "currentLanguage",
    document.getElementById("language-dropdown").value
  );
  await fetchTranslations();
};

export const toggleSyllablesMode = () => {
  setState("syllablesMode", !state.syllablesMode);
  setCookie("syllablesMode", state.syllablesMode, 7);
  toggleButtonState("toggle-syllables", state.syllablesMode);
};

// Load glossary terms based on current language
export const loadGlossaryTerms = async () => {
  try {
    const response = await fetch(`assets/glossary_${state.currentLanguage}.json`);
    const data = await response.json();
    glossaryTerms = data;
    state.glossaryTerms = data;
  } catch (error) {
    console.error('Error loading glossary:', error);
  }
}

export const toggleGlossaryMode = () => {
  setState("glossaryMode", !state.glossaryMode);
  setCookie("glossaryMode", state.glossaryMode, 7);
  toggleButtonState("toggle-glossary", state.glossaryMode);

  //const glossaryButton = document.getElementById("toggle-glossary");
  //const currentState = glossaryButton.getAttribute('aria-checked') === 'true';
  //const newState = !currentState;
  //glossaryMode = newState;

  // Update button state and visuals
  //glossaryButton.setAttribute('aria-checked', newState);

  // Update visual state
  //const toggleDot = glossaryButton.querySelector('.dot');
  //const toggleBackground = glossaryButton.querySelector('[class*="bg-"]');

  if (state.glossaryMode) {
    loadGlossaryTerms().then(() => {
      highlightGlossaryTerms();
    })
  } else {
    removeGlossaryHighlights();
  }

  // if (toggleDot && toggleBackground) {
  //   if (newState) {
  //     toggleDot.classList.add('translate-x-5');
  //     toggleBackground.classList.remove('bg-gray-400');
  //     toggleBackground.classList.add('bg-blue-700');

  //     // Load and apply glossary when turned on
  //     // loadGlossaryTerms().then(() => {
  //     //   highlightGlossaryTerms();
  //     // });
  //   } else {
  //     toggleDot.classList.remove('translate-x-5');
  //     toggleBackground.classList.remove('bg-blue-700');
  //     toggleBackground.classList.add('bg-gray-400');

  //     // Remove highlights when turned off
  //     removeGlossaryHighlights();
  //   }
  // }

  // Save state to cookie
  //setCookie("glossaryMode", glossaryMode, 7);
};

export const highlightGlossaryTerms = () => {
  if (!state.glossaryMode || !glossaryTerms) return;

  console.log("Starting glossary highlighting");
  // Remove any existing highlights first
  removeGlossaryHighlights();

  // Extract terms from the current page
  const pageTerms = extractPageTerms();

  // Escape special characters for regex
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Build term objects with normalized base forms
  const termObjects = [];
  Object.entries(glossaryTerms || {}).forEach(([key, value]) => {
    // Add main term
    termObjects.push({
      text: key,
      pattern: escapeRegExp(key),
      baseForm: key.toLowerCase().replace(/[es]$|[s]$/, ''), // Basic singular form
      definition: value.definition,
      emoji: value.emoji || ''
    });

    // Add variations
    if (value.variations) {
      value.variations.forEach(term => {
        termObjects.push({
          text: term,
          pattern: escapeRegExp(term),
          baseForm: term.toLowerCase().replace(/[es]$|[s]$/, ''), // Basic singular form
          definition: value.definition,
          emoji: value.emoji || ''
        });
      });
    }
  });

  // Sort longer terms first to handle overlapping terms properly
  termObjects.sort((a, b) => b.text.length - a.text.length);

  if (termObjects.length === 0) return;

  // Track which base forms have been highlighted
  const highlightedBaseForms = new Set();

  // Get content area
  const contentArea = document.getElementById('content');
  if (!contentArea) return;

  // First check headers for terms we should highlight elsewhere
  const termsInHeaders = new Set();
  contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(header => {
    const headerText = header.textContent.toLowerCase();

    // Check each term
    for (const term of termObjects) {
      const regex = new RegExp(`\\b${term.pattern}\\b`, 'i');
      if (regex.test(headerText)) {
        termsInHeaders.add(term.baseForm);
      }
    }
  });

  // Process text nodes using a safer approach - direct DOM manipulation
  const walker = document.createTreeWalker(
    contentArea,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip nodes in headers, scripts, styles, or already processed nodes
        if (
          node.parentNode.nodeName.match(/^H[1-6]$/i) ||
          node.parentNode.nodeName === 'SCRIPT' ||
          node.parentNode.nodeName === 'STYLE' ||
          node.parentNode.classList?.contains('glossary-term') ||
          node.parentNode.closest('.glossary-popup, .glossary-term')
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  // We'll process nodes one by one - can't modify during traversal
  const nodesToProcess = [];
  let currentNode;
  while (currentNode = walker.nextNode()) {
    // Only process non-empty text nodes
    if (currentNode.textContent.trim()) {
      nodesToProcess.push(currentNode);
    }
  }

  // Process each node
  nodesToProcess.forEach(textNode => {
    const originalText = textNode.textContent;
    if (!originalText.trim()) return;

    // Create segments array to hold parts of the text and their status (highlighted or not)
    const segments = [{ text: originalText, highlighted: false }];

    // Process each term
    for (const term of termObjects) {
      // Skip if this base form is already highlighted (unless it was in a header)
      if (highlightedBaseForms.has(term.baseForm) && !termsInHeaders.has(term.baseForm)) {
        continue;
      }

      // Loop through segments looking for matches
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        // Skip already highlighted segments
        if (segment.highlighted) continue;

        // Look for the term in this segment
        const regex = new RegExp(`\\b(${term.pattern})([,;:.!?)]|\\s|$)`, 'i');
        const match = segment.text.match(regex);

        if (match) {
          // Found a match - split this segment into three parts
          const beforeText = segment.text.substring(0, match.index);
          const termText = match[1]; // The matched term
          const punctuation = match[2]; // Any punctuation that followed
          const afterText = segment.text.substring(match.index + match[1].length + match[2].length);

          // Replace the segment with three new segments
          segments.splice(
            i, 1,
            { text: beforeText, highlighted: false },
            { text: termText, highlighted: true, term: term },
            { text: punctuation, highlighted: false },
            { text: afterText, highlighted: false }
          );

          // Mark this term as highlighted
          highlightedBaseForms.add(term.baseForm);
          termsInHeaders.delete(term.baseForm);

          // Only process the first match of each term
          break;
        }
      }
    }

    // Check if any segments were highlighted
    if (segments.some(s => s.highlighted)) {
      // Filter out empty segments
      const nonEmptySegments = segments.filter(s => s.text);

      // Create document fragment to hold the new content
      const fragment = document.createDocumentFragment();

      // Process each segment
      nonEmptySegments.forEach(segment => {
        if (segment.highlighted) {
          // Create a highlighted span
          const span = document.createElement('span');
          span.className = 'glossary-term bg-emerald-100 bg-opacity-80 text-emerald-800 rounded cursor-pointer';
          span.setAttribute('role', 'button');
          span.setAttribute('tabindex', '0');
          span.textContent = segment.text;

          // Add click event
          span.addEventListener('click', showGlossaryDefinition);
          span.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              showGlossaryDefinition.call(span, e);
            }
          });

          fragment.appendChild(span);
        } else {
          // Create a text node
          fragment.appendChild(document.createTextNode(segment.text));
        }
      });

      // Replace the original text node with our fragment
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  });
};

export const showGlossaryDefinition = async (event) => {
  
  // Hide any existing popups
  const existingPopup = document.querySelector('.glossary-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // Get the term text and normalize it by removing punctuation
  const termWithPunctuation = event.target.textContent;
  const term = termWithPunctuation
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?()]/g, ''); // Remove punctuation

  let definition = '';
  let emoji = '';

  // Find the definition and emoji
  for (const [key, value] of Object.entries(glossaryTerms)) {
    // Compare using normalized versions of both the key and search term
    const normalizedKey = key.toLowerCase().trim().replace(/[.,;:!?()]/g, '');
    
    if (normalizedKey === term ||
      (value.variations && value.variations.some(v => 
        v.toLowerCase().trim().replace(/[.,;:!?()]/g, '') === term))) {
      definition = value.definition;
      emoji = value.emoji;
      break;
    }
  }

  if (!definition) return;

  // Create popup
  const popup = document.createElement('div');
  popup.className = 'glossary-popup text-2xl fixed z-50 bg-white rounded-lg border-[1px] border-gray shadow-xl p-4 max-w-sm text-base';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-label', `Definition for ${term}`);

  // Create header container with flex layout
  const headerContainer = document.createElement('div');
  headerContainer.className = 'flex items-center gap-4 mb-4';

  // Create emoji container
  const emojiContainer = document.createElement('div');
  emojiContainer.className = 'text-4xl flex-shrink-0';
  emojiContainer.textContent = emoji;
  emojiContainer.setAttribute('role', 'img');
  emojiContainer.setAttribute('aria-label', `Symbol for ${term}`);

  // Create header text
  const header = document.createElement('div');
  header.className = 'font-bold text-2xl';
  header.textContent = term;

  // Assemble header
  headerContainer.appendChild(emojiContainer);
  headerContainer.appendChild(header);

  // Create content
  const content = document.createElement('div');
  content.className = 'mt-3 text-lg leading-relaxed';
  content.textContent = definition;

  // Create footer with button
  const footer = document.createElement('div');
  footer.className = 'mt-4 flex justify-end border-t border-gray-200 pt-4 pb-1';

  // Create "View in glossary" button
  const viewInGlossaryButton = document.createElement('button');
  viewInGlossaryButton.className = 'px-4 py-2 border border-blue-600 text-blue-600 bg-transparent rounded hover:bg-blue-50 transition-colors flex items-center gap-2 mx-auto';
  viewInGlossaryButton.innerHTML = '<i class="fas fa-book"></i> <span data-id="glossary-view-term">' + translateText("glossary-view-term") + '</span>';
  viewInGlossaryButton.addEventListener('click', () => {
    // Close the popup
    popup.remove();
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleEscape);
    document.removeEventListener('scroll', updatePopupPosition);

    // Get sidebar and glossary elements
    const sidebar = document.getElementById('sidebar');
    const glossaryContent = document.getElementById('glossary-content');
    const pageTab = document.getElementById('page-tab');
    const pageContent = document.getElementById('page-content');
    const glossaryTermsPage = document.getElementById('glossary-terms-page');

    // Make sure the sidebar is open
    if (sidebar && sidebar.classList.contains('translate-x-full')) {
      toggleSidebar();
    }

    // Show the glossary content
    if (glossaryContent && glossaryContent.classList.contains('hidden')) {
      // Hide other sidebar content first
      document.querySelectorAll('#sidebar > div').forEach(div => {
        if (div !== glossaryContent) {
          div.classList.add('hidden');
        }
      });
      
      // Show glossary content
      glossaryContent.classList.remove('hidden');
    }

    // Select the "On this page" tab
    if (pageTab) {
      pageTab.setAttribute('aria-selected', 'true');
      pageTab.classList.add('bg-gray-100');
      
      if (document.getElementById('book-tab')) {
        document.getElementById('book-tab').setAttribute('aria-selected', 'false');
        document.getElementById('book-tab').classList.remove('bg-gray-100');
      }
    }

    // Show the page content tab content
    if (pageContent && pageContent.classList.contains('hidden')) {
      pageContent.classList.remove('hidden');
      
      if (document.getElementById('book-content')) {
        document.getElementById('book-content').classList.add('hidden');
      }
    }

    // Find the term in the glossary list and scroll to it
    if (glossaryTermsPage) {
      // Wait a bit for any animations to complete
      setTimeout(() => {
        // Look for all items with the glossary-page-item class
        const glossaryItems = glossaryTermsPage.querySelectorAll('.glossary-page-item');
        let targetItem = null;
        
        for (const item of glossaryItems) {
          // Find the term element using the new glossary-page-term class
          const termElement = item.querySelector('.glossary-page-term');
          if (termElement) {
            // Get the text content and normalize it for comparison
            const termText = termElement.textContent.toLowerCase().trim();
            // Check if this term matches our search term
            if (termText.includes(term.toLowerCase())) {
              targetItem = item;
              break;
            }
          }
        }

        if (targetItem) {
          // Scroll the item into view
          targetItem.scrollIntoView({behavior: 'smooth', block: 'center'});
          
          // Highlight the item temporarily using Tailwind classes
          targetItem.classList.add('bg-yellow-100', 'transition-colors', 'duration-500');
          
          // Remove highlight after delay
          setTimeout(() => {
            targetItem.classList.remove('bg-yellow-100', 'transition-colors', 'duration-500');
          }, 2000);
        }
      }, 300);
    }
  });

  footer.appendChild(viewInGlossaryButton);

  // Assemble popup
  popup.appendChild(headerContainer);
  popup.appendChild(content);
  popup.appendChild(footer);

  // Position popup
  const updatePopupPosition = () => {
    const popupElement = document.querySelector('.glossary-popup');
    if (popupElement) {
      // Get the current position of the clicked element relative to the viewport
      const newRect = event.target.getBoundingClientRect();

      // Calculate absolute position by adding current scroll position
      const absoluteTop = newRect.bottom + window.scrollY;
      const absoluteLeft = newRect.left + window.scrollX;

      // Position the popup relative to the clicked element's current position
      popup.style.position = 'absolute'; // Use absolute instead of fixed
      popup.style.top = `${absoluteTop + 10}px`;
      popup.style.left = `${absoluteLeft}px`;

      // Adjust position if popup goes off screen
      const popupRect = popup.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (popupRect.right > viewportWidth) {
        popup.style.left = `${window.scrollX + viewportWidth - popupRect.width - 10}px`;
      }

      if (popupRect.bottom > viewportHeight) {
        // Show popup above the term if it would go off the bottom
        popup.style.top = `${window.scrollY + newRect.top - popupRect.height - 10}px`;
      }
    }
  };
  // Add to document
  document.body.appendChild(popup);
  updatePopupPosition();
  // Handle scroll event to update position
  window.addEventListener('scroll', updatePopupPosition);

  // Handle click outside
  function handleClickOutside(e) {
    if (!popup.contains(e.target) && e.target !== event.target) {
      popup.remove();
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('scroll', updatePopupPosition);
    }
  }

  // Handle Escape key
  function handleEscape(e) {
    if (e.key === 'Escape') {
      popup.remove();
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('scroll', updatePopupPosition);
      // Return focus to the term that was clicked
      event.target.focus();
    }
  }

  // Add event listeners
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('scroll', updatePopupPosition);
  }, 0);
}

// Remove all glossary term highlights
export const removeGlossaryHighlights = () => {
  // First, handle any existing popups
  document.querySelectorAll('.glossary-popup').forEach(popup => {
    popup.remove();
  });

  // Find all glossary terms
  document.querySelectorAll('.glossary-term').forEach(term => {
    const text = document.createTextNode(term.textContent);
    term.parentNode.replaceChild(text, term);
  });

  // Look for empty wrapper spans that may have been created
  document.querySelectorAll('span:not([class])').forEach(span => {
    // Check if this is likely a wrapper we created (no attributes, only text nodes)
    if (span.attributes.length === 0 &&
      span.childNodes.length > 0 &&
      Array.from(span.childNodes).every(node => node.nodeType === 3)) {

      // Get the text content
      const text = document.createTextNode(span.textContent);

      // Replace the span with its content
      if (span.parentNode) {
        span.parentNode.replaceChild(text, span);
      }
    }
  });
};

export const loadEasyReadMode = async () => {
  const easyReadModeCookie = getCookie("easyReadMode");

  if (easyReadModeCookie !== "") {
    setState("easyReadMode", easyReadModeCookie === "true");
    toggleButtonState("toggle-easy-read-button", state.easyReadMode);

    stopAudio();
    setState(
      "currentLanguage",
      document.getElementById("language-dropdown").value
    );
    await fetchTranslations();
  }
};

export const initializePlayBar = () => {
  try {
    // Get play bar visibility state
    const playBarVisible = getCookie("playBarVisible") === "true";
    const readAloudMode = getCookie("readAloudMode") === "true";

    // Get play bar element
    const playBar = document.getElementById("play-bar");
    if (!playBar) return;

    if (state.readAloudMode) {
      playBar.classList.remove("hidden");
    } else {
      playBar.classList.add("hidden");
    }
    // // Show/hide based on read aloud mode
    // if (readAloudMode) {
    //     playBar.classList.remove("hidden");
    //     setCookie("playBarVisible", "true", 7);
    // } else {
    //     playBar.classList.add("hidden");
    //     setCookie("playBarVisible", "false", 7);
    // }
  } catch (error) {
    console.error('Error initializing play bar:', error);
  }
};

export const togglePlayBarSettings = () => {
  const readAloudSettings = document.getElementById("read-aloud-settings");
  if (readAloudSettings.classList.contains("opacity-0")) {
    readAloudSettings.classList.add(
      "opacity-100",
      "pointer-events-auto",
      "h-auto"
    );
    readAloudSettings.classList.remove(
      "opacity-0",
      "pointer-events-none",
      "h-0"
    );
  } else {
    readAloudSettings.classList.remove(
      "opacity-100",
      "pointer-events-auto",
      "h-auto"
    );
    readAloudSettings.classList.add("h-0", "opacity-0", "pointer-events-none");
  }
};

export const formatNavigationItems = () => {
  const navListItems = document.querySelectorAll(".nav__list-item");

  navListItems.forEach((item, index) => {
    const link = item.querySelector(".nav__list-link");
    if (!link) return;

    // Setup basic classes for the item and link
    item.classList.add(
      "border-b",
      "border-gray-300",
      "flex",
      "items-center"
    );

    link.classList.add(
      "flex-grow",
      "flex",
      "items-center",
      "w-full",
      "h-full",
      "p-2",
      "py-3",
      "hover:bg-blue-50",
      "transition",
      "text-gray-500"
    );

    // Add border top to first element
    if (index === 0) {
      item.classList.add("border-t");
    }

    // Get section and page numbers from href
    const href = link.getAttribute("href");
    const textId = link.getAttribute("data-text-id");
    const pageSectionMatch = href.match(/(\d+)_(\d+)/);

    // Handle activity items
    let itemIcon = "";
    let itemSubtitle = "";
    if (item.classList.contains("activity")) {
      const activityId = href.split(".")[0];
      const success = JSON.parse(localStorage.getItem(`${activityId}_success`)) || false;

      if (success) {
        itemIcon = `<i class="${activityId} fas fa-check-square text-green-500 mt-1"></i>`;
        itemSubtitle = "<span data-id='activity-completed'></span>";
      } else {
        itemIcon = `<i class="${activityId} fas fa-pen-to-square mt-1 text-blue-700"></i>`;
        itemSubtitle = "<span data-id='activity-to-do'></span>";
      }
    }
    // Format the link content with section numbers
    let humanReadablePage;
    if (pageSectionMatch) {
      const [_, pageNumber, sectionNumber] = pageSectionMatch.map(Number);

      // Handle special case of page 0
      if (pageNumber === 0 && (!sectionNumber || sectionNumber === 0)) {
        humanReadablePage = "0";
      } 
      // For pages with sections
      else if (sectionNumber !== undefined) {
        // If this is the first section (section 0), just show the page number
        if (sectionNumber === 0) {
          humanReadablePage = `${pageNumber - 1}`;
        }
        // For subsequent sections, show page.section format
        else {
          humanReadablePage = `${pageNumber - 1}.${sectionNumber}`;
        }
      } 
      // For pages with no section information
      else {
        humanReadablePage = pageNumber - 1;
      }
    } else {
      humanReadablePage = "0";
    }

    link.innerHTML =
      "<div class='flex items-top space-x-2'>" +
      itemIcon +
      "<div>" +
      `<div>${humanReadablePage}: <span class='inline text-gray-800' data-id='${textId}'></span></div>` +
      "<div class='text-sm text-gray-500'>" +
      itemSubtitle +
      "</div>" +
      "</div>" +
      "</div>";

    // Highlight current page
    if (href === window.location.pathname.split("/").pop()) {
      item.classList.add("min-h-[3rem]");
      link.classList.add(
        "border-l-4",
        "border-blue-500",
        "bg-blue-100",
        "p-2"
      );
    }
  });
}

export const setPlayPauseIcon = () => {
  const playIcon = document.getElementById("read-aloud-play-icon");
  const pauseIcon = document.getElementById("read-aloud-pause-icon");

  if (state.isPlaying) {
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
  } else {
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
  }
};

const initializeToggleStates = () => {
  const toggles = {
    "toggle-easy-read-button": state.easyReadMode,
    "toggle-read-aloud": state.readAloudMode,
    "toggle-syllables": state.syllablesMode,
    "toggle-eli5": state.eli5Mode,
    "toggle-autoplay": state.autoplayMode,
    "toggle-describe-images": state.describeImagesMode,
  };

  Object.entries(toggles).forEach(([id, value]) => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.checked = value;
      updateToggleVisuals(toggle);
    }
  });
};

const initializePlaybackControls = () => {
  const playbackSpeed = document.getElementById("read-aloud-speed");
  if (playbackSpeed) {
    playbackSpeed.classList.add(
      "absolute",
      "bottom-24",
      "right-4",
      "bg-white",
      "rounded-lg",
      "shadow-lg",
      "z-50"
    );
  }
};

export const updateToggleVisuals = (toggle) => {
  const container = toggle.closest(".toggle-container");
  if (container) {
    const track = container.querySelector(".toggle-track");
    const thumb = container.querySelector(".toggle-thumb");

    if (toggle.checked) {
      track?.classList.remove("bg-gray-200");
      track?.classList.add("bg-blue-600");
      thumb?.classList.add("translate-x-5");
    } else {
      track?.classList.add("bg-gray-200");
      track?.classList.remove("bg-blue-600");
      thumb?.classList.remove("translate-x-5");
    }
  }
};

export const extractPageTerms = () => {
  const contentArea = document.getElementById('content');
  if (!contentArea) return [];

  // Get the actual text content of the page
  const pageContent = contentArea.textContent;
  
  // Create a map to track terms and their original capitalization
  const termMap = new Map(); // Maps lowercase terms to their preferred display form

  // Escape special characters for regex
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Build a list of all terms to check
  const allTerms = [];
  Object.entries(glossaryTerms || {}).forEach(([key, value]) => {
    // Add main term
    allTerms.push(key);
    
    // Add variations
    if (value.variations && Array.isArray(value.variations)) {
      value.variations.forEach(term => allTerms.push(term));
    }
  });

  // Check each term with a word boundary regex to ensure exact matches
  allTerms.forEach(term => {
    // Create a pattern that handles word boundaries better with accented characters
    const regex = new RegExp(`(^|[^a-záéíóúñA-ZÁÉÍÓÚÑ])${escapeRegExp(term)}($|[^a-záéíóúñA-ZÁÉÍÓÚÑ])`, 'gi');
    
    // Find all exact matches in the content
    let matches = pageContent.match(regex);
    if (matches) {
        matches.forEach(match => {
            // Extract just the term from the match (remove the boundary characters)
            const extractedTerm = match.trim().replace(/^[^a-záéíóúñA-ZÁÉÍÓÚÑ]|[^a-záéíóúñA-ZÁÉÍÓÚÑ]$/g, '');
            
            // Store the lowercase version as key, but keep the first occurrence's capitalization
            const lowerCaseTerm = extractedTerm.toLowerCase();
            
            // Only add to the map if it's not already there
            if (!termMap.has(lowerCaseTerm)) {
                termMap.set(lowerCaseTerm, extractedTerm);
            }
        });
    }
  });

  // Convert the map values to an array and sort it alphabetically
  return Array.from(termMap.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
};
