import { state, setState } from './assets/modules/state.js';
import { ActivityTypes } from './assets/modules/utils.js';
import { initializeActivityAudioElements } from './assets/modules/audio.js';
import { prepareMultipleChoice } from './assets/modules/activities/multiple_choice.js';
import { prepareSorting } from './assets/modules/activities/sorting.js';
import { prepareMatching } from './assets/modules/activities/matching.js';
import { prepareTrueFalse } from './assets/modules/activities/true_false.js';
import { validateInputs } from './assets/modules/activities/validation.js';
import { preparefillInBlank } from './assets/modules/activities/fill_in_blank.js';
import { prepareFillInTable } from './assets/modules/activities/fill_in_table.js';
import { prepareOpenEnded } from './assets/modules/activities/open_ended.js';

export const prepareActivity = () => {
    // Initialize audio at the start of activity preparation
    initializeActivityAudioElements();
    // Select all sections with role="activity"
    const activitySections = document.querySelectorAll('section[role="activity"]');
    const submitButton = document.getElementById("submit-button");

    if (activitySections.length === 0) {
        if (submitButton) {
            submitButton.style.display = "none";
        }
        return;
    }

    if (!submitButton) {
        console.warn("Submit button not found");
        return;
    }

    if (activitySections.length === 0) {
        submitButton.style.display = "none";
        return;
    }

    activitySections.forEach((section) => {
        const activityType = section.dataset.sectionType;
        setupActivitySection(section, activityType, submitButton);
    });
};

const setupActivitySection = (section, activityType, submitButton) => {
    switch (activityType) {
        case ActivityTypes.MULTIPLE_CHOICE:
            prepareMultipleChoice(section);
            setState('validateHandler', () => validateInputs(ActivityTypes.MULTIPLE_CHOICE));
            break;
            
        case ActivityTypes.FILL_IN_THE_BLANK:
            preparefillInBlank(section);
            setState('validateHandler', () => validateInputs(ActivityTypes.FILL_IN_THE_BLANK));
            break;
            
        case ActivityTypes.OPEN_ENDED_ANSWER:
            prepareOpenEnded(section);
            setState('validateHandler', () => validateInputs(ActivityTypes.OPEN_ENDED_ANSWER));
            break;
            
        case ActivityTypes.SORTING:
            prepareSorting(section);
            setState('validateHandler', () => validateInputs(ActivityTypes.SORTING));
            break;
            
        case ActivityTypes.MATCHING:
            prepareMatching(section);
            setState('validateHandler', () => validateInputs(ActivityTypes.MATCHING));
            break;
            
        case ActivityTypes.TRUE_FALSE:
            prepareTrueFalse(section);
            setState('validateHandler', () => validateInputs(ActivityTypes.TRUE_FALSE));
            break;
            
        case ActivityTypes.FILL_IN_A_TABLE:
            prepareFillInTable(section);
            setState('validateHandler', () => validateInputs(ActivityTypes.FILL_IN_A_TABLE));
            break;
            
        default:
            console.error("Unknown activity type:", activityType);
    }

    if (state.validateHandler) {
        submitButton.removeEventListener("click", state.validateHandler);
        submitButton.addEventListener("click", state.validateHandler);
    }
};

// Initialize on load
prepareActivity();