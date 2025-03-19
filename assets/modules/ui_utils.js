import { getState, setState, state } from './state.js';
import { setCookie, getCookie } from './cookies.js';
import {
    stopAudio,
    unhighlightAllElements,
    unhighlightElement,
    gatherAudioElements,
    highlightElement,
    playCurrentAudio,
    playAudioSequentially
} from './audio.js';
import { setPlayPauseIcon, loadGlossaryTerms, highlightGlossaryTerms, removeGlossaryHighlights, cacheInterfaceElements } from './interface.js'
import { toggleButtonState } from './utils.js';
import { extractPageTerms } from './interface.js';
import { translateText } from './translations.js';

document.addEventListener('click', (event) => {
  // Check for clicks on any element with glossary-term class or data-glossary-term attribute
  const glossaryTerm = event.target.closest('.glossary-term, [data-glossary-term="true"]');
  
  if (glossaryTerm) {
    // Import the showGlossaryDefinition function
    import('./interface.js').then(module => {
      // Call the function directly with the event
      module.showGlossaryDefinition(event);
    });
    
    // Set flag to prevent audio playback
    window._isGlossaryTermClick = true;
    
    // Stop any currently playing audio
    if (state.isPlaying || state.currentAudio) {
      stopAudio();
      unhighlightAllElements();
    }
    
    // Clear the flag after a delay
    setTimeout(() => {
      window._isGlossaryTermClick = false;
    }, 100);
    
    return false;
  }
}, {capture: true}); // Use capture to ensure this runs before other handlers

export const loadAutoplayState = () => {
    const autoplayModeCookie = getCookie("autoplayMode");
    if (autoplayModeCookie !== null) {
        setState('autoplayMode', autoplayModeCookie === "true");
        toggleButtonState("toggle-autoplay", state.autoplayMode);
    }
};

export const loadDescribeImagesState = () => {
    const describeImagesModeCookie = getCookie("describeImagesMode");
    if (describeImagesModeCookie !== null) {
        setState('describeImagesMode', describeImagesModeCookie === "true");
        toggleButtonState("toggle-describe-images", state.describeImagesMode);

        // Regather audio elements to ensure correct initial state
        gatherAudioElements();
    }
};

export const loadSyllablesState = () => {
    const syllablesModeCookie = getCookie("syllablesMode");
    if (syllablesModeCookie !== null) {
        setState('syllablesMode', syllablesModeCookie === "true");
        toggleButtonState("toggle-syllables", state.syllablesMode);
    }
};

export const loadGlossaryState = () => {
    const glossaryModeCookie = getCookie("glossaryMode");
    if (glossaryModeCookie !== null) {
        setState('glossaryMode', glossaryModeCookie === "true");
        toggleButtonState("toggle-glossary", state.glossaryMode);
    }
};

export const toggleAutoplay = () => {
    stopAudio();
    unhighlightAllElements();

    setState('autoplayMode', !state.autoplayMode);
    toggleButtonState("toggle-autoplay", state.autoplayMode);
    setCookie("autoplayMode", state.autoplayMode, 7);

    if (state.readAloudMode && state.autoplayMode) {
        setState('currentIndex', 0);
        setState('isPlaying', true);
        setPlayPauseIcon();
        playAudioSequentially();
    }
};

export const toggleDescribeImages = () => {
    stopAudio();
    unhighlightAllElements();

    setState('describeImagesMode', !state.describeImagesMode);
    toggleButtonState("toggle-describe-images", state.describeImagesMode);
    setCookie("describeImagesMode", state.describeImagesMode, 7);

    // Regather audio elements to update the sequence with or without images
    gatherAudioElements();

    // If read aloud and autoplay are active, start playing from beginning
    if (state.readAloudMode && state.autoplayMode) {
        setState('currentIndex', 0);
        setState('isPlaying', true);
        setPlayPauseIcon();
        playAudioSequentially();
    }
};

export const initializeAutoplay = () => {
    // Don't automatically start playing on page load
    if (state.readAloudMode && state.autoplayMode) {
        console.log('Audio will start playing after user interaction');
        setState('isPlaying', true);
        setPlayPauseIcon();

        // Setup audio elements but don't play yet
        gatherAudioElements();
        setState('currentIndex', 0);

        playAudioSequentially();

        //    // Add one-time listener for user interaction
        //    const startAudioOnInteraction = () => {
        //        document.removeEventListener('click', startAudioOnInteraction);
        //        document.removeEventListener('keydown', startAudioOnInteraction);
        //    };

        //    document.addEventListener('click', startAudioOnInteraction);
        //    document.addEventListener('keydown', startAudioOnInteraction);
    }
};

export const loadToggleButtonState = () => {
    const easyReadItem = document.getElementById("toggle-easy-read-button");
    const readAloudItem = document.getElementById("toggle-read-aloud");
    //const syllablesItem = document.getElementById("toggle-syllables");
    const eli5Item = document.getElementById("toggle-eli5");
    const autoplayContainer = document.getElementById("autoplay-container");
    const describeImagesContainer = document.getElementById("describe-images-container");
    const ttsOptionsContainer = document.getElementById("tts-options-container");
    const eli5Container = document.getElementById("eli5-container");
    //const glossaryItem = document.getElementById("glossary-toggle");

    if (!readAloudItem || !eli5Item || !ttsOptionsContainer || !easyReadItem) {
        setTimeout(loadToggleButtonState, 100);
        return;
    }

    handleReadAloudState(autoplayContainer, describeImagesContainer, ttsOptionsContainer, eli5Container);
    handleEli5State();
};

/**
 * 
 * Initialize the click listeners for every clickable element
 */
export const initializeAudioElements = () => {
    state.audioElements.forEach(({ element }) => {
        element.removeEventListener('click', handleAudioElementClick);
        element.addEventListener('click', () => handleAudioElementClick(element, state.audioElements));
    });
}

const handleAudioElementClick = (element, elements) => {
    // First check the global glossary click flag
    if (window._isGlossaryTermClick === true) {
        console.log('Preventing audio for glossary term click (global flag)');
        return;
    }
    
    // Then check element classes/attributes
    const isGlossaryTerm = 
        element.classList.contains('glossary-highlighted') || 
        element.classList.contains('glossary-term') ||
        element.hasAttribute('data-glossary-term') ||
        element.closest('.glossary-term-highlight') ||
        element.closest('.glossary-term') ||
        element.closest('[data-glossary-term]');

    if (isGlossaryTerm) {
        console.log('Preventing audio for glossary term click (element check)');
        return;
    }
    
    if (state.readAloudMode) {
        const isImage = element.tagName.toLowerCase() === "img";

        // Always allow clicks to play audio, even for images when describe images is off
        const index = elements.findIndex(item => item.element === element);

        // If the element is found in our current sequence, play it
        if (index !== -1) {
            setState('currentIndex', index);
            stopAudio();
            setState('isPlaying', true);
            playCurrentAudio();
        }
        // Special handling for images that might not be in the sequence (when describe images is off)
        else if (isImage) {
            // Get the image's ID and audio source directly
            const id = element.getAttribute('data-id');
            let audioSrc = state.audioFiles[id];

            const ariaId = element.getAttribute('data-aria-id');
            if (ariaId && state.audioFiles[ariaId]) {
                audioSrc = state.audioFiles[ariaId];
            }

            if (audioSrc) {
                // Play the audio directly without using the sequence
                stopAudio();
                unhighlightAllElements();

                const audio = new Audio(audioSrc);
                setState('currentAudio', audio);
                audio.playbackRate = parseFloat(state.audioSpeed);

                highlightElement(element);
                setState('isPlaying', true);
                updatePlayPauseIcon(true);

                audio.play().catch(err => {
                    console.error("Error playing audio:", err);
                    unhighlightElement(element);
                    setState('isPlaying', false);
                    updatePlayPauseIcon(false);
                });

                audio.onended = () => {
                    unhighlightElement(element);
                    setState('currentAudio', null);
                    setState('isPlaying', false);
                    updatePlayPauseIcon(false);
                };
            }
        }
    }
};

const handleReadAloudState = (autoplayContainer, describeImagesContainer, ttsOptionsContainer, eli5Container) => {
    const readAloudModeCookie = getCookie("readAloudMode");
    if (readAloudModeCookie) {
        setState('readAloudMode', readAloudModeCookie === "true");
        toggleButtonState("toggle-read-aloud", state.readAloudMode);

        updateContainersVisibility(
            state.readAloudMode,
            autoplayContainer,
            describeImagesContainer,
            ttsOptionsContainer,
            eli5Container
        );
    }
};

const updateContainersVisibility = (
    isReadAloudMode,
    autoplayContainer,
    describeImagesContainer,
    ttsOptionsContainer,
    eli5Container
) => {
    if (isReadAloudMode) {
        showReadAloudContainers(ttsOptionsContainer, autoplayContainer, describeImagesContainer, eli5Container);
    } else {
        hideReadAloudContainers(ttsOptionsContainer, autoplayContainer, describeImagesContainer, eli5Container);
    }
};

export const showReadAloudContainers = () => {
    const ttsOptionsContainer = document.getElementById('tts-options-container');
    const autoplayContainer = document.getElementById('autoplay-container');
    const describeImagesContainer = document.getElementById('describe-images-container');
    const eli5Container = document.querySelector('#eli5-label')?.closest('.flex');

    // Show options and ensure proper spacing
    ttsOptionsContainer?.classList.remove('hidden');
    autoplayContainer?.classList.remove('hidden');
    describeImagesContainer?.classList.remove('hidden');

    ttsOptionsContainer?.classList.add('mt-4', 'mb-2', 'px-4');
    eli5Container?.classList.add('mt-4');
};

export const updatePlayPauseIcon = (isPlaying) => {
    const playIcon = document.getElementById("read-aloud-play-icon");
    const pauseIcon = document.getElementById("read-aloud-pause-icon");
    if (isPlaying) {
        playIcon.classList.add("hidden");
        pauseIcon.classList.remove("hidden");
    } else {
        playIcon.classList.remove("hidden");
        pauseIcon.classList.add("hidden");
    }
};

const hideReadAloudContainers = (ttsOptionsContainer, autoplayContainer, describeImagesContainer, eli5Container) => {
    ttsOptionsContainer.classList.add("hidden");
    ttsOptionsContainer.setAttribute("aria-expanded", "false");
    autoplayContainer.classList.add("hidden");
    describeImagesContainer.classList.add("hidden");
    eli5Container.classList.add("border-t", "border-gray-300");
};

const handleEli5State = () => {
    const explainButton = document.getElementById('explain-me-button');
    const eli5ModeCookie = getCookie("eli5Mode");
    if (eli5ModeCookie) {
        setState('eli5Mode', eli5ModeCookie === "true");
        toggleButtonState("toggle-eli5", state.eli5Mode);

        if (state.eli5Mode && state.translations) {
            displayEli5Content();
            explainButton?.classList.remove('hidden');
        } else {
            // Hide the button if ELI5 mode is off
            explainButton?.classList.add('hidden');
        }
    } else {
        // If no cookie is set, ELI5 is off by default
        explainButton?.classList.add('hidden');
    }
};

const displayEli5Content = () => {
    const mainSection = document.querySelector('section[data-id^="sectioneli5"]');
    if (mainSection) {
        const eli5Id = mainSection.getAttribute("data-id");
        const eli5Text = state.translations[eli5Id];
        if (eli5Text) {
            const eli5Container = document.getElementById("eli5-content-text");
            eli5Container.textContent = eli5Text;
            eli5Container.classList.remove("hidden");
        }
    }
};

export const toggleEli5Mode = () => {
    setState('eli5Mode', !state.eli5Mode);
    setCookie("eli5Mode", state.eli5Mode, 7);
    toggleButtonState("toggle-eli5", state.eli5Mode);

    if (state.isPlaying) stopAudio();
    unhighlightAllElements();

    handleEli5ModeToggle();
};

export const handleEli5Popup = () => {
    const explainButton = document.getElementById('explain-me-button');
    const eli5Content = document.getElementById('eli5-content');
    const closeButton = document.getElementById('close-eli5-content');
    const mainSection = document.querySelector('section[data-id^="sectioneli5"]');
    const eli5Id = mainSection.getAttribute("data-id");

    // Toggle the visibility when the button is clicked
    explainButton.addEventListener('click', function () {
        const isVisible = !eli5Content.classList.contains('hidden');

        if (isVisible) {
            eli5Content.classList.add('hidden');
            explainButton.setAttribute('aria-expanded', 'false');
            removeEli5AudioFromQueue();
        } else {
            eli5Content.classList.remove('hidden');
            explainButton.setAttribute('aria-expanded', 'true');
            handleEli5Audio(eli5Id);
        }
    });

    // Hide the popup when the close button is clicked
    closeButton.addEventListener('click', function () {
        eli5Content.classList.add('hidden');
        explainButton.setAttribute('aria-expanded', 'false');
        removeEli5AudioFromQueue();
    });

    // Close popup if user clicks outside of it
    document.addEventListener('click', function (event) {
        if (!eli5Content.contains(event.target) &&
            !explainButton.contains(event.target) &&
            !eli5Content.classList.contains('hidden')) {
            eli5Content.classList.add('hidden');
            explainButton.setAttribute('aria-expanded', 'false');
            removeEli5AudioFromQueue();
        }
    });
};

const handleEli5ModeToggle = () => {
    const explainButton = document.getElementById('explain-me-button');
    if (state.eli5Mode) {
        const mainSection = document.querySelector('section[data-id^="sectioneli5"]');
        if (!mainSection) return;

        const eli5Id = mainSection.getAttribute("data-id");
        const eli5Text = state.translations[eli5Id];

        if (eli5Text) {
            updateEli5Content(eli5Id, eli5Text);
        }

        if (explainButton) {
            explainButton.classList.remove('hidden');
        }
    } else {

        clearEli5Content();
        //Hide the eli5 toggle button

        if (explainButton) {
            explainButton.classList.add('hidden');
        }
    }
};

const updateEli5Content = (eli5Id, eli5Text) => {
    const eli5Container = document.getElementById("eli5-content-text");
    eli5Container.innerHTML = `<span data-id="${eli5Id}">${eli5Text}</span>`;
    eli5Container.classList.remove("hidden");
};

const handleEli5Audio = (eli5Id) => {
    if (state.readAloudMode) {
        stopAudio();
        const eli5Container = document.getElementById("eli5-content-text");
        highlightElement(eli5Container);
        const eli5AudioSrc = state.audioFiles[eli5Id];

        if (eli5AudioSrc) {
            addEli5AudioToQueue(eli5AudioSrc, eli5Container);
        }
    }
};

const addEli5AudioToQueue = (audioSrc, container) => {
    // Check if the element is already in the audio queue
    const existingIndex = state.audioElements.findIndex(
        (item) => item.element === container && item.audioSrc === audioSrc
    );

    if (existingIndex !== -1) {
        // Element is already in the queue, set the current index to the existing element
        setState('currentIndex', existingIndex);
    } else {
        // Add the ELI5 audio to the audio queue
        state.audioElements.push({
            element: container,
            id: 'eli5-audio',
            audioSrc: audioSrc
        });

        // Update the current index to the new ELI5 audio
        setState('currentIndex', state.audioElements.length - 1);
    }

    // Play the ELI5 audio
    setState('isPlaying', true);
    playCurrentAudio();
};

const removeEli5AudioFromQueue = () => {
    // Stop the audio and unhighlight all elements
    stopAudio();
    unhighlightAllElements();

    // Find the index of the ELI5 audio in the audio elements queue
    const eli5Index = state.audioElements.findIndex(item => item.id === 'eli5-audio');

    // If the ELI5 audio is found, remove it from the queue
    if (eli5Index !== -1) {
        state.audioElements.splice(eli5Index, 1);

        // Adjust the current index if necessary
        if (state.currentIndex >= eli5Index) {
            setState('currentIndex', Math.max(0, state.currentIndex - 1));
        }
    }
};

const playEli5Audio = (audioSrc, container) => {
    stopAudio();
    setState('eli5Active', true);
    const audio = new Audio(audioSrc);
    setState('eli5Audio', audio);
    audio.playbackRate = parseFloat(state.audioSpeed);
    audio.play();

    audio.onended = () => {
        unhighlightElement(container);
        setState('eli5Active', false);
        setState('isPlaying', false);
        setPlayPauseIcon();
    };

    setState('isPlaying', true);
    setPlayPauseIcon();
};

const clearEli5Content = () => {
    const eli5Container = document.getElementById("eli5-content-text");
    eli5Container.textContent = "";
    eli5Container.classList.add("hidden");
};

export const announceToScreenReader = (message) => {
    let announcement = document.getElementById('sr-announcement');
    if (!announcement) {
        const div = document.createElement('div');
        div.id = 'sr-announcement';
        div.setAttribute('role', 'status');
        div.setAttribute('aria-live', 'polite');
        div.classList.add('sr-only'); // Make it invisible but available to screen readers
        document.body.appendChild(div);
        announcement = div;
    }

    announcement.textContent = message;
}

export const populateGlossaryTerms = () => {
    loadGlossaryTerms().then(() => {
        const glossaryList = document.getElementById('glossary-terms-book');
        const glossaryPageList = document.getElementById('glossary-terms-page');
        const glossaryTerms = state.glossaryTerms;
        state.pageTerms = extractPageTerms(); // Extract terms from the current page
        const pageTerms = state.pageTerms;

        // Empty glossary lists if they already have content
        if (glossaryList) glossaryList.innerHTML = '';
        if (glossaryPageList) glossaryPageList.innerHTML = '';

        // Use a Set to track added terms and avoid duplicates
        const addedTerms = new Set();

        // Populate the main glossary book list with alphabetical grouping
        if (glossaryList && glossaryTerms) {
            // Step 1: Collect and organize terms by first letter (normalized to group accented letters)
            const termsByLetter = {};
            
            Object.entries(glossaryTerms).forEach(([key, data]) => {
                if (!addedTerms.has(key.toLowerCase())) {
                    // Get first letter, normalize it to remove diacritics, and ensure it's uppercase
                    const firstLetterWithAccent = key.charAt(0).toUpperCase();
                    const firstLetterNormalized = firstLetterWithAccent
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toUpperCase();
                    
                    // Use the normalized letter as the key for grouping
                    if (!termsByLetter[firstLetterNormalized]) {
                        termsByLetter[firstLetterNormalized] = [];
                    }
                    
                    // Add the term data to the appropriate letter group
                    termsByLetter[firstLetterNormalized].push({
                        term: key,
                        displayTerm: key.charAt(0).toUpperCase() + key.slice(1),
                        emoji: data.emoji,
                        definition: data.definition,
                        originalFirstLetter: firstLetterWithAccent // Store for potential display
                    });
                    
                    addedTerms.add(key.toLowerCase());
                }
            });

            // Step 2: Sort the letters alphabetically (normalized)
            const sortedLetters = Object.keys(termsByLetter).sort();

            // Step 3: Create letter groups and append terms
            sortedLetters.forEach(letter => {
                // Determine the display letter (we could use the first term's original letter)
                const letterGroup = termsByLetter[letter];
                
                // Find if there's any accented version of this letter in the group
                // Otherwise, use the normalized letter itself
                const displayLetter = letter;
                
                // Create a letter heading
                const letterHeading = document.createElement('div');
                letterHeading.classList.add('glossary-letter-grouping', 'text-2xl', 'font-bold', 'mt-6', 'mb-3', 'text-blue-700', 'pb-4');
                letterHeading.textContent = displayLetter;
                glossaryList.appendChild(letterHeading);
                
                // Sort terms within this letter group alphabetically
                // We use localeCompare with sensitivity: 'base' to treat accented letters the same
                letterGroup.sort((a, b) => 
                    a.term.localeCompare(b.term, undefined, { sensitivity: 'base' })
                );
                
                // Create and append each term in this letter group
                letterGroup.forEach(item => {
                    createGlossaryItem(glossaryList, item.displayTerm, item.emoji, item.definition, item.term);
                });
            });
        }

        // Populate the page-specific glossary terms (unchanged)
        if (glossaryPageList && pageTerms && pageTerms.length > 0) {
            pageTerms.forEach(term => {
                let termData = null;
                let matchedMainTerm = null;

                // Find the term data and the corresponding main term
                Object.entries(glossaryTerms).forEach(([key, data]) => {
                    const { variations } = data;
                    const variation = variations.find(v => v.toLowerCase() === term.toLowerCase());
                    if (variation) {
                        termData = data;
                        matchedMainTerm = key; // Store the main term, not the variation
                    } else if (key.toLowerCase() === term.toLowerCase()) {
                        termData = data;
                        matchedMainTerm = key;
                    }
                });

                if (termData && matchedMainTerm) {
                    const { emoji, definition } = termData;

                    // Create a container for each glossary item
                    const glossaryItem = document.createElement('div');
                    glossaryItem.classList.add('mb-4', 'border-b', 'border-gray-300', 'pb-4', 'glossary-page-item');

                    // Use the exact matched text from the page for display
                    const termTitleText = term.charAt(0).toUpperCase() + term.slice(1);

                    // Create the term element as a title
                    const termTitle = document.createElement('div');
                    termTitle.classList.add('font-bold', 'text-lg', 'glossary-page-term');
                    termTitle.textContent = emoji ? (termTitleText + " " + emoji) : termTitleText;
                    glossaryItem.appendChild(termTitle);

                    // Create the definition element
                    const definitionElement = document.createElement('div');
                    definitionElement.classList.add('mt-2', 'text-gray-700', 'mb-2');
                    definitionElement.textContent = definition;
                    glossaryItem.appendChild(definitionElement);

                    // Append the glossary item to the list
                    glossaryPageList.appendChild(glossaryItem);
                }
            });
        } else if (glossaryPageList) {
            glossaryPageList.innerHTML = '<span data-id="glossary-no-terms">' + translateText('glossary-no-terms') + '</span>';
        }

        // If glossary mode is on, reload glossary terms
        if (state.glossaryMode) {
            highlightGlossaryTerms();
        } else {
            removeGlossaryHighlights();
        }
    });
};

// Replace the createGlossaryItem function
const createGlossaryItem = (glossaryList, term, emoji, definition, variation) => {
    // Create a container for each glossary item
    const glossaryItem = document.createElement('div');
    glossaryItem.classList.add('mb-4', 'border-b', 'border-gray-300', 'pb-4', 'glossary-item', 'cursor-pointer');

    // Create the term element as a link
    const termElement = document.createElement('a');
    termElement.classList.add('font-bold', 'text-lg', 'glossary-term');
    termElement.href = `#${variation}`;
    termElement.textContent = term;

    // Get variation data from state
    const termData = state.glossaryTerms[variation];
    
    // Store the variations for search filtering
    if (termData && termData.variations && Array.isArray(termData.variations)) {
        // Store both the main term and all variations for search
        const allSearchTerms = [variation.toLowerCase(), ...termData.variations.map(v => v.toLowerCase())];
        glossaryItem.dataset.searchTerms = allSearchTerms.join('|');
    } else {
        // If no variations, just store the main term
        glossaryItem.dataset.searchTerms = variation.toLowerCase();
    }

    glossaryItem.appendChild(termElement);

    // Append the glossary item to the list
    glossaryList.appendChild(glossaryItem);

    // Add click event listener to show glossary term details
    glossaryItem.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior
        
        const glossaryContent = document.getElementById('glossary-content');
        const glossaryTermDetails = document.getElementById('glossary-term-details');
        const glossaryTermContent = document.getElementById('glossary-term-content');
        
        // Get the original term and its variations
        const originalTerm = variation;
        const termData = state.glossaryTerms[originalTerm];
        let variationsHtml = '';
        
        // Add variations if they exist
        if (termData && termData.variations && termData.variations.length > 0) {
            // Join variations with commas first
            const joinedVariations = termData.variations.join(', ');
            
            // Then capitalize only the first letter of the entire string
            const formattedVariations = joinedVariations.charAt(0).toUpperCase() + joinedVariations.slice(1);
            
            variationsHtml = `
                <div class="text-sm text-gray-500 mt-1 mb-3">
                    ${formattedVariations}
                </div>
            `;
        }

        // Populate the term details content with improved header structure
        glossaryTermContent.innerHTML = `
            <div class="flex justify-center items-center mt-8 mb-2 border-b border-gray-300 pb-8">
                <h3 class="text-2xl font-bold">
                    ${term} ${emoji || ''}
                </h3>
            </div>
            ${variationsHtml}
            <div class="mt-4 text-lg">
                ${definition}
            </div>
        `;

        // Hide glossary content and show term details
        glossaryContent.classList.add('hidden');
        glossaryTermDetails.classList.remove('hidden');
    });
};

export const initializeGlossary = () => {
    const glossaryButton = document.getElementById('glossary-button');
    const glossaryContent = document.getElementById('glossary-content');
    const backToSidebarButton = document.getElementById('back-to-sidebar');
    const sidebarContent = document.getElementById('sidebar-content');
    const pageTab = document.getElementById('page-tab');
    const bookTab = document.getElementById('book-tab');
    const pageContent = document.getElementById('page-content');
    const bookContent = document.getElementById('book-content');
    const filterInput = document.getElementById('filter-input');
    const glossaryTermsBook = document.getElementById('glossary-terms-book');
    const glossaryTermDetails = document.getElementById('glossary-term-details');
    const closeGlossaryTermDetailsButton = document.getElementById('close-glossary-term-details');
    
    populateGlossaryTerms();

    if (glossaryButton && glossaryContent && backToSidebarButton && sidebarContent) {
        // Check for saved glossary state first
        const savedGlossaryOpen = getCookie("glossaryListOpen");
        if (savedGlossaryOpen === "true") {
            // Show glossary content, hide sidebar content
            sidebarContent.classList.add('hidden');
            glossaryContent.classList.remove('hidden');
        }
        
        // Update click handlers to save state
        glossaryButton.addEventListener('click', () => {
            sidebarContent.classList.add('hidden');
            glossaryContent.classList.remove('hidden');
            // Make sure term details is hidden when opening glossary
            glossaryTermDetails.classList.add('hidden');
            // Save state when opening glossary
            setCookie("glossaryListOpen", "true", 7);
        });

        backToSidebarButton.addEventListener('click', () => {
            glossaryContent.classList.add('hidden');
            sidebarContent.classList.remove('hidden');
            // Make sure term details is hidden when closing glossary
            glossaryTermDetails.classList.add('hidden');
            // Save state when closing glossary
            setCookie("glossaryListOpen", "false", 7);
        });

        // Update the close glossary term details button handler
        if (closeGlossaryTermDetailsButton) {
            closeGlossaryTermDetailsButton.addEventListener('click', () => {
                // Hide term details and show main glossary content
                glossaryTermDetails.classList.add('hidden');
                glossaryContent.classList.remove('hidden');
            });
        }
    }

    if (pageTab && bookTab && pageContent && bookContent) {
        // Function to set active tab
        const setActiveTab = (tabIndex) => {
            if (tabIndex === 0) {
                // On this page tab
                pageTab.setAttribute('aria-selected', 'true');
                bookTab.setAttribute('aria-selected', 'false');
                pageContent.classList.remove('hidden');
                bookContent.classList.add('hidden');
                pageTab.classList.add("text-blue-700", "border-b-4", "border-blue-700", "-mb-1");
                bookTab.classList.remove("border-b-4", "border-blue-700", "text-blue-700", "-mb-1");
            } else {
                // On this chapter tab
                pageTab.setAttribute('aria-selected', 'false');
                bookTab.setAttribute('aria-selected', 'true');
                pageContent.classList.add('hidden');
                bookContent.classList.remove('hidden');
                pageTab.classList.remove('text-blue-700');
                bookTab.classList.add("text-blue-700", "border-b-4", "border-blue-700", "-mb-1");
                pageTab.classList.remove("border-b-4", "border-blue-700", "text-blue-700", "-mb-1");
            }
            
            // Save the tab state to a cookie
            setCookie("activeGlossaryTabIndex", tabIndex, 7); // Save for 7 days
        };

        // Check if we have a saved tab preference
        const savedTabIndex = getCookie("activeGlossaryTabIndex");
        
        // Apply the saved tab or default to the first tab
        if (savedTabIndex !== null && savedTabIndex !== undefined && savedTabIndex !== "") {
            // Apply the saved tab
            setActiveTab(parseInt(savedTabIndex));
        } else {
            // Default to first tab (index 0)
            setActiveTab(0);
        }
        
        // Event listeners for tab switching
        pageTab.addEventListener('click', () => {
            setActiveTab(0);
        });

        bookTab.addEventListener('click', () => {
            setActiveTab(1);
        });
    }

    if (filterInput && glossaryTermsBook) {
        filterInput.addEventListener('input', () => {
            // Normalize the filter value: lowercase and remove diacritics
            const filterValue = filterInput.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            
            // Get all terms and letter headings
            const terms = glossaryTermsBook.querySelectorAll('.glossary-item');
            const letterHeadings = glossaryTermsBook.querySelectorAll('.glossary-letter-grouping');
            
            let hasResults = false;
            
            // Create a map to track which letter headings have visible terms
            const letterHeadingsVisibility = new Map();
            
            // Initialize all letter headings as not having visible terms
            letterHeadings.forEach(heading => {
                letterHeadingsVisibility.set(heading, false);
            });
            
            // First pass: Filter the terms and mark which letter headings have visible terms
            terms.forEach(term => {
                // Get both visible text and stored search terms (which include variations)
                const termText = term.textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const searchTerms = (term.dataset.searchTerms || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                
                // Check if this term matches the filter
                const isVisible = termText.includes(filterValue) || searchTerms.includes(filterValue);
                
                if (isVisible) {
                    term.classList.remove('hidden');
                    hasResults = true;
                    
                    // Find the previous letter heading for this term
                    let currentElement = term;
                    while (currentElement.previousElementSibling) {
                        currentElement = currentElement.previousElementSibling;
                        if (currentElement.classList.contains('glossary-letter-grouping')) {
                            // Mark this heading as having a visible term
                            letterHeadingsVisibility.set(currentElement, true);
                            break;
                        }
                    }
                } else {
                    term.classList.add('hidden');
                }
            });
            
            // Second pass: Update visibility of letter headings
            letterHeadings.forEach(heading => {
                if (letterHeadingsVisibility.get(heading)) {
                    heading.classList.remove('hidden');
                } else {
                    heading.classList.add('hidden');
                }
            });
            
            // Show or hide the no results message
            let noResultsMessage = document.getElementById('no-results-message');
            if (!noResultsMessage) {
                noResultsMessage = document.createElement('span');
                noResultsMessage.id = 'no-results-message';
                noResultsMessage.dataset.id = 'glossary-no-terms-filter';
                noResultsMessage.classList.add('text-gray-700', 'mt-4');
                noResultsMessage.textContent = translateText('glossary-no-terms-filter');
                glossaryTermsBook.appendChild(noResultsMessage);
            }

            if (hasResults) {
                noResultsMessage.classList.add('hidden');
            } else {
                noResultsMessage.classList.remove('hidden');
            }
        });
    }
};

export const initializeTabs = () => {
    const assistantTab = document.getElementById('assistant-tab');
    const settingsTab = document.getElementById('settings-tab');
    const assistantContent = document.getElementById('assistant-content');
    const settingsContent = document.getElementById('settings-content');

    if (assistantTab && settingsTab && assistantContent && settingsContent) {
        // Function to set active tab - reuse existing logic
        const setActiveTab = (tabIndex) => {
            if (tabIndex === 0) {
                // Assistant tab
                assistantTab.setAttribute('aria-selected', 'true');
                settingsTab.setAttribute('aria-selected', 'false');
                assistantContent.classList.remove('hidden');
                settingsContent.classList.add('hidden');
                assistantTab.classList.add("text-blue-700", "border-b-4", "-mb-1",  "border-blue-700");
                settingsTab.classList.remove("border-b-4", "-mb-1", "border-blue-700", "text-blue-700");
            } else {
                // Settings tab
                assistantTab.setAttribute('aria-selected', 'false');
                settingsTab.setAttribute('aria-selected', 'true');
                assistantContent.classList.add('hidden');
                settingsContent.classList.remove('hidden');
                assistantTab.classList.remove('text-blue-700');
                settingsTab.classList.add("text-blue-700", "border-b-4", "-mb-1", "border-blue-700");
                assistantTab.classList.remove("border-b-4", "-mb-1", "border-blue-700", "text-blue-700");
            }
            
            // Save the tab state to a cookie
            setCookie("activeTabIndex", tabIndex, 7); // Save for 7 days
        };

        // Check if we have a saved tab preference
        const savedTabIndex = getCookie("activeTabIndex");
        
        // Apply the saved tab or default to the first tab
        if (savedTabIndex !== null && savedTabIndex !== undefined && savedTabIndex !== "") {
            // Apply the saved tab
            setActiveTab(parseInt(savedTabIndex));
        } else {
            // Default to first tab (index 0)
            setActiveTab(0);
        }
        
        // Keep existing event listeners, but use the new function
        assistantTab.addEventListener('click', () => {
            setActiveTab(0);
        });

        settingsTab.addEventListener('click', () => {
            setActiveTab(1);
        });
    }
};

/**
 * Checks if the current page should display a return button
 * Also clears originating page if we're back at the original page
 */
export const checkIfReferencePage = () => {
    // Get the originating page from localStorage
    const originatingPage = localStorage.getItem('originatingPage');
    
    // If no originating page exists, this isn't a reference context
    if (!originatingPage) {
        console.log("No originating page found");
        return false;
    }
    
    // Check if we've navigated back to the originating page by some other means
    const currentUrl = window.location.href;
    if (originatingPage === currentUrl) {
        console.log("We're back at the originating page, clearing reference data");
        // Clear the originating page data since we're back at the source
        localStorage.removeItem('originatingPage');
        setState('originatingPage', null);
        setState('isReferencePage', false);
        return false;
    }
    
    // Regular case: We're on a different page with an originating page set
    console.log("Originating page:", originatingPage);
    console.log("Current page is reference page: true");
    
    // Update state
    setState('isReferencePage', true);
    setState('originatingPage', originatingPage);
    
    return true;
};

/**
 * Initializes reference page functionality
 */
export const initializeReferencePage = () => {
    console.log("Initializing reference page functionality");
    
    // Check if we should display a return button (based on localStorage)
    const shouldShowReturnButton = checkIfReferencePage();
    
    if (shouldShowReturnButton) {
        console.log("Return button should be displayed");
        displayReturnButton();
    } else {
        console.log("No return button needed on this page");
    }
};

/**
 * Creates and displays the return button on reference pages
 */
export const displayReturnButton = () => {
    console.log("Creating return button");
    
    // Get originating page from state
    const originatingPage = getState('originatingPage');
    if (!originatingPage) {
        console.log("No originating page found in state");
        return;
    }
    
    // Check if return button already exists
    if (document.querySelector('.return-button')) {
        console.log("Return button already exists");
        return;
    }
    
    // Create return button with translated text
    const returnButton = document.createElement('button');
    
    // Get translation if available, otherwise use default text
    const translations = getState('translations') || {};
    const buttonText = translations['return-button'] || 'Regresar'; // Spanish default
    
    // Add arrow icon before text
    returnButton.innerHTML = `<i class="fas fa-arrow-left mr-1"></i> ${buttonText}`;
    
    // Apply styles to make it appear in the top right
    returnButton.classList.add(
        'return-button',
        'fixed',
        'top-4',  // Position from top
        'right-20', // Position from right (leave space for accessibility button)
        'z-50',
        'inline-flex',
        'items-center',
        'px-3',
        'py-1.5',
        'bg-purple-600',
        'text-white',
        'text-sm',
        'rounded-lg',
        'shadow-md',
        'hover:bg-purple-700',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-purple-500',
        'focus:ring-opacity-50'
    );
    
    console.log("Return button created with fixed positioning");
    
    // Add click event to return to originating page
    returnButton.addEventListener('click', () => {
        console.log("Return button clicked, navigating to:", originatingPage);
        
        // Clear the originating page from localStorage and state
        localStorage.removeItem('originatingPage');
        setState('originatingPage', null);
        setState('isReferencePage', false);
        
        console.log("Cleared originating page data");
        
        // Cache interface elements before navigating
        cacheInterfaceElements();
        
        // Add fade-out animation
        const mainContent = document.querySelector('body > .container');
        if (mainContent) {
            mainContent.classList.add("opacity-0");
        }
        
        // Navigate back to originating page
        setTimeout(() => {
            window.location.href = originatingPage;
        }, 150);
    });
    
    // Add the button directly to the body
    document.body.appendChild(returnButton);
    console.log("Return button added with fixed positioning");
};

// // In wrapTextInSpans function, simplify the event handler
// element.querySelectorAll('[data-glossary-term="true"]').forEach(term => {
//   // Add the data-attribute but let the global handler handle the click
//   term.setAttribute('data-glossary-term', 'true');
  
//   // We can remove individual click handlers since the global one handles this now
//   // Or keep a simple handler to ensure we get proper cursor styles
//   term.addEventListener('click', (event) => {
//     // This ensures we mark glossary clicks for the audio handler
//     window._isGlossaryTermClick = true;
//   });
// });